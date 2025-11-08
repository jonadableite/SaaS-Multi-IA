import { igniter } from '@/igniter'
import { z } from 'zod'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { createSecurityProcedure } from '@/middleware/security'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { SocialService } from '../services/social.service'

const SocialSearchQuerySchema = z.object({
  platform: z.enum(['linkedin', 'twitter', 'facebook', 'instagram']),
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  lang: z.string().optional(),
})

export const SocialController = igniter.controller({
  name: 'Social',
  path: '/social',
  description: 'Search social networks for profiles, posts and pages',
  actions: {
    search: igniter.query({
      name: 'Search',
      description: 'Search a given platform for a query string',
      path: '/search',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
      ],
      query: SocialSearchQuerySchema,
      handler: async ({ request, response }) => {
        const svc = new SocialService()
        const results = await svc.search(request.query.platform, request.query.q, {
          limit: request.query.limit ?? 10,
          lang: request.query.lang,
        })
        return response.success({ results, available: svc.getAvailableProviders() })
      },
    }),
  },
})