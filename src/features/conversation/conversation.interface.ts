import { z } from 'zod'
import type { Message, MessageRole } from '../message/message.interface'
import type { User } from '@/@saas-boilerplate/features/user/user.interface'

/**
 * @interface Conversation
 * @description Represents a conversation entity in the Multi-IA system
 */
export interface Conversation {
  id: string
  title: string | null
  userId: string
  user?: User
  messages?: Message[]
  category?: string | null
  tags?: string[]
  starred?: boolean
  archived?: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * @schema CreateConversationSchema
 * @description Zod schema for creating a new conversation
 */
export const CreateConversationSchema = z.object({
  title: z.string().min(1, 'Title must be at least 1 character').max(255).nullable().optional(),
})

export type CreateConversationBody = z.infer<typeof CreateConversationSchema>

/**
 * @schema UpdateConversationSchema
 * @description Zod schema for updating a conversation
 */
export const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(255).nullable().optional(),
  category: z.string().min(1).max(255).nullable().optional(),
  tags: z.array(z.string()).optional(),
  starred: z.boolean().optional(),
  archived: z.boolean().optional(),
})

export type UpdateConversationBody = z.infer<typeof UpdateConversationSchema>

/**
 * @schema ConversationQuerySchema
 * @description Zod schema for querying conversations
 */
export const ConversationQuerySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  category: z.string().optional(),
  starred: z.boolean().optional(),
  archived: z.boolean().optional(),
  dateRange: z.enum(['today', 'week', 'month', 'all']).optional().default('all'),
})

export type ConversationQueryParams = z.infer<typeof ConversationQuerySchema>

