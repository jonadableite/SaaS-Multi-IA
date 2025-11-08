import { igniter } from '@/igniter'
import type { Conversation, CreateConversationBody, UpdateConversationBody, ConversationQueryParams } from '../conversation.interface'

/**
 * @procedure ConversationProcedure
 * @description Procedure for managing conversation operations
 */
export const ConversationProcedure = igniter.procedure({
  name: 'ConversationProcedure',
  handler: (_, { context }) => {
    // Ensure database is available (check for both null and undefined)
    const database = context?.services?.database
    if (!database || database === null) {
      // Return a no-op procedure for client-side or when database is unavailable
      return {
        conversation: {
          conversation: {
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
          },
        },
      }
    }

    return {
      conversation: {
        conversation: {
          findMany: async (userId: string, params?: ConversationQueryParams): Promise<Conversation[]> => {
            const page = params?.page ?? 1
            const limit = params?.limit ?? 20
            const sortBy = params?.sortBy ?? 'updatedAt'
            const sortOrder = params?.sortOrder ?? 'desc'

            // Date range filter
            let createdAtFilter: any = undefined
            if (params?.dateRange && params.dateRange !== 'all') {
              const now = new Date()
              const start = new Date(now)
              if (params.dateRange === 'today') {
                start.setHours(0, 0, 0, 0)
              } else if (params.dateRange === 'week') {
                const day = start.getDay()
                const diff = start.getDate() - day + (day === 0 ? -6 : 1)
                start.setDate(diff)
                start.setHours(0, 0, 0, 0)
              } else if (params.dateRange === 'month') {
                start.setDate(1)
                start.setHours(0, 0, 0, 0)
              }
              createdAtFilter = { gte: start }
            }

            const where: any = {
              userId,
              starred: params?.starred ?? undefined,
              category: params?.category ?? undefined,
              createdAt: createdAtFilter,
            }

            // Add archived filter only if explicitly set to true (show archived)
            // By default, don't filter by archived (show all conversations)
            if (params?.archived === true) {
              where.archived = true
            } else if (params?.archived === false) {
              where.archived = false
            }

            // Search by title or message content
            if (params?.search && params.search.trim()) {
              const search = params.search.trim()
              where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
              ]
            }

            const conversations = await database.conversation.findMany({
              where,
              include: {
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 1, // Only last message for preview/performance
                },
              },
              orderBy: { [sortBy]: sortOrder },
              skip: (page - 1) * limit,
              take: limit,
            })

            return conversations
          },

          findUnique: async (
            id: string,
            userId: string,
          ): Promise<Conversation | null> => {
            return database.conversation.findUnique({
              where: {
                id,
                userId,
              },
              include: {
                messages: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            })
          },

          create: async (
            userId: string,
            data: CreateConversationBody,
          ): Promise<Conversation> => {
            return database.conversation.create({
              data: {
                userId,
                title: data.title ?? null,
              },
            })
          },

          update: async (
            id: string,
            userId: string,
            data: UpdateConversationBody,
          ): Promise<Conversation> => {
            return database.conversation.update({
              where: {
                id,
                userId,
              },
              data,
            })
          },

          delete: async (id: string, userId: string): Promise<Conversation> => {
            return database.conversation.delete({
              where: {
                id,
                userId,
              },
            })
          },
        },
      },
    }
  },
})

