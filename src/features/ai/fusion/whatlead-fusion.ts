/**
 * @class WhatLeadAIFusion
 * @description Main orchestrator for intelligent AI model routing
 */
import { IntentClassifier, IntentType } from './intent-classifier'
import { ModelRouter, type UserPreferences } from './model-router'
import { AIRouter } from '../ai-router'
import type { ChatOptions, ChatResponse } from '../providers/ai-provider.interface'

/**
 * @interface FusionConfig
 * @description Configuration for WhatLead AI Fusion
 */
export interface FusionConfig {
  aiRouter: AIRouter
  userPreferences?: UserPreferences
}

/**
 * @interface ProcessResult
 * @description Result of processing a query through Fusion
 */
export interface ProcessResult {
  answer: string
  modelUsed: string
  provider: string
  intent: IntentType
  confidence: number
  processingTimeMs: number
  tokensIn: number
  tokensOut: number
}

export class WhatLeadAIFusion {
  private intentClassifier: IntentClassifier
  private modelRouter: ModelRouter
  private config: FusionConfig

  constructor(config: FusionConfig) {
    this.config = config

    // Get OpenAI API key from router for intent classification
    const openaiProvider = config.aiRouter.getProvider('openai')
    if (!openaiProvider) {
      throw new Error('OpenAI provider is required for intent classification')
    }

    // We need the API key, but AIRouter doesn't expose it
    // So we'll use environment variable directly
    const openaiApiKey = process.env.OPENAI_API_KEY
    const openaiBaseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.intentClassifier = new IntentClassifier(openaiApiKey, openaiBaseURL)
    this.modelRouter = new ModelRouter(config.aiRouter)
  }

  /**
   * @method process
   * @description Process a user query through intelligent routing
   */
  async process(query: string, options?: Partial<ChatOptions>): Promise<ProcessResult> {
    const startTime = Date.now()

    // 1. Classify user intent
    const { intent, confidence, subCategory } = await this.intentClassifier.classifyIntent(query)

    // 2. Extract keywords for better context
    const keywords = await this.intentClassifier.extractKeywords(query)

    // 3. Select best model for this intent
    const { model: selectedModel, provider: selectedProvider } =
      this.modelRouter.selectBestModel(intent, query, this.config.userPreferences)

    // 4. Build system prompt specific to the selected model
    const systemPrompt = this.buildSystemPrompt(intent, subCategory, keywords)

    // 5. Process query with selected model
    const response = await this.modelRouter.processWithModel(
      selectedModel,
      selectedProvider,
      query,
      systemPrompt,
      options,
    )

    const processingTimeMs = Date.now() - startTime

    return {
      answer: response.content,
      modelUsed: selectedModel,
      provider: selectedProvider,
      intent,
      confidence,
      processingTimeMs,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
    }
  }

  /**
   * @method buildSystemPrompt
   * @description Build a system prompt tailored to the intent
   */
  private buildSystemPrompt(
    intent: IntentType,
    subCategory?: string,
    keywords?: string[],
  ): string {
    let prompt = `Você é um assistente especializado em ${this.getIntentDescription(intent)}`

    if (subCategory) {
      prompt += `, com foco específico em ${subCategory}`
    }

    prompt += `. Responda de forma ${this.getExpertiseLevel()}.`

    // Add context based on keywords
    if (keywords && keywords.length > 0) {
      prompt += ` Considere estes conceitos importantes: ${keywords.join(', ')}.`
    }

    // Intent-specific instructions
    switch (intent) {
      case 'creative_writing':
        prompt += ` Seja criativo, original e cativante. Adapte o tom e estilo conforme apropriado para o gênero ou formato solicitado.`
        break
      case 'code_development':
        prompt += ` Forneça código limpo, bem comentado e seguindo as melhores práticas. Explique a lógica por trás das soluções e considere eficiência e manutenibilidade.`
        break
      case 'data_analysis':
        prompt += ` Seja metódico e preciso. Explique seu raciocínio passo a passo e destaque insights importantes dos dados.`
        break
      case 'research':
        prompt += ` Forneça informações precisas, atualizadas e bem fundamentadas. Cite fontes quando relevante e considere diferentes perspectivas.`
        break
      case 'image_generation':
        prompt += ` Crie descrições detalhadas que capturem os elementos visuais, estilo, composição e atmosfera desejados.`
        break
      case 'summarization':
        prompt += ` Seja conciso e objetivo. Destaque os pontos principais e mantenha a essência do conteúdo original.`
        break
      case 'translation':
        prompt += ` Traduza com precisão, mantendo o tom, contexto e nuances culturais quando apropriado.`
        break
    }

    return prompt
  }

  /**
   * @method getIntentDescription
   * @description Get human-readable description of intent
   */
  private getIntentDescription(intent: IntentType): string {
    const descriptions: Record<IntentType, string> = {
      creative_writing: 'escrita criativa e geração de conteúdo',
      code_development: 'desenvolvimento de software e programação',
      data_analysis: 'análise de dados e estatísticas',
      research: 'pesquisa e coleta de informações',
      image_generation: 'descrição e geração de imagens',
      conversation: 'conversação natural e assistência geral',
      summarization: 'resumo e síntese de informações',
      translation: 'tradução e adaptação de idiomas',
      specialized_knowledge: 'conhecimento especializado e consultoria',
    }

    return descriptions[intent] || 'assistência geral'
  }

  /**
   * @method getExpertiseLevel
   * @description Get expertise level description
   */
  private getExpertiseLevel(): string {
    switch (this.config.userPreferences?.expertiseLevel) {
      case 'beginner':
        return 'clara, didática e acessível, explicando conceitos básicos'
      case 'intermediate':
        return 'equilibrada, com profundidade moderada e algumas referências técnicas'
      case 'expert':
        return 'técnica, detalhada e avançada, assumindo conhecimento prévio do assunto'
      default:
        return 'clara e informativa, adaptando-se ao contexto da pergunta'
    }
  }
}

