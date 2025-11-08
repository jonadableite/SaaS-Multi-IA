import { igniter } from '@/igniter'
import { z } from 'zod'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { createSecurityProcedure } from '@/middleware/security'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { DocumentService } from '../services/document.service'

const ReportSchema = z.object({ title: z.string().min(1), text: z.string().min(1) })

export const DocumentController = igniter.controller({
  name: 'Document',
  path: '/documents',
  description: 'Automated document/report generation',
  actions: {
    report: igniter.mutation({
      name: 'GenerateReport',
      description: 'Generate a markdown report from text',
      path: '/report',
      method: 'POST',
      use: [AuthFeatureProcedure(), createRateLimitProcedure(defaultRateLimitConfig), createSecurityProcedure({ sanitizeBody: true })],
      body: ReportSchema,
      handler: async ({ request, response }) => {
        const svc = new DocumentService()
        const doc = await svc.generateReport(request.body.title, request.body.text)
        return response.success(doc)
      },
    }),
  },
})