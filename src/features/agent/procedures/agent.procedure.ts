import { igniter } from '@/igniter'
import type { Agent, CreateAgentBody, UpdateAgentBody } from '../agent.interface'

/**
 * @procedure AgentProcedure
 * @description Procedure for managing agent operations
 */
export const AgentProcedure = igniter.procedure({
  name: 'AgentProcedure',
  handler: (_, { context }) => {
    // Ensure database is available (check for both null and undefined)
    const database = context?.services?.database
    if (!database || database === null || !(database as any).agent) {
      // Return a no-op procedure for client-side or when database is unavailable
      return {
        agent: {
          agent: {
            findMany: async () => {
              if (typeof window === 'undefined') {
                throw new Error('Database service is not available in server context')
              }
              return []
            },
            findUnique: async () => {
              if (typeof window === 'undefined') {
                throw new Error('Database service is not available in server context')
              }
              return null
            },
            create: async () => {
              throw new Error('Database service is not available')
            },
            update: async () => {
              throw new Error('Database service is not available')
            },
            delete: async () => {
              throw new Error('Database service is not available')
            },
            incrementUsage: async () => {},
          },
        },
      }
    }

    return {
      agent: {
        agent: {
          findMany: async (
            userId: string,
            filters?: {
              isPublic?: boolean
              category?: string
              tags?: string[]
              search?: string
            },
          ): Promise<Agent[]> => {
            const where: {
              userId?: string
              isPublic?: boolean
              category?: string
              tags?: {
                has?: string
                hasEvery?: string[]
              }
              OR?: Array<{
                name?: { contains: string; mode: 'insensitive' }
                description?: { contains: string; mode: 'insensitive' }
              }>
            } = {}

            if (!filters?.isPublic) {
              where.userId = userId
            } else {
              where.isPublic = true
            }

            if (filters?.category) {
              where.category = filters.category
            }

            if (filters?.tags && filters.tags.length > 0) {
              where.tags = { hasEvery: filters.tags }
            }

            if (filters?.search) {
              where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
              ]
            }

            return database.agent.findMany({
              where,
              orderBy: { createdAt: 'desc' },
            })
          },

          findUnique: async (
            id: string,
            userId?: string,
          ): Promise<Agent | null> => {
            const where: { id: string; userId?: string } = { id }
            if (userId) {
              where.userId = userId
            }

            return database.agent.findUnique({
              where,
            })
          },

          create: async (
            userId: string,
            data: CreateAgentBody,
          ): Promise<Agent> => {
            return database.agent.create({
              data: {
                userId,
                name: data.name,
                description: data.description,
                prompt: data.prompt,
                model: data.model,
                provider: data.provider ?? null,
                temperature: data.temperature ?? 0.7,
                maxTokens: data.maxTokens ?? 2000,
                knowledge: data.knowledge ?? null,
                tools: data.tools ?? null,
                isPublic: data.isPublic ?? false,
                category: data.category ?? null,
                tags: data.tags ?? [],
              },
            })
          },

          update: async (
            id: string,
            userId: string,
            data: UpdateAgentBody,
          ): Promise<Agent> => {
            return database.agent.update({
              where: {
                id,
                userId,
              },
              data: {
                ...data,
                updatedAt: new Date(),
              },
            })
          },

          delete: async (id: string, userId: string): Promise<Agent> => {
            return database.agent.delete({
              where: {
                id,
                userId,
              },
            })
          },

          incrementUsage: async (id: string): Promise<void> => {
            await context.services.database.agent.update({
              where: { id },
              data: {
                usageCount: {
                  increment: 1,
                },
              },
            })
          },
        },
      },
    }
  },
})

