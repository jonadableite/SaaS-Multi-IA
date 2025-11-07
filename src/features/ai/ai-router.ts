import type { AIProvider, AIProviderConfig, ChatOptions, ChatResponse } from './providers/ai-provider.interface'
import { OpenAIProvider } from './providers/openai.provider'
import { AnthropicProvider } from './providers/anthropic.provider'
import { GoogleProvider } from './providers/google.provider'
import { AppError, AppErrorCode } from '@/utils/app-error'

/**
 * @type ProviderName
 * @description Supported AI provider names
 */
export type ProviderName = 'openai' | 'anthropic' | 'google'

/**
 * @interface ProviderConfigMap
 * @description Map of provider configurations
 */
export interface ProviderConfigMap {
  openai?: AIProviderConfig
  anthropic?: AIProviderConfig
  google?: AIProviderConfig
}

/**
 * @class AIRouter
 * @description Routes AI requests to appropriate providers
 *
 * This class provides a unified interface for interacting with multiple AI providers,
 * abstracting away provider-specific implementations and providing consistent error handling.
 */
export class AIRouter {
  private providers: Map<ProviderName, AIProvider> = new Map()

  /**
   * @constructor
   * @param configs Map of provider configurations
   */
  constructor(configs: ProviderConfigMap) {
    if (configs.openai) {
      this.providers.set('openai', new OpenAIProvider(configs.openai))
    }

    if (configs.anthropic) {
      this.providers.set('anthropic', new AnthropicProvider(configs.anthropic))
    }

    if (configs.google) {
      this.providers.set('google', new GoogleProvider(configs.google))
    }
  }

  /**
   * @method chat
   * @description Route chat request to appropriate provider
   */
  async chat(
    provider: ProviderName,
    options: ChatOptions,
  ): Promise<ChatResponse> {
    const providerInstance = this.providers.get(provider)

    if (!providerInstance) {
      throw new AppError(
        {
          code: AppErrorCode.AI_PROVIDER_UNAVAILABLE,
          message: `Provider ${provider} is not configured or unavailable`,
        },
        503,
      )
    }

    return providerInstance.chat(options)
  }

  /**
   * @method getAvailableProviders
   * @description Get list of available providers
   */
  getAvailableProviders(): ProviderName[] {
    return Array.from(this.providers.keys())
  }

  /**
   * @method getProvider
   * @description Get provider instance by name
   */
  getProvider(provider: ProviderName): AIProvider | undefined {
    return this.providers.get(provider)
  }

  /**
   * @method getAvailableModels
   * @description Get available models for a provider
   */
  getAvailableModels(provider: ProviderName): string[] {
    const providerInstance = this.providers.get(provider)
    return providerInstance?.getAvailableModels() || []
  }

  /**
   * @static createFromEnv
   * @description Create AIRouter from environment variables
   */
  static createFromEnv(): AIRouter {
    const configs: ProviderConfigMap = {}

    if (process.env.OPENAI_API_KEY) {
      configs.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      configs.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL,
        timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '3', 10),
      }
    }

    if (process.env.GOOGLE_API_KEY) {
      configs.google = {
        apiKey: process.env.GOOGLE_API_KEY,
        baseURL: process.env.GOOGLE_BASE_URL,
        timeout: parseInt(process.env.GOOGLE_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.GOOGLE_MAX_RETRIES || '3', 10),
      }
    }

    return new AIRouter(configs)
  }
}

