import { igniter } from '@/igniter'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { MemoryProcedure } from '../procedures/memory.procedure'
import {
  CreateMemorySchema,
  UpdateMemorySchema,
  MemoryQuerySchema,
} from '../memory.interface'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { createSecurityProcedure } from '@/middleware/security'

/**
 * @controller MemoryController
 * @description Controller for memory management
 */
export const MemoryController = igniter.controller({
  name: 'Memory',
  path: '/memories',
  description: 'Manage user memories',
  actions: {
    list: igniter.query({
      name: 'List',
      description: 'List all memories',
      path: '/',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
        MemoryProcedure(),
      ],
      query: MemoryQuerySchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const memories = await context.memory.memory.findMany(
          session.user.id,
          {
            category: request.query.category,
            search: request.query.search,
          },
        )

        return response.success(memories)
      },
    }),

    retrieve: igniter.query({
      name: 'Retrieve',
      description: 'Get a memory by key',
      path: '/:key' as const,
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        MemoryProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { key } = request.params
        const memory = await context.memory.memory.findUnique(
          session.user.id,
          decodeURIComponent(key),
        )

        if (!memory) {
          return response.notFound('Memory not found')
        }

        return response.success(memory)
      },
    }),

    create: igniter.mutation({
      name: 'Create',
      description: 'Create a new memory',
      path: '/',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        MemoryProcedure(),
      ],
      body: CreateMemorySchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const memory = await context.memory.memory.create(
          session.user.id,
          request.body,
        )

        return response.created(memory)
      },
    }),

    update: igniter.mutation({
      name: 'Update',
      description: 'Update a memory',
      path: '/:key' as const,
      method: 'PATCH',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        MemoryProcedure(),
      ],
      body: UpdateMemorySchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { key } = request.params
        const memory = await context.memory.memory.update(
          session.user.id,
          decodeURIComponent(key),
          request.body,
        )

        return response.success(memory)
      },
    }),

    delete: igniter.mutation({
      name: 'Delete',
      description: 'Delete a memory',
      path: '/:key' as const,
      method: 'DELETE',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        MemoryProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { key } = request.params
        await context.memory.memory.delete(session.user.id, decodeURIComponent(key))

        return response.noContent()
      },
    }),
  },
})

