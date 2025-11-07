import { igniter } from '@/igniter'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { ConversationProcedure } from '../procedures/conversation.procedure'
import {
  CreateConversationSchema,
  UpdateConversationSchema,
  ConversationQuerySchema,
} from '../conversation.interface'
import { AppError } from '@/utils/app-error'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { createSecurityProcedure } from '@/middleware/security'

/**
 * @controller ConversationController
 * @description Controller for conversation management
 */
export const ConversationController = igniter.controller({
  name: 'Conversation',
  path: '/conversations',
  description: 'Manage conversations',
  actions: {
    list: igniter.query({
      name: 'List',
      description: 'List all conversations',
      path: '/',
      stream: true, // Enable realtime updates
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        ConversationProcedure(),
      ],
      query: ConversationQuerySchema.default({}),
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const conversations = await context.conversation.conversation.findMany(
          session.user.id,
          request.query,
        )

        return response.success(conversations)
      },
    }),

    retrieve: igniter.query({
      name: 'Retrieve',
      description: 'Get a conversation by ID',
      path: '/:id' as const,
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        ConversationProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        const conversation = await context.conversation.conversation.findUnique(
          id,
          session.user.id,
        )

        if (!conversation) {
          return response.notFound('Conversation not found')
        }

        return response.success(conversation)
      },
    }),

    create: igniter.mutation({
      name: 'Create',
      description: 'Create a new conversation',
      path: '/',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        ConversationProcedure(),
      ],
      body: CreateConversationSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const conversation = await context.conversation.conversation.create(
          session.user.id,
          request.body,
        )

        // Revalidate conversations list to update sidebar
        return response.revalidate(['conversation.list']).created(conversation)
      },
    }),

    update: igniter.mutation({
      name: 'Update',
      description: 'Update a conversation',
      path: '/:id' as const,
      method: 'PATCH',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        ConversationProcedure(),
      ],
      body: UpdateConversationSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        const conversation = await context.conversation.conversation.update(
          id,
          session.user.id,
          request.body,
        )

        return response.success(conversation)
      },
    }),

    delete: igniter.mutation({
      name: 'Delete',
      description: 'Delete a conversation',
      path: '/:id' as const,
      method: 'DELETE',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        ConversationProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        await context.conversation.conversation.delete(id, session.user.id)

        // Revalidate conversations list to update sidebar
        return response.revalidate(['conversation.list']).noContent()
      },
    }),
  },
})

