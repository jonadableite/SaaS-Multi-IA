import { igniter } from '@/igniter'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { UsageQuerySchema } from '../usage.interface'
import { UsageService } from '../services/usage.service'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { createSecurityProcedure } from '@/middleware/security'

/**
 * @controller UsageController
 * @description Controller for usage tracking and statistics
 */
export const UsageController = igniter.controller({
  name: 'Usage',
  path: '/usage',
  description: 'AI usage tracking and statistics',
  actions: {
    /**
     * @action list
     * @description Get usage records for authenticated user
     */
    list: igniter.query({
      name: 'List',
      description: 'List usage records',
      path: '/',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
      ],
      query: UsageQuerySchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const usageService = new UsageService()
        const result = await usageService.getUserUsage(session.user.id, {
          type: request.query.type,
          provider: request.query.provider,
          startDate: request.query.startDate
            ? new Date(request.query.startDate)
            : undefined,
          endDate: request.query.endDate
            ? new Date(request.query.endDate)
            : undefined,
          page: request.query.page,
          limit: request.query.limit,
        })

        return response.success(result)
      },
    }),

    /**
     * @action stats
     * @description Get usage statistics for authenticated user
     */
    stats: igniter.query({
      name: 'Stats',
      description: 'Get usage statistics',
      path: '/stats',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
      ],
      handler: async ({ context, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Authentication required')
        }

        const usageService = new UsageService()
        const totalCost = await usageService.getTotalCost(session.user.id)

        const last30Days = new Date()
        last30Days.setDate(last30Days.getDate() - 30)
        const costLast30Days = await usageService.getTotalCost(
          session.user.id,
          last30Days,
          new Date(),
        )

        return response.success({
          totalCost,
          costLast30Days,
          credits: session.user.credits ?? 0,
        })
      },
    }),
  },
})

