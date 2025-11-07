import type {
  AIProvider,
  AIProviderConfig,
  ChatOptions,
  ChatResponse,
} from './ai-provider.interface'
import { AppError, AppErrorCode } from '@/utils/app-error'

/**
 * @class AnthropicProvider
 * @implements {AIProvider}
 * @description Anthropic (Claude) provider implementation
 */
export class AnthropicProvider implements AIProvider {
  private config: AIProviderConfig
  private baseURL: string

  constructor(config: AIProviderConfig) {
    this.config = config
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1'
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages.map((msg) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 30000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new AppError(
          {
            code: AppErrorCode.AI_PROVIDER_ERROR,
            message: error.error?.message || `Anthropic API error: ${response.statusText}`,
            context: { status: response.status, error },
          },
          response.status,
        )
      }

      const data = await response.json()
      const contentBlock = data.content[0]

      return {
        content: contentBlock.text,
        tokensIn: data.usage.input_tokens,
        tokensOut: data.usage.output_tokens,
        model: data.model,
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
          message: `Anthropic provider error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        502,
      )
    }
  }

  getProviderName(): string {
    return 'anthropic'
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ]
  }
}

