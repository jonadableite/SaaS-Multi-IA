import { igniter } from '@/igniter'
import { z } from 'zod'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { createSecurityProcedure } from '@/middleware/security'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { ToolsService } from '../services/tools.service'

const TextBodySchema = z.object({ text: z.string().min(1), provider: z.enum(['openai','anthropic','google','fusion']).optional() })

export const ToolsController = igniter.controller({
  name: 'Tools',
  path: '/tools',
  description: 'Productivity tools: summarization, task extraction, outlines',
  actions: {
    summarize: igniter.mutation({
      name: 'Summarize',
      description: 'Summarize a given text',
      path: '/summarize',
      method: 'POST',
      use: [AuthFeatureProcedure(), createRateLimitProcedure(defaultRateLimitConfig), createSecurityProcedure({ sanitizeBody: true })],
      body: TextBodySchema,
      handler: async ({ request, response }) => {
        const svc = new ToolsService()
        const result = await svc.summarize(request.body.text, request.body.provider as any)
        return response.success(result)
      },
    }),
    extract: igniter.mutation({
      name: 'ExtractTasks',
      description: 'Extract actionable tasks from text',
      path: '/extract-tasks',
      method: 'POST',
      use: [AuthFeatureProcedure(), createRateLimitProcedure(defaultRateLimitConfig), createSecurityProcedure({ sanitizeBody: true })],
      body: TextBodySchema,
      handler: async ({ request, response }) => {
        const svc = new ToolsService()
        const result = await svc.extractTasks(request.body.text, request.body.provider as any)
        return response.success(result)
      },
    }),
    outline: igniter.mutation({
      name: 'Outline',
      description: 'Generate structured outline',
      path: '/outline',
      method: 'POST',
      use: [AuthFeatureProcedure(), createRateLimitProcedure(defaultRateLimitConfig), createSecurityProcedure({ sanitizeBody: true })],
      body: TextBodySchema,
      handler: async ({ request, response }) => {
        const svc = new ToolsService()
        const result = await svc.outline(request.body.text, request.body.provider as any)
        return response.success(result)
      },
    }),
  },
})