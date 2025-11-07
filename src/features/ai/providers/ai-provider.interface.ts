/**
 * @interface AIProviderConfig
 * @description Configuration for AI provider
 */
export interface AIProviderConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
}

/**
 * @interface ChatMessage
 * @description Message structure for AI chat
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * @interface ChatOptions
 * @description Options for chat completion
 */
export interface ChatOptions {
  model: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  messages: ChatMessage[]
}

/**
 * @interface ChatResponse
 * @description Response from AI provider
 */
export interface ChatResponse {
  content: string
  tokensIn: number
  tokensOut: number
  model: string
  raw: unknown
}

/**
 * @interface AIProvider
 * @description Interface for AI providers (OpenAI, Anthropic, Google, etc.)
 */
export interface AIProvider {
  /**
   * @method chat
   * @description Send a chat completion request to the AI provider
   */
  chat(options: ChatOptions): Promise<ChatResponse>

  /**
   * @method getProviderName
   * @description Get the name of the provider
   */
  getProviderName(): string

  /**
   * @method getAvailableModels
   * @description Get list of available models for this provider
   */
  getAvailableModels(): string[]
}

