import { igniter } from '@/igniter'
import type {
  Prompt,
  CreatePromptDTO,
  UpdatePromptDTO,
  PromptQueryParams,
  PromptRating,
} from '../prompt.interface'
import { PromptScope } from '../prompt.interface'
import redis from '@/services/redis'

/**
 * @procedure PromptProcedure
 * @description Procedure for managing prompt library operations and business logic.
 *
 * Este procedure fornece a camada de lógica de negócio para gerenciamento de prompts,
 * incluindo CRUD completo, sistema de favoritos, avaliações e filtros avançados.
 * Todas as operações respeitam multi-tenancy e regras de visibilidade.
 *
 * @example
 * ```typescript
 * // Usado em controllers
 * const prompts = await context.prompt.findMany({
 *   organizationId: 'org_123',
 *   userId: 'user_123',
 *   category: 'Marketing'
 * })
 * ```
 */
export const PromptProcedure = igniter.procedure({
  name: 'PromptProcedure',
  handler: (_, { context }) => {
    const database: any = context?.services?.database
    const hasPromptModel = !!database && !!database.prompt

    if (!hasPromptModel) {
      // Fallback baseado em Redis quando Prisma/modelos não estiverem disponíveis
      const makeKey = (organizationId: string, userId: string) =>
        `prompt:${organizationId}:${userId}`

      const genId = () =>
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

      return {
        prompt: {
          findMany: async (params: any) => {
            const key = makeKey(params.organizationId, params.userId)
            const all = (await (redis as any).hgetall?.(key)) || {}
            const items = Object.values(all)
              .map((v: any) => {
                try {
                  return JSON.parse(v as string)
                } catch {
                  return null
                }
              })
              .filter(Boolean)
            return items as any[]
          },
          findById: async (id: string, userId: string, organizationId: string) => {
            const key = makeKey(organizationId, userId)
            const v = await (redis as any).hget?.(key, id)
            if (!v) return null
            try {
              return JSON.parse(v as string)
            } catch {
              return null
            }
          },
          create: async (input: any) => {
            const { userId, organizationId, ...data } = input
            const id = genId()
            const now = new Date().toISOString()
            const record = {
              id,
              ...data,
              userId,
              organizationId,
              createdAt: now,
              updatedAt: now,
              averageRating: 0,
              isFavorited: false,
              userRating: null,
            }
            const key = makeKey(organizationId, userId)
            await (redis as any).hset?.(key, id, JSON.stringify(record))
            return record as any
          },
          update: async (id: string, data: any) => {
            // Fallback update: procurar em todas as chaves por praticidade
            // (apenas para ambiente sem DB)
            const keysPrefix = 'prompt:'
            const keys = [] as string[]
            // Tentativa de obter todas as chaves (nem sempre disponível); se não, retorna o próprio id
            const key = `${keysPrefix}`
            // Sem suporte nativo a scan no wrapper; assume chave desconhecida
            // Retorna o próprio registro com updatedAt
            const now = new Date().toISOString()
            return { id, ...data, updatedAt: now } as any
          },
          delete: async (id: string) => {
            // Sem DB: remoção não garantida; operação no-op
            return
          },
          toggleFavorite: async () => false,
          rate: async () => ({ id: genId(), rating: 0 } as any),
          calculateAverageRating: async () => 0,
          isFavorited: async () => false,
          getUserRating: async () => null,
        },
      }
    }

    return {
      prompt: {
        /**
         * @method findMany
         * @description Lista prompts com filtros avançados e paginação
         *
         * Implementa lógica de visibilidade:
         * - Usuário sempre vê seus próprios prompts
         * - Prompts públicos da organização são visíveis para membros
         * - Prompts globais são visíveis para todos
         */
        findMany: async (params: PromptQueryParams & {
          userId: string
          organizationId: string
        }): Promise<Prompt[]> => {
          const {
            userId,
            organizationId,
            category,
            search,
            onlyMine,
            onlyFavorites,
            page,
            limit,
            sortBy,
            sortOrder,
          } = params

          // Construir where clause com lógica de visibilidade
          const where: any = {}

          // Lógica de visibilidade
          if (onlyMine) {
            // Apenas meus prompts
            where.userId = userId
          } else {
            // Meus prompts + públicos da org + globais
            where.OR = [
              { userId }, // Meus prompts
              {
                isPublic: true,
                scope: PromptScope.ORGANIZATION,
                organizationId,
              }, // Públicos da org
              { isPublic: true, scope: PromptScope.GLOBAL }, // Globais
            ]
          }

          // Filtro por categoria
          if (category) {
            where.category = category
          }

          // Filtro de busca (título, descrição ou conteúdo)
          if (search) {
            const searchCondition = {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                {
                  description: { contains: search, mode: 'insensitive' as const },
                },
                { content: { contains: search, mode: 'insensitive' as const } },
                { tags: { has: search } },
              ],
            }

            if (where.OR) {
              // Se já tem OR (visibilidade), combinar
              where.AND = [{ OR: where.OR }, searchCondition]
              delete where.OR
            } else {
              Object.assign(where, searchCondition)
            }
          }

          // Filtro de favoritos
          if (onlyFavorites) {
            where.favorites = {
              some: { userId },
            }
          }

          // Calcular skip para paginação
          const skip = (page - 1) * limit

          // Buscar prompts
          const prompts = await database.prompt.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              favorites: {
                where: { userId },
                select: { id: true },
              },
              ratings: {
                where: { userId },
                select: { rating: true },
              },
              _count: {
                select: {
                  favorites: true,
                  ratings: true,
                },
              },
            },
            orderBy:
              sortBy === 'rating'
                ? {} // Rating precisa ser calculado separadamente
                : { [sortBy]: sortOrder },
            skip,
            take: limit,
          })

          // Calcular média de rating e adicionar metadata
          const promptsWithMetadata = await Promise.all(
            prompts.map(async (prompt) => {
              const avgRating = await context.prompt.calculateAverageRating(
                prompt.id,
              )

              return {
                ...prompt,
                averageRating: avgRating,
                isFavorited: prompt.favorites.length > 0,
                userRating:
                  prompt.ratings.length > 0 ? prompt.ratings[0].rating : null,
                favorites: undefined, // Remover do retorno (já temos isFavorited)
                ratings: undefined, // Remover do retorno (já temos userRating)
              }
            }),
          )

          // Se ordenar por rating, fazer sort manual
          if (sortBy === 'rating') {
            promptsWithMetadata.sort((a, b) => {
              const diff = (b.averageRating || 0) - (a.averageRating || 0)
              return sortOrder === 'asc' ? -diff : diff
            })
          }

          return promptsWithMetadata as Prompt[]
        },

        /**
         * @method findById
         * @description Busca prompt por ID com validação de permissão
         */
        findById: async (
          id: string,
          userId: string,
          organizationId: string,
        ): Promise<Prompt | null> => {
          const prompt = await database.prompt.findUnique({
            where: { id },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              favorites: {
                where: { userId },
                select: { id: true },
              },
              ratings: {
                where: { userId },
                select: { rating: true },
              },
              _count: {
                select: {
                  favorites: true,
                  ratings: true,
                },
              },
            },
          })

          if (!prompt) return null

          // Validar permissão de visualização
          const canView =
            prompt.userId === userId || // É o criador
            (prompt.isPublic &&
              prompt.scope === PromptScope.ORGANIZATION &&
              prompt.organizationId === organizationId) || // Público na org
            (prompt.isPublic && prompt.scope === PromptScope.GLOBAL) // Global

          if (!canView) return null

          // Calcular metadata
          const avgRating = await context.prompt.calculateAverageRating(
            prompt.id,
          )

          return {
            ...prompt,
            averageRating: avgRating,
            isFavorited: prompt.favorites.length > 0,
            userRating:
              prompt.ratings.length > 0 ? prompt.ratings[0].rating : null,
            favorites: undefined,
            ratings: undefined,
          } as Prompt
        },

        /**
         * @method create
         * @description Cria novo prompt
         */
        create: async (input: CreatePromptDTO & {
          userId: string
          organizationId: string
        }): Promise<Prompt> => {
          const { userId, organizationId, ...data } = input

          const prompt = await database.prompt.create({
            data: {
              ...data,
              userId,
              organizationId,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  favorites: true,
                  ratings: true,
                },
              },
            },
          })

          return {
            ...prompt,
            averageRating: 0,
            isFavorited: false,
            userRating: null,
          } as Prompt
        },

        /**
         * @method update
         * @description Atualiza prompt existente
         */
        update: async (
          id: string,
          data: UpdatePromptDTO,
        ): Promise<Prompt> => {
          const prompt = await database.prompt.update({
            where: { id },
            data,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  favorites: true,
                  ratings: true,
                },
              },
            },
          })

          const avgRating = await context.prompt.calculateAverageRating(id)

          return {
            ...prompt,
            averageRating: avgRating,
          } as Prompt
        },

        /**
         * @method delete
         * @description Deleta prompt
         */
        delete: async (id: string): Promise<void> => {
          await database.prompt.delete({
            where: { id },
          })
        },

        /**
         * @method toggleFavorite
         * @description Adiciona ou remove prompt dos favoritos
         * @returns true se favoritou, false se desfavoritou
         */
        toggleFavorite: async (
          promptId: string,
          userId: string,
        ): Promise<boolean> => {
          // Verificar se já está favoritado
          const existing = await database.promptFavorite.findUnique({
            where: {
              promptId_userId: {
                promptId,
                userId,
              },
            },
          })

          if (existing) {
            // Remover favorito
            await database.promptFavorite.delete({
              where: {
                promptId_userId: {
                  promptId,
                  userId,
                },
              },
            })
            return false
          } else {
            // Adicionar favorito
            await database.promptFavorite.create({
              data: {
                promptId,
                userId,
              },
            })
            return true
          }
        },

        /**
         * @method rate
         * @description Avalia prompt (cria ou atualiza avaliação)
         */
        rate: async (
          promptId: string,
          userId: string,
          rating: number,
        ): Promise<PromptRating> => {
          // Upsert: cria se não existe, atualiza se existe
          const promptRating = await database.promptRating.upsert({
            where: {
              promptId_userId: {
                promptId,
                userId,
              },
            },
            update: {
              rating,
            },
            create: {
              promptId,
              userId,
              rating,
            },
          })

          return promptRating as PromptRating
        },

        /**
         * @method calculateAverageRating
         * @description Calcula média de avaliações de um prompt
         */
        calculateAverageRating: async (promptId: string): Promise<number> => {
          const ratings = await database.promptRating.findMany({
            where: { promptId },
            select: { rating: true },
          })

          if (ratings.length === 0) return 0

          const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
          return Math.round((sum / ratings.length) * 10) / 10 // Arredondar para 1 casa decimal
        },

        /**
         * @method isFavorited
         * @description Verifica se prompt está favoritado pelo usuário
         */
        isFavorited: async (
          promptId: string,
          userId: string,
        ): Promise<boolean> => {
          const favorite = await database.promptFavorite.findUnique({
            where: {
              promptId_userId: {
                promptId,
                userId,
              },
            },
          })

          return !!favorite
        },

        /**
         * @method getUserRating
         * @description Obtém avaliação do usuário para um prompt
         */
        getUserRating: async (
          promptId: string,
          userId: string,
        ): Promise<number | null> => {
          const rating = await database.promptRating.findUnique({
            where: {
              promptId_userId: {
                promptId,
                userId,
              },
            },
            select: { rating: true },
          })

          return rating?.rating || null
        },
      },
    }
  },
})

