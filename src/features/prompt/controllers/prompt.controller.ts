import { z } from 'zod'
import { igniter } from '@/igniter'
import { AuthFeatureProcedure } from '@/@saas-boilerplate/features/auth/procedures/auth.procedure'
import { PromptProcedure } from '../procedures/prompt.procedure'
import {
  CreatePromptSchema,
  UpdatePromptSchema,
  PromptQueryParamsSchema,
  RatePromptSchema,
} from '../prompt.interface'
import {
  createRateLimitProcedure,
  defaultRateLimitConfig,
} from '@/middleware/rate-limit'
import { createSecurityProcedure } from '@/middleware/security'

/**
 * @controller PromptController
 * @description Controller para gerenciamento de biblioteca de prompts.
 *
 * Este controller fornece endpoints REST para gerenciar prompts, incluindo
 * CRUD completo, sistema de favoritos, avaliações e busca avançada.
 * Todos os endpoints requerem autenticação e respeitam multi-tenancy.
 *
 * @example
 * ```typescript
 * // Listar prompts
 * const prompts = await api.prompt.list.query({ category: 'Marketing' })
 *
 * // Criar novo prompt
 * const newPrompt = await api.prompt.create.mutate({
 *   title: 'Template de Email',
 *   content: 'Crie um email profissional sobre...',
 *   category: 'Marketing'
 * })
 * ```
 */
