'use client'

import { api } from '@/igniter.client'
import type { PromptQueryParams } from '../../prompt.interface'

/**
 * Hook para buscar prompts com filtros
 */
export function usePrompts(params: Partial<PromptQueryParams> = {}) {
  return api.prompt.list.useQuery(params)
}

/**
 * Hook para buscar um prompt específico por ID
 */
export function usePrompt(id: string) {
  return api.prompt.retrieve.useQuery({ params: { id } })
}

