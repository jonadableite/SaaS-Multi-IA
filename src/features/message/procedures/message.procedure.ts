import { igniter } from '@/igniter'
import type { Message, CreateMessageBody } from '../message.interface'

/**
 * @procedure MessageProcedure
 * @description Procedure for managing message operations
 */
export const MessageProcedure = igniter.procedure({
  name: 'MessageProcedure',
  handler: (_, { context }) => {
    // Ensure database is available (check for both null and undefined)
    const database = context?.services?.database
    if (!database || database === null || !(database as any).message) {
      // Return a no-op procedure for client-side or when database is unavailable
      // Maintain consistent structure: message.message.*
      return {
        message: {
          message: {
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
          },
        },
      }
    }

    return {
      message: {
        message: {
          findMany: async (conversationId: string): Promise<Message[]> => {
            return database.message.findMany({
              where: { conversationId },
              orderBy: { createdAt: 'asc' },
            })
          },

          findUnique: async (id: string): Promise<Message | null> => {
            return database.message.findUnique({
              where: { id },
            })
          },

          create: async (data: CreateMessageBody): Promise<Message> => {
            const msg = await database.message.create({
              data: {
                conversationId: data.conversationId,
                role: data.role,
                content: data.content,
                model: data.model ?? null,
                provider: data.provider ?? null,
                attachments: data.attachments ?? null,
                metadata: data.metadata ?? null,
              },
            })

            // Touch conversation to bump updatedAt for list ordering
            try {
              await database.conversation.update({
                where: { id: data.conversationId },
                data: { updatedAt: new Date() },
              })
            } catch (e) {
              // Best-effort; ignore if conversation update fails
            }

            return msg
          },

          update: async (
            id: string,
            data: Partial<CreateMessageBody>,
          ): Promise<Message> => {
            return database.message.update({
              where: { id },
              data,
            })
          },
        },
      },
    }
  },
})

