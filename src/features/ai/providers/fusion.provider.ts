/**
 * @provider FusionProvider
 * @description WhatLead AI Fusion - Intelligent model router provider
 */
import type { AIProvider, AIProviderConfig, ChatOptions, ChatResponse } from './ai-provider.interface'
import { WhatLeadAIFusion } from '../fusion/whatlead-fusion'
import { AIRouter } from '../ai-router'

export class FusionProvider implements AIProvider {
  private config: AIProviderConfig
  private fusion: WhatLeadAIFusion
  private aiRouter: AIRouter

  constructor(config: AIProviderConfig, aiRouter: AIRouter) {
    this.config = config
    this.aiRouter = aiRouter
    this.fusion = new WhatLeadAIFusion({
      aiRouter,
    })
  }

  /**
   * @method chat
   * @description Process chat request through intelligent routing
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    // Extract user message from conversation history
    const userMessages = options.messages.filter((m) => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]

    if (!lastUserMessage) {
      throw new Error('No user message found in chat options')
    }

    // Process through Fusion
    const result = await this.fusion.process(lastUserMessage.content, {
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: options.stream,
    })

    return {
      content: result.answer,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      model: `whatlead-fusion:${result.modelUsed}`,
      raw: {
        intent: result.intent,
        confidence: result.confidence,
        provider: result.provider,
        processingTimeMs: result.processingTimeMs,
      },
    }
  }

  /**
   * @method getProviderName
   * @description Get provider name
   */
  getProviderName(): string {
    return 'whatlead-fusion'
  }

  /**
   * @method getAvailableModels
   * @description Get available models (Fusion is a single intelligent model)
   */
  getAvailableModels(): string[] {
    return ['whatlead-fusion']
  }
}

