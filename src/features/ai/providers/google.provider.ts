import type {
  AIProvider,
  AIProviderConfig,
  ChatOptions,
  ChatResponse,
} from './ai-provider.interface'
import { AppError, AppErrorCode } from '@/utils/app-error'

/**
 * @class GoogleProvider
 * @implements {AIProvider}
 * @description Google (Gemini) provider implementation
 */
export class GoogleProvider implements AIProvider {
  private config: AIProviderConfig
  private baseURL: string

  constructor(config: AIProviderConfig) {
    this.config = config
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    try {
      const modelName = options.model.replace('models/', '')
      const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.config.apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: options.messages.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 30000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new AppError(
          {
            code: AppErrorCode.AI_PROVIDER_ERROR,
            message: error.error?.message || `Google API error: ${response.statusText}`,
            context: { status: response.status, error },
          },
          response.status,
        )
      }

      const data = await response.json()
      const candidate = data.candidates[0]
      const content = candidate.content.parts[0].text

      // Estimate tokens (Google doesn't always provide usage in response)
      const tokensIn = Math.ceil(
        options.messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4,
      )
      const tokensOut = Math.ceil(content.length / 4)

      return {
        content,
        tokensIn,
        tokensOut,
        model: options.model,
        raw: data,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(
          {
            code: AppErrorCode.AI_PROVIDER_TIMEOUT,
            message: 'AI provider request timeout',
          },
          504,
        )
      }

      throw new AppError(
        {
          code: AppErrorCode.AI_PROVIDER_ERROR,
          message: `Google provider error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        502,
      )
    }
  }

  getProviderName(): string {
    return 'google'
  }

  getAvailableModels(): string[] {
    return [
      'models/gemini-2.0-flash-exp',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash',
      'models/gemini-pro',
    ]
  }
}

