import { z } from 'zod'
import type { User } from '@/@saas-boilerplate/features/user/user.interface'

/**
 * @interface Memory
 * @description Represents a user memory for AI context
 */
export interface Memory {
  id: string
  userId: string
  user?: User
  key: string
  value: string
  category: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * @schema CreateMemorySchema
 * @description Zod schema for creating a new memory
 */
export const CreateMemorySchema = z.object({
  key: z.string().min(1, 'Key is required').max(255),
  value: z.string().min(1, 'Value is required'),
  category: z.string().max(50).optional().nullable(),
})

export type CreateMemoryBody = z.infer<typeof CreateMemorySchema>

/**
 * @schema UpdateMemorySchema
 * @description Zod schema for updating a memory
 */
export const UpdateMemorySchema = z.object({
  value: z.string().min(1, 'Value is required').optional(),
  category: z.string().max(50).optional().nullable(),
})

export type UpdateMemoryBody = z.infer<typeof UpdateMemorySchema>

/**
 * @schema MemoryQuerySchema
 * @description Zod schema for querying memories
 */
export const MemoryQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
})

export type MemoryQueryParams = z.infer<typeof MemoryQuerySchema>

