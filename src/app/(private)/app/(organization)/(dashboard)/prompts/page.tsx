'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromptFilters } from '@/features/prompt/presentation/components/prompt-filters'
import { PromptList } from '@/features/prompt/presentation/components/prompt-list'
import { PromptFormModal } from '@/features/prompt/presentation/components/prompt-form-modal'
import { PromptDetailModal } from '@/features/prompt/presentation/components/prompt-detail-modal'
import { usePrompts } from '@/features/prompt/presentation/hooks/use-prompts'
import { usePromptMutations } from '@/features/prompt/presentation/hooks/use-prompt-mutations'
import type { Prompt, CreatePromptDTO } from '@/features/prompt/prompt.interface'
import { useDebounce } from '@/@saas-boilerplate/hooks/use-debounce'

export default function PromptsPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  
  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch prompts
  const { data: prompts, isLoading } = usePrompts({
    category: selectedCategory || undefined,
    search: debouncedSearch || undefined,
    onlyMine: showOnlyMine,
    limit: 50,
  })

  const { createPrompt, updatePrompt, toggleFavorite, ratePrompt } = usePromptMutations()

  const handleUsePrompt = (prompt: Prompt) => {
    // Navegar para chat com prompt
    router.push(`/app?prompt=${encodeURIComponent(prompt.content)}`)
  }

  const handleViewPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setDetailModalOpen(true)
  }

  const handleToggleFavorite = (promptId: string) => {
    toggleFavorite.mutate({ params: { id: promptId } })
  }

  const handleCreatePrompt = () => {
    setSelectedPrompt(null)
    setFormMode('create')
    setFormModalOpen(true)
  }

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setFormMode('edit')
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (data: CreatePromptDTO) => {
    if (formMode === 'create') {
      await createPrompt.mutate({
        body: data,
      })
    } else if (selectedPrompt) {
      await updatePrompt.mutate({
        params: { id: selectedPrompt.id },
        body: data,
      })
    }
  }

  const handleRate = (promptId: string, rating: number) => {
    ratePrompt.mutate({
      params: { id: promptId },
      body: { rating },
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Biblioteca de Prompts</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold gradient-text">
            Desbloqueie o Poder dos Prompts!
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Prompts são mensagens predefinidas projetadas para ajudar você a obter os 
            melhores resultados da IA. Explore nossa coleção de prompts prontos para usar 
            e economize tempo enquanto obtém melhores resultados!
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleCreatePrompt}
            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Novo Prompt
          </Button>
        </div>

        {/* Filters */}
        <PromptFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showOnlyMine={showOnlyMine}
          onToggleOnlyMine={setShowOnlyMine}
        />

        {/* Prompt List */}
        <PromptList
          prompts={prompts || []}
          isLoading={isLoading}
          onUsePrompt={handleUsePrompt}
          onViewPrompt={handleViewPrompt}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>

      {/* Modals */}
      <PromptFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSubmit={handleFormSubmit}
        initialData={selectedPrompt}
        mode={formMode}
      />

      <PromptDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        prompt={selectedPrompt}
        onUse={handleUsePrompt}
        onToggleFavorite={handleToggleFavorite}
        onRate={handleRate}
      />
    </div>
  )
}

