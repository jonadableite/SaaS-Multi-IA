import { igniter } from '@/igniter'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { AgentProcedure } from '../procedures/agent.procedure'
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentQuerySchema,
} from '../agent.interface'
import { z } from 'zod'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { createSecurityProcedure } from '@/middleware/security'

/**
 * @controller AgentController
 * @description Controller for AI agent management
 */
export const AgentController = igniter.controller({
  name: 'Agent',
  path: '/agents',
  description: 'Manage AI agents',
  actions: {
    list: igniter.query({
      name: 'List',
      description: 'List all agents',
      path: '/',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        AgentProcedure(),
      ],
      query: AgentQuerySchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const agents = await context.agent.agent.findMany(session.user.id, {
          isPublic: request.query.isPublic,
          category: request.query.category,
          tags: request.query.tags,
          search: request.query.search,
        })

        return response.success(agents)
      },
    }),

    retrieve: igniter.query({
      name: 'Retrieve',
      description: 'Get an agent by ID',
      path: '/:id' as const,
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        AgentProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        const agent = await context.agent.agent.findUnique(id, session.user.id)

        if (!agent) {
          return response.notFound('Agent not found')
        }

        return response.success(agent)
      },
    }),

    create: igniter.mutation({
      name: 'Create',
      description: 'Create a new agent',
      path: '/',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        AgentProcedure(),
      ],
      body: CreateAgentSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const agent = await context.agent.agent.create(
          session.user.id,
          request.body,
        )

        return response.created(agent)
      },
    }),

    update: igniter.mutation({
      name: 'Update',
      description: 'Update an agent',
      path: '/:id' as const,
      method: 'PATCH',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        AgentProcedure(),
      ],
      body: UpdateAgentSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        const agent = await context.agent.agent.update(
          id,
          session.user.id,
          request.body,
        )

        return response.success(agent)
      },
    }),

    delete: igniter.mutation({
      name: 'Delete',
      description: 'Delete an agent',
      path: '/:id' as const,
      method: 'DELETE',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        AgentProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        await context.agent.agent.delete(id, session.user.id)

        return response.noContent()
      },
    }),

    execute: igniter.mutation({
      name: 'Execute',
      description: 'Execute an agent with user input',
      path: '/:id/execute' as const,
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true, sanitizeQuery: true }),
        AgentProcedure(),
      ],
      body: z.object({
        input: z.string().min(1, 'Input is required'),
      }),
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const { id } = request.params
        const { input } = request.body

        // Import AgentEngine dynamically to avoid circular dependencies
        const { AgentEngine } = await import('../services/agent-engine.service')

        const engine = new AgentEngine()
        const result = await engine.executeAgent(id, input, session.user.id)

        return response.success(result)
      },
    }),
  },
})

