/**
 * @class ModelRouter
 * @description Routes queries to the most appropriate AI model based on intent
 */
import { IntentType } from './intent-classifier'
import { AIRouter, type ProviderName } from '../ai-router'
import type { ChatOptions, ChatResponse } from '../providers/ai-provider.interface'

/**
 * @interface AIModel
 * @description Definition of available AI models
 */
interface AIModel {
  id: string
  provider: ProviderName
  capabilities: string[]
  strengths: string[]
  contextSize: number
  costPerToken: number
}

/**
 * @interface UserPreferences
 * @description User preferences for model selection
 */
export interface UserPreferences {
  preferredProvider?: ProviderName
  costSensitive?: boolean
  expertiseLevel?: 'beginner' | 'intermediate' | 'expert'
}

/**
 * Mapping of intents to recommended models
 */
const INTENT_MODEL_MAPPING: Record<IntentType, string[]> = {
  creative_writing: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
  code_development: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
  data_analysis: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
  research: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
  image_generation: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
  conversation: ['gpt-4-turbo', 'claude-3-haiku', 'gemini-1.5-pro'],
  summarization: ['gpt-4-turbo', 'claude-3-haiku', 'gemini-1.5-pro'],
  translation: ['gpt-4-turbo', 'gemini-1.5-pro', 'claude-3-opus'],
  specialized_knowledge: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
}

/**
 * Model catalog with metadata
 */
const MODEL_CATALOG: Record<string, AIModel> = {
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    provider: 'openai',
    capabilities: ['text', 'code', 'reasoning', 'knowledge'],
    strengths: ['raciocínio', 'atualização', 'precisão'],
    contextSize: 128000,
    costPerToken: 0.00001,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    capabilities: ['text', 'code', 'conversation'],
    strengths: ['velocidade', 'custo-benefício'],
    contextSize: 16000,
    costPerToken: 0.000001,
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    provider: 'anthropic',
    capabilities: ['text', 'code', 'reasoning', 'knowledge'],
    strengths: ['nuance', 'compreensão', 'segurança'],
    contextSize: 200000,
    costPerToken: 0.00001,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    provider: 'anthropic',
    capabilities: ['text', 'conversation'],
    strengths: ['velocidade', 'eficiência'],
    contextSize: 200000,
    costPerToken: 0.000002,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'google',
    capabilities: ['text', 'code', 'reasoning'],
    strengths: ['multimodalidade', 'conhecimento'],
    contextSize: 32000,
    costPerToken: 0.000005,
  },
}

export class ModelRouter {
  private aiRouter: AIRouter

  constructor(aiRouter: AIRouter) {
    this.aiRouter = aiRouter
  }

  /**
   * @method selectBestModel
   * @description Select the best model for the given intent
   */
  selectBestModel(
    intent: IntentType,
    query: string,
    userPreferences?: UserPreferences,
  ): { model: string; provider: ProviderName } {
    // Get recommended models for this intent
    const recommendedModels = INTENT_MODEL_MAPPING[intent] || ['gpt-4-turbo']

    // Filter models that are actually available
    const availableModels = recommendedModels.filter((modelId) => {
      const model = MODEL_CATALOG[modelId]
      if (!model) return false

      // Check if provider is available
      const availableProviders = this.aiRouter.getAvailableProviders()
      return availableProviders.includes(model.provider)
    })

    if (availableModels.length === 0) {
      // Fallback to first available model from any provider
      const providers = this.aiRouter.getAvailableProviders()
      if (providers.length > 0) {
        const fallbackModels = this.aiRouter.getAvailableModels(providers[0])
        if (fallbackModels.length > 0) {
          return {
            model: fallbackModels[0],
            provider: providers[0],
          }
        }
      }
      throw new Error('No available models found')
    }

    // Apply user preferences
    if (userPreferences?.preferredProvider) {
      const preferredModel = availableModels.find(
        (modelId) => MODEL_CATALOG[modelId]?.provider === userPreferences.preferredProvider,
      )
      if (preferredModel) {
        return {
          model: preferredModel,
          provider: MODEL_CATALOG[preferredModel].provider,
        }
      }
    }

    // Cost-sensitive users
    if (userPreferences?.costSensitive) {
      const sortedByCost = [...availableModels].sort(
        (a, b) =>
          (MODEL_CATALOG[a]?.costPerToken || 0) - (MODEL_CATALOG[b]?.costPerToken || 0),
      )
      const selected = sortedByCost[0]
      return {
        model: selected,
        provider: MODEL_CATALOG[selected].provider,
      }
    }

    // Default: return first recommended model
    const selected = availableModels[0]
    return {
      model: selected,
      provider: MODEL_CATALOG[selected].provider,
    }
  }

  /**
   * @method processWithModel
   * @description Process query with selected model
   */
  async processWithModel(
    modelId: string,
    provider: ProviderName,
    query: string,
    systemPrompt?: string,
    options?: Partial<ChatOptions>,
  ): Promise<ChatResponse> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Add conversation history if provided
    if (options?.messages) {
      messages.push(...options.messages)
    }

    // Add user query
    messages.push({ role: 'user', content: query })

    return this.aiRouter.chat(provider, {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens,
      stream: options?.stream ?? false,
    })
  }
}

