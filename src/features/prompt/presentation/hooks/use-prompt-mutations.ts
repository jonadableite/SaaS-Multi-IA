'use client'

import { api, useQueryClient } from '@/igniter.client'
import { toast } from '@/@saas-boilerplate/hooks/use-toast'

/**
 * Hook para mutations de prompts (create, update, delete)
 */
export function usePromptMutations() {
  const queryClient = useQueryClient()

  const createPrompt = api.prompt.create.useMutation({
    onSuccess: () => {
      queryClient.invalidate(['prompt', 'list'])
      toast({ title: 'Prompt criado com sucesso!' })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar prompt',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updatePrompt = api.prompt.update.useMutation({
    onSuccess: () => {
      queryClient.invalidate(['prompt'])
      toast({ title: 'Prompt atualizado com sucesso!' })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar prompt',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deletePrompt = api.prompt.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidate(['prompt', 'list'])
      toast({ title: 'Prompt deletado com sucesso!' })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao deletar prompt',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const toggleFavorite = api.prompt.toggleFavorite.useMutation({
    onSuccess: (data) => {
      queryClient.invalidate(['prompt'])
      toast({
        title: data.isFavorited
          ? 'Adicionado aos favoritos'
          : 'Removido dos favoritos',
      })
    },
  })

  const ratePrompt = api.prompt.rate.useMutation({
    onSuccess: () => {
      queryClient.invalidate(['prompt'])
      toast({ title: 'Avaliação registrada!' })
    },
  })

  const trackUsage = useMutation({
    mutationFn: ({ params }: { params: { id: string } }) =>
      client.prompt.trackUsage.query({ params }),
    onSuccess: () => {
      // Não precisa mostrar toast, é silencioso
    },
    onError: (error: Error) => {
      console.error('Erro ao rastrear uso do prompt:', error)
    },
  })

  return {
    createPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    ratePrompt,
    trackUsage,
  }
}

