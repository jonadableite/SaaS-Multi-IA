import { z } from 'zod'
import type { User } from '@/@saas-boilerplate/features/user/user.interface'

/**
 * @interface Agent
 * @description Represents an AI agent configuration
 */
export interface Agent {
  id: string
  name: string
  description: string
  userId: string
  user?: User
  prompt: string
  model: string
  provider: string | null
  temperature: number
  maxTokens: number
  knowledge: unknown | null
  tools: unknown | null
  isPublic: boolean
  isPublished: boolean
  category: string | null
  tags: string[]
  usageCount: number
  rating: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * @schema CreateAgentSchema
 * @description Zod schema for creating a new agent
 */
export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(1000),
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().min(1, 'Model is required'),
  provider: z.string().optional().nullable(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(32000).default(2000),
  knowledge: z.unknown().optional().nullable(),
  tools: z.unknown().optional().nullable(),
  isPublic: z.boolean().default(false),
  category: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(30)).default([]),
})

export type CreateAgentBody = z.infer<typeof CreateAgentSchema>

/**
 * @schema UpdateAgentSchema
 * @description Zod schema for updating an agent
 */
export const UpdateAgentSchema = CreateAgentSchema.partial()

export type UpdateAgentBody = z.infer<typeof UpdateAgentSchema>

/**
 * @schema AgentQuerySchema
 * @description Zod schema for querying agents
 */
export const AgentQuerySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'usageCount', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

export type AgentQueryParams = z.infer<typeof AgentQuerySchema>

