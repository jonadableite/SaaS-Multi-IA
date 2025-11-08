import { igniter } from '@/igniter'
import { z } from 'zod'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { createSecurityProcedure } from '@/middleware/security'
import { createRateLimitProcedure, defaultRateLimitConfig } from '@/middleware/rate-limit'
import { MemoryProcedure } from '@/features/memory/procedures/memory.procedure'
import { KnowledgeService } from '../services/knowledge.service'
import { EmbeddingService } from '../services/embedding.service'
import { VectorStoreService } from '../services/vector-store.service'
import { VersioningService } from '../services/versioning.service'
import { logger } from '@/services/logger'

const IngestSchema = z.object({
  title: z.string().optional(),
  text: z.string().min(1),
  tags: z.array(z.string()).optional(),
})

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const KnowledgeController = igniter.controller({
  name: 'Knowledge',
  path: '/knowledge',
  description: 'Knowledge ingestion and retrieval built on top of Memory',
  actions: {
    ingest: igniter.mutation({
      name: 'Ingest',
      description: 'Store knowledge text into memory',
      path: '/',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        MemoryProcedure(),
      ],
      body: IngestSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({ requirements: 'authenticated' })
        if (!session?.user) return response.unauthorized('Authentication required')

        const svc = new KnowledgeService()
        const payload = await svc.buildMemoryPayload(request.body)
        const created = await context.memory.memory.create(session.user.id, payload)
        // Compute and store embedding
        const emb = new EmbeddingService()
        if (emb.isConfigured()) {
          try {
            const vec = await emb.embed(payload.value)
            const store = new VectorStoreService()
            await store.upsert(session.user.id, {
              id: created.id,
              key: created.key,
              category: created.category,
              preview: created.value.slice(0, 120),
              vector: vec,
            })
          } catch (e: any) {
            logger.error('[Knowledge] Failed to embed', { message: e?.message })
          }
        }
        // Add version history
        const ver = new VersioningService()
        await ver.add(created.id, created.value)
        return response.created(created)
      },
    }),

    search: igniter.query({
      name: 'Search',
      description: 'Search knowledge entries from memory',
      path: '/search',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
        MemoryProcedure(),
      ],
      query: SearchQuerySchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({ requirements: 'authenticated' })
        if (!session?.user) return response.unauthorized('Authentication required')

        const results = await context.memory.memory.findMany(session.user.id, {
          category: 'knowledge',
          search: request.query.q,
        })
        return response.success(results.slice(0, request.query.limit ?? 20))
      },
    }),

    semantic: igniter.query({
      name: 'SemanticSearch',
      description: 'Semantic search over knowledge using embeddings',
      path: '/semantic',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
      ],
      query: SearchQuerySchema.extend({ threshold: z.coerce.number().min(0).max(1).default(0.3) }),
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({ requirements: 'authenticated' })
        if (!session?.user) return response.unauthorized('Authentication required')

        const emb = new EmbeddingService()
        if (!emb.isConfigured()) {
          return response.status(503).json({ error: { message: 'Embedding not configured' } })
        }
        const store = new VectorStoreService()
        const queryVec = await emb.embed(request.query.q)
        const all = await store.list(session.user.id)
        const scored = all
          .map((r) => ({ r, score: emb.cosineSimilarity(queryVec, r.vector) }))
          .filter((s) => s.score >= (request.query as any).threshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, request.query.limit ?? 20)
        return response.success(scored.map(({ r, score }) => ({ ...r, score })))
      },
    }),

    versions: igniter.query({
      name: 'ListVersions',
      description: 'List memory versions',
      path: '/:id/versions' as const,
      use: [AuthFeatureProcedure(), createRateLimitProcedure(defaultRateLimitConfig)],
      handler: async ({ request, response }) => {
        const ver = new VersioningService()
        const list = await ver.list(request.params.id)
        return response.success(list)
      },
    }),

    rollback: igniter.mutation({
      name: 'Rollback',
      description: 'Rollback memory to previous version',
      path: '/:id/rollback' as const,
      method: 'POST',
      use: [AuthFeatureProcedure(), createRateLimitProcedure(defaultRateLimitConfig), MemoryProcedure()],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({ requirements: 'authenticated' })
        if (!session?.user) return response.unauthorized('Authentication required')
        const ver = new VersioningService()
        const list = await ver.list(request.params.id)
        const prev = list[1] // previous entry
        if (!prev) return response.notFound('No previous version')
        const updated = await context.memory.memory.update(session.user.id, request.params.id, { value: prev.value })
        await ver.add(request.params.id, updated.value)
        return response.success(updated)
      },
    }),
  },
})