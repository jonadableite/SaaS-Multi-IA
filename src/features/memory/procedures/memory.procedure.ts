import { igniter } from '@/igniter'
import type { Memory, CreateMemoryBody, UpdateMemoryBody } from '../memory.interface'

/**
 * @procedure MemoryProcedure
 * @description Procedure for managing memory operations
 */
export const MemoryProcedure = igniter.procedure({
  name: 'MemoryProcedure',
  handler: (_, { context }) => {
    return {
      memory: {
        findMany: async (
          userId: string,
          filters?: {
            category?: string
            search?: string
          },
        ): Promise<Memory[]> => {
          const where: {
            userId: string
            category?: string
            OR?: Array<{
              key?: { contains: string; mode: 'insensitive' }
              value?: { contains: string; mode: 'insensitive' }
            }>
          } = {
            userId,
          }

          if (filters?.category) {
            where.category = filters.category
          }

          if (filters?.search) {
            where.OR = [
              { key: { contains: filters.search, mode: 'insensitive' } },
              { value: { contains: filters.search, mode: 'insensitive' } },
            ]
          }

          return context.services.database.memory.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
          })
        },

        findUnique: async (
          userId: string,
          key: string,
        ): Promise<Memory | null> => {
          return context.services.database.memory.findUnique({
            where: {
              userId_key: {
                userId,
                key,
              },
            },
          })
        },

        create: async (
          userId: string,
          data: CreateMemoryBody,
        ): Promise<Memory> => {
          return context.services.database.memory.create({
            data: {
              userId,
              key: data.key,
              value: data.value,
              category: data.category ?? null,
            },
          })
        },

        update: async (
          userId: string,
          key: string,
          data: UpdateMemoryBody,
        ): Promise<Memory> => {
          return context.services.database.memory.update({
            where: {
              userId_key: {
                userId,
                key,
              },
            },
            data: {
              ...data,
              updatedAt: new Date(),
            },
          })
        },

        delete: async (userId: string, key: string): Promise<Memory> => {
          return context.services.database.memory.delete({
            where: {
              userId_key: {
                userId,
                key,
              },
            },
          })
        },
      },
    }
  },
})

