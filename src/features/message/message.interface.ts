import { z } from 'zod'
import type { Conversation } from '../conversation/conversation.interface'

/**
 * @enum MessageRole
 * @description Role of the message sender
 */
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

/**
 * @interface Message
 * @description Represents a message in a conversation
 */
export interface Message {
  id: string
  conversationId: string
  conversation?: Conversation
  role: MessageRole
  content: string
  model: string | null
  provider: string | null
  tokens: number | null
  cost: number | null
  attachments: unknown | null
  metadata: unknown | null
  createdAt: Date
}

/**
 * @schema CreateMessageSchema
 * @description Zod schema for creating a new message
 */
export const CreateMessageSchema = z.object({
  conversationId: z.string().cuid(),
  role: z.nativeEnum(MessageRole),
  content: z.string().min(1, 'Content cannot be empty'),
  model: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  attachments: z.unknown().optional().nullable(),
  metadata: z.unknown().optional().nullable(),
})

export type CreateMessageBody = z.infer<typeof CreateMessageSchema>

/**
 * @schema ChatMessageSchema
 * @description Zod schema for chat message (user input)
 */
export const ChatMessageSchema = z
  .object({
    conversationId: z.string().optional(),
    content: z.string().min(1, 'Message content cannot be empty'),
    model: z.string().optional(),
    provider: z.string().optional(),
    temperature: z.coerce.number().min(0).max(2).optional(),
    maxTokens: z.coerce.number().int().positive().optional(),
    stream: z.coerce.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // If conversationId is provided, it must be a valid CUID
      if (data.conversationId && data.conversationId !== '') {
        return z.string().cuid().safeParse(data.conversationId).success
      }
      return true
    },
    {
      message: 'conversationId must be a valid CUID',
      path: ['conversationId'],
    },
  )
  .transform((data) => ({
    ...data,
    conversationId:
      data.conversationId && data.conversationId !== ''
        ? data.conversationId
        : undefined,
  }))

export type ChatMessageBody = z.infer<typeof ChatMessageSchema>

/**
 * @schema ChatResponseSchema
 * @description Zod schema for chat response
 */
export const ChatResponseSchema = z.object({
  content: z.string(),
  model: z.string(),
  provider: z.string(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  conversationId: z.string().cuid(),
  messageId: z.string().cuid(),
  raw: z.unknown().optional(),
})

export type ChatResponse = z.infer<typeof ChatResponseSchema>