export const PromptController = igniter.controller({
  name: 'Prompt',
  path: '/prompts',
  description: 'Gerenciamento de biblioteca de prompts',
  actions: {
    /**
     * @action list
     * @description Lista prompts com filtros e paginação
     * @method GET /api/v1/prompts
     */
    list: igniter.query({
      name: 'List Prompts',
      description: 'Lista prompts com filtros avançados',
      path: '/',
      method: 'GET',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
        PromptProcedure(),
      ],
      query: PromptQueryParamsSchema,
      handler: async ({ context, request, response }) => {
        // Autenticação: obter sessão do usuário
        const session = await context.auth.getSession({
          requirements: 'authenticated',
          roles: ['owner', 'admin', 'member'],
        })

        if (!session?.user || !session?.organization) {
          return response.unauthorized(
            'Autenticação necessária e organização ativa requerida',
          )
        }

        // Business Logic: listar prompts com filtros
        const prompts = await context.prompt.findMany({
          ...request.query,
          userId: session.user.id,
          organizationId: session.organization.id,
        })

        return response.success(prompts)
      },
    }),

    /**
     * @action retrieve
     * @description Busca prompt por ID
     * @method GET /api/v1/prompts/:id
     */
    retrieve: igniter.query({
      name: 'Get Prompt',
      description: 'Busca prompt por ID',
      path: '/:id',
      method: 'GET',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeQuery: true }),
        PromptProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user || !session?.organization) {
          return response.unauthorized('Autenticação necessária')
        }

        const { id } = request.params

        const prompt = await context.prompt.findById(
          id,
          session.user.id,
          session.organization.id,
        )

        if (!prompt) {
          return response.notFound('Prompt não encontrado ou sem permissão')
        }

        return response.success(prompt)
      },
    }),

    /**
     * @action create
     * @description Cria novo prompt
     * @method POST /api/v1/prompts
     */
    create: igniter.mutation({
      name: 'Create Prompt',
      description: 'Cria novo prompt',
      path: '/',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        PromptProcedure(),
      ],
      body: CreatePromptSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
          roles: ['owner', 'admin', 'member'],
        })

        if (!session?.user || !session?.organization) {
          return response.unauthorized(
            'Autenticação necessária e organização ativa requerida',
          )
        }

        // Business Logic: criar prompt
        const prompt = await context.prompt.create({
          ...request.body,
          userId: session.user.id,
          organizationId: session.organization.id,
        })

        return response.success(prompt, 201)
      },
    }),

    /**
     * @action update
     * @description Atualiza prompt existente
     * @method PUT /api/v1/prompts/:id
     */
    update: igniter.mutation({
      name: 'Update Prompt',
      description: 'Atualiza prompt existente',
      path: '/:id',
      method: 'PUT',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        PromptProcedure(),
      ],
      body: UpdatePromptSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user || !session?.organization) {
          return response.unauthorized('Autenticação necessária')
        }

        const { id } = request.params

        // Business Rule: verificar se prompt existe e pertence ao usuário
        const existingPrompt = await context.prompt.findById(
          id,
          session.user.id,
          session.organization.id,
        )

        if (!existingPrompt) {
          return response.notFound('Prompt não encontrado')
        }

        if (existingPrompt.userId !== session.user.id) {
          return response.forbidden('Apenas o criador pode editar este prompt')
        }

        // Business Logic: atualizar prompt
        const updatedPrompt = await context.prompt.update(id, request.body)

        return response.success(updatedPrompt)
      },
    }),

    /**
     * @action delete
     * @description Deleta prompt
     * @method DELETE /api/v1/prompts/:id
     */
    delete: igniter.mutation({
      name: 'Delete Prompt',
      description: 'Deleta prompt',
      path: '/:id',
      method: 'DELETE',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        PromptProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user || !session?.organization) {
          return response.unauthorized('Autenticação necessária')
        }

        const { id } = request.params

        // Business Rule: verificar se prompt existe e pertence ao usuário
        const existingPrompt = await context.prompt.findById(
          id,
          session.user.id,
          session.organization.id,
        )

        if (!existingPrompt) {
          return response.notFound('Prompt não encontrado')
        }

        if (existingPrompt.userId !== session.user.id) {
          return response.forbidden('Apenas o criador pode deletar este prompt')
        }

        // Business Logic: deletar prompt
        await context.prompt.delete(id)

        return response.success({
          message: 'Prompt deletado com sucesso',
        })
      },
    }),

    /**
     * @action toggleFavorite
     * @description Adiciona ou remove prompt dos favoritos
     * @method POST /api/v1/prompts/:id/favorite
     */
    toggleFavorite: igniter.mutation({
      name: 'Toggle Favorite',
      description: 'Adiciona ou remove prompt dos favoritos',
      path: '/:id/favorite',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        PromptProcedure(),
      ],
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Autenticação necessária')
        }

        const { id: promptId } = request.params

        // Business Logic: toggle favorite
        const isFavorited = await context.prompt.toggleFavorite(
          promptId,
          session.user.id,
        )

        return response.success({
          isFavorited,
          message: isFavorited
            ? 'Prompt adicionado aos favoritos'
            : 'Prompt removido dos favoritos',
        })
      },
    }),

    /**
     * @action rate
     * @description Avalia prompt (1-5 estrelas)
     * @method POST /api/v1/prompts/:id/rate
     */
    rate: igniter.mutation({
      name: 'Rate Prompt',
      description: 'Avalia prompt com nota de 1 a 5 estrelas',
      path: '/:id/rate',
      method: 'POST',
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(defaultRateLimitConfig),
        createSecurityProcedure({ sanitizeBody: true }),
        PromptProcedure(),
      ],
      body: RatePromptSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: 'authenticated',
        })

        if (!session?.user) {
          return response.unauthorized('Autenticação necessária')
        }

        const { id: promptId } = request.params
        const { rating } = request.body

        // Business Rule: não pode avaliar próprio prompt
        const prompt = await context.prompt.findById(
          promptId,
          session.user.id,
          session.organization?.id || '',
        )

        if (!prompt) {
          return response.notFound('Prompt não encontrado')
        }

        if (prompt.userId === session.user.id) {
          return response.badRequest('Você não pode avaliar seu próprio prompt')
        }

        // Business Logic: avaliar prompt
        const promptRating = await context.prompt.rate(
          promptId,
          session.user.id,
          rating,
        )

        // Recalcular média
        const averageRating =
          await context.prompt.calculateAverageRating(promptId)

        return response.success({
          rating: promptRating,
          averageRating,
          message: 'Avaliação registrada com sucesso',
        })
      },
    }),
  },
})

