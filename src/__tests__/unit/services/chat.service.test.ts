import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChatService } from '@/features/chat/services/chat.service'
import { AIRouter } from '@/features/ai/ai-router'
import { UsageService } from '@/features/usage/services/usage.service'
import { CreditService } from '@/features/usage/services/credit.service'
import { AppError, AppErrorCode } from '@/utils/app-error'

// Mock dependencies
vi.mock('@/features/ai/ai-router')
vi.mock('@/features/usage/services/usage.service')
vi.mock('@/features/usage/services/credit.service')

describe('ChatService', () => {
  let chatService: ChatService
  let mockAIRouter: ReturnType<typeof vi.fn>
  let mockUsageService: ReturnType<typeof vi.fn>
  let mockCreditService: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockAIRouter = {
      chat: vi.fn(),
      getAvailableModels: vi.fn(() => ['gpt-4o']),
    }

    mockUsageService = {
      recordUsageEvent: vi.fn(),
      checkIdempotency: vi.fn(() => null),
    }

    mockCreditService = {
      checkCredits: vi.fn(() => true),
      getCredits: vi.fn(() => 1000),
    }

    vi.mocked(AIRouter.createFromEnv).mockReturnValue(mockAIRouter as unknown as AIRouter)

    chatService = new ChatService(mockAIRouter as unknown as AIRouter)
  })

  describe('chat', () => {
    it('should throw error when request is duplicate (idempotency)', async () => {
      mockUsageService.checkIdempotency.mockResolvedValue({ id: 'existing' })

      await expect(
        chatService.chat(
          'user123',
          {
            content: 'Hello',
            conversationId: 'conv123',
          },
          {
            conversation: {
              conversation: {
                create: vi.fn(),
                findUnique: vi.fn(),
              },
            },
            message: {
              message: {
                findMany: vi.fn(),
                create: vi.fn(),
              },
            },
          },
        ),
      ).rejects.toThrow(AppError)
    })

    it('should throw error when credits insufficient', async () => {
      mockUsageService.checkIdempotency.mockResolvedValue(null)
      mockCreditService.checkCredits.mockResolvedValue(false)
      mockCreditService.getCredits.mockResolvedValue(0)

      await expect(
        chatService.chat(
          'user123',
          {
            content: 'Hello',
          },
          {
            conversation: {
              conversation: {
                create: vi.fn(() => Promise.resolve({ id: 'conv123' })),
                findUnique: vi.fn(),
              },
            },
            message: {
              message: {
                findMany: vi.fn(() => Promise.resolve([])),
                create: vi.fn(),
              },
            },
          },
        ),
      ).rejects.toThrow(AppError)
    })

    it('should create conversation if not provided', async () => {
      mockUsageService.checkIdempotency.mockResolvedValue(null)
      mockCreditService.checkCredits.mockResolvedValue(true)
      mockAIRouter.chat.mockResolvedValue({
        content: 'Hello!',
        tokensIn: 10,
        tokensOut: 20,
        model: 'gpt-4o',
        raw: {},
      })

      const createConv = vi.fn(() => Promise.resolve({ id: 'new-conv' }))
      const createMessage = vi.fn(() => Promise.resolve({ id: 'msg123' }))

      await chatService.chat(
        'user123',
        {
          content: 'Hello',
        },
        {
          conversation: {
            conversation: {
              create: createConv,
              findUnique: vi.fn(),
            },
          },
          message: {
            message: {
              findMany: vi.fn(() => Promise.resolve([])),
              create: createMessage,
            },
          },
        },
      )

      expect(createConv).toHaveBeenCalled()
      expect(createMessage).toHaveBeenCalledTimes(2) // User message + AI response
    })
  })
})

