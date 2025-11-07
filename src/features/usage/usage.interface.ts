import { z } from 'zod'

/**
 * @enum UsageType
 * @description Type of AI usage
 */
export enum UsageType {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  AGENT = 'AGENT',
  EMBEDDING = 'EMBEDDING',
  TRANSCRIPTION = 'TRANSCRIPTION',
}

/**
 * @interface Usage
 * @description Represents AI usage tracking
 */
export interface Usage {
  id: string
  userId: string
  model: string
  provider: string
  type: UsageType
  tokens: number
  tokensIn: number | null
  tokensOut: number | null
  cost: number
  requestId: string | null
  conversationId: string | null
  agentId: string | null
  createdAt: Date
}

/**
 * @schema CreateUsageSchema
 * @description Zod schema for creating usage record
 */
export const CreateUsageSchema = z.object({
  model: z.string().min(1),
  provider: z.string().min(1),
  type: z.nativeEnum(UsageType),
  tokens: z.number().int().nonnegative(),
  tokensIn: z.number().int().nonnegative().optional().nullable(),
  tokensOut: z.number().int().nonnegative().optional().nullable(),
  cost: z.number().nonnegative(),
  requestId: z.string().optional().nullable(),
  conversationId: z.string().cuid().optional().nullable(),
  agentId: z.string().cuid().optional().nullable(),
})

export type CreateUsageBody = z.infer<typeof CreateUsageSchema>

/**
 * @schema UsageQuerySchema
 * @description Zod schema for querying usage
 */
export const UsageQuerySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  type: z.nativeEnum(UsageType).optional(),
  provider: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type UsageQueryParams = z.infer<typeof UsageQuerySchema>

/**
 * @interface UsageEvent
 * @description Event for usage tracking (used in billing pipeline)
 */
export interface UsageEvent {
  userId: string
  model: string
  provider: string
  type: UsageType
  tokensIn: number
  tokensOut: number
  cost: number
  requestId: string
  conversationId?: string
  agentId?: string
}

