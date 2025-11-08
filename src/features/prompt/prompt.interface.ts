import { z } from 'zod'

/**
 * @file prompt.interface.ts
 * @description Definições de tipos, interfaces e schemas de validação para o sistema de biblioteca de prompts
 *
 * Este arquivo contém todas as definições TypeScript necessárias para o sistema de prompts,
 * incluindo enums, interfaces e schemas Zod para validação em runtime.
 */

// ============================================
// ENUMS
// ============================================

/**
 * Enum de categorias de prompts disponíveis no sistema
 */
export enum PromptCategory {
  MARKETING = 'Marketing',
  CODIGO = 'Código',
  VENDAS = 'Vendas',
  COMUNICACAO = 'Comunicação',
  ACADEMICO = 'Acadêmico',
  CRIACAO_CONTEUDO = 'Criação de Conteúdo',
  JURIDICO = 'Jurídico',
  ENTRETENIMENTO = 'Entretenimento',
  TRABALHO = 'Trabalho',
  RESOLUCAO_PROBLEMAS = 'Resolução de Problemas',
  ESCRITA = 'Escrita',
  ESTILO_VIDA = 'Estilo de Vida',
  RH = 'Recursos Humanos',
  FINANCAS = 'Finanças',
  APRESENTACOES = 'Apresentações',
}

/**
 * Enum de escopo de visibilidade de prompts
 */
export enum PromptScope {
  USER = 'USER', // Visível apenas para o criador
  ORGANIZATION = 'ORGANIZATION', // Visível para toda a organização
  GLOBAL = 'GLOBAL', // Visível globalmente (marketplace público)
}

// ============================================
// INTERFACES
// ============================================

/**
 * Interface principal de Prompt
 */
export interface Prompt {
  id: string
  title: string
  description: string | null
  content: string
  category: string
  tags: string[]
  isPublic: boolean
  scope: PromptScope
  userId: string
  user?: {
    id: string
    name: string
    image: string | null
  }
  organizationId: string
  favorites?: PromptFavorite[]
  ratings?: PromptRating[]
  _count?: {
    favorites: number
    ratings: number
  }
  averageRating?: number
  isFavorited?: boolean
  userRating?: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface de Favorito de Prompt
 */
export interface PromptFavorite {
  id: string
  promptId: string
  userId: string
  createdAt: Date
}

/**
 * Interface de Rating/Avaliação de Prompt
 */
export interface PromptRating {
  id: string
  rating: number
  promptId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// ZOD SCHEMAS PARA VALIDAÇÃO
// ============================================

/**
 * Schema Zod para criação de Prompt
 */
export const CreatePromptSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(200, 'Título muito longo (máximo 200 caracteres)'),
  description: z
    .string()
    .max(500, 'Descrição muito longa (máximo 500 caracteres)')
    .optional()
    .nullable(),
  content: z
    .string()
    .min(10, 'Conteúdo deve ter no mínimo 10 caracteres')
    .max(10000, 'Conteúdo muito longo (máximo 10000 caracteres)'),
  category: z.nativeEnum(PromptCategory, {
    errorMap: () => ({ message: 'Categoria inválida' }),
  }),
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Máximo de 10 tags permitidas')
    .default([]),
  isPublic: z.boolean().default(false),
  scope: z.nativeEnum(PromptScope).default(PromptScope.USER),
})

export type CreatePromptDTO = z.infer<typeof CreatePromptSchema>

/**
 * Schema Zod para atualização de Prompt
 */
export const UpdatePromptSchema = CreatePromptSchema.partial()

export type UpdatePromptDTO = z.infer<typeof UpdatePromptSchema>

/**
 * Schema Zod para query params de listagem de prompts
 */
export const PromptQueryParamsSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
  onlyMine: z.boolean().optional(),
  onlyFavorites: z.boolean().optional(),
  userId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'title', 'rating'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PromptQueryParams = z.infer<typeof PromptQueryParamsSchema>

/**
 * Schema Zod para avaliação de prompt
 */
export const RatePromptSchema = z.object({
  rating: z
    .number()
    .int('Avaliação deve ser um número inteiro')
    .min(1, 'Avaliação mínima é 1 estrela')
    .max(5, 'Avaliação máxima é 5 estrelas'),
})

export type RatePromptDTO = z.infer<typeof RatePromptSchema>

/**
 * Schema Zod para parâmetros de ID
 */
export const PromptIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type PromptIdParam = z.infer<typeof PromptIdParamSchema>

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Tipo de resposta para listagem de prompts (com paginação)
 */
export interface PromptListResponse {
  prompts: Prompt[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Tipo de resposta para toggle de favorito
 */
export interface ToggleFavoriteResponse {
  isFavorited: boolean
  favoritesCount: number
}

/**
 * Tipo de resposta para estatísticas de prompt
 */
export interface PromptStatsResponse {
  totalPrompts: number
  publicPrompts: number
  privatePrompts: number
  totalFavorites: number
  averageRating: number
}

