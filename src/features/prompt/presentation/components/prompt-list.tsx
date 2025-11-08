'use client'

import { PromptCard } from './prompt-card'
import type { Prompt } from '../../prompt.interface'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PromptListProps {
  prompts: Prompt[]
  isLoading?: boolean
  onUsePrompt: (prompt: Prompt) => void
  onViewPrompt: (prompt: Prompt) => void
  onToggleFavorite?: (promptId: string) => void
}

export function PromptList({
  prompts,
  isLoading,
  onUsePrompt,
  onViewPrompt,
  onToggleFavorite,
}: PromptListProps) {
  // Evitar mismatch de hidratação: garantir skeleton no primeiro render
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  const showLoading = isLoading || !hydrated

  if (showLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-64 glass-effect rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum prompt encontrado</h3>
        <p className="text-muted-foreground">
          Crie seu primeiro prompt ou ajuste os filtros
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prompts.map((prompt, index) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onUse={onUsePrompt}
          onView={onViewPrompt}
          onToggleFavorite={onToggleFavorite}
          className={`stagger-${Math.min(index + 1, 5)}`}
        />
      ))}
    </div>
  )
}

