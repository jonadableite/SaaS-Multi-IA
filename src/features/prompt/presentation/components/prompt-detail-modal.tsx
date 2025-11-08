'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CopyButton } from '@/components/ui/copy-button'
import {
  Sparkles,
  Star,
  Heart,
  Tag,
  Calendar,
  User,
  Shield,
  Globe,
  Lock,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Prompt } from '../../prompt.interface'
import {
  getCategoryIcon,
  getCategoryColor,
  getCategoryBgColor,
  getStarsArray,
  formatFavoriteCount,
  formatRelativeTime,
} from '../utils/prompt-helpers'

interface PromptDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: Prompt | null
  onUse: (prompt: Prompt) => void
  onToggleFavorite?: (promptId: string) => void
  onRate?: (promptId: string, rating: number) => void
}

const SCOPE_LABEL: Record<string, string> = {
  USER: 'Somente eu',
  ORGANIZATION: 'Organização',
  GLOBAL: 'Global',
}

const SCOPE_ICON: Record<string, JSX.Element> = {
  USER: <Lock className="w-4 h-4 text-blue-500" />,
  ORGANIZATION: <Shield className="w-4 h-4 text-purple-500" />,
  GLOBAL: <Globe className="w-4 h-4 text-emerald-500" />,
}

export function PromptDetailModal({
  open,
  onOpenChange,
  prompt,
  onUse,
  onToggleFavorite,
  onRate,
}: PromptDetailModalProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)

  const stars = useMemo(() => getStarsArray(5), [])

  const averageRating =
    prompt?.averageRating && prompt.averageRating > 0
      ? Number(prompt.averageRating.toFixed(1))
      : null

  const currentRating = hoveredRating ?? prompt?.userRating ?? 0

  const handleRate = (rating: number) => {
    if (!prompt || !onRate) return
    onRate(prompt.id, rating)
  }

  const handleFavorite = () => {
    if (!prompt || !onToggleFavorite) return
    onToggleFavorite(prompt.id)
  }

  const renderContent = () => {
    if (!prompt) {
      return (
        <div className="py-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Selecione um prompt para visualizar os detalhes.
          </p>
        </div>
      )
    }

    const categoryIcon = getCategoryIcon(prompt.category)
    const categoryColor = getCategoryColor(prompt.category)
    const categoryBgColor = getCategoryBgColor(prompt.category)
    const createdAt = new Date(prompt.createdAt)
    const updatedAt = new Date(prompt.updatedAt)
    const scopeLabel = SCOPE_LABEL[prompt.scope] ?? 'Indefinido'
    const scopeIcon = SCOPE_ICON[prompt.scope] ?? (
      <Shield className="w-4 h-4 text-muted-foreground" />
    )

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main content */}
        <div className="flex flex-col gap-6 p-6 lg:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
                  categoryBgColor,
                  categoryColor.replace('text', 'border'),
                  'border border-current/20',
                )}
              >
                {categoryIcon && (
                  <categoryIcon.type
                    className={cn('w-3.5 h-3.5', categoryColor)}
                  />
                )}
                <span className={categoryColor}>{prompt.category}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Criado {formatRelativeTime(createdAt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                {prompt.title}
              </h2>
              {prompt.description && (
                <p className="text-sm text-muted-foreground">
                  {prompt.description}
                </p>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-effect rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avaliação</span>
                {averageRating ? (
                  <span className="text-xs text-muted-foreground">
                    Média {averageRating} (
                    {prompt._count?.ratings?.toLocaleString() || 0})
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Sem avaliações
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {stars.map(({ key }) => {
                  const ratingValue = key + 1
                  const isFilled = ratingValue <= currentRating

                  return (
                    <button
                      key={key}
                      type="button"
                      className="p-1 rounded-md transition-colors hover:bg-muted"
                      onMouseEnter={() => setHoveredRating(ratingValue)}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => handleRate(ratingValue)}
                      aria-label={`Avaliar com ${ratingValue} estrela${
                        ratingValue > 1 ? 's' : ''
                      }`}
                    >
                      <Star
                        className={cn(
                          'w-5 h-5 transition-colors',
                          isFilled
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/40',
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Favoritos
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-full transition-colors',
                    prompt.isFavorited
                      ? 'text-red-500 hover:text-red-400'
                      : 'text-muted-foreground hover:text-red-500',
                  )}
                  onClick={handleFavorite}
                  aria-label={
                    prompt.isFavorited
                      ? 'Remover dos favoritos'
                      : 'Adicionar aos favoritos'
                  }
                >
                  <Heart
                    className="w-4 h-4"
                    fill={prompt.isFavorited ? 'currentColor' : 'none'}
                  />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatFavoriteCount(prompt._count?.favorites || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Tag className="w-3.5 h-3.5" />
                <span>Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="uppercase text-[10px] tracking-wide border-border/60"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Conteúdo do Prompt</span>
              </div>
              <CopyButton
                value={prompt.content}
                size="sm"
                variant="outline"
                toastMessage="Prompt copiado para a área de transferência!"
              />
            </div>
            <ScrollArea className="max-h-[320px] rounded-xl border border-border/50 bg-muted/10 p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground">
                {prompt.content}
              </pre>
            </ScrollArea>
          </div>
        </div>

        {/* Sidebar */}
        <div className="border-t lg:border-l border-border/50 bg-muted/20">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Author */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Autor
              </h3>
              {prompt.user ? (
                <div className="glass-effect rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-semibold">
                    {prompt.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {prompt.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criado {formatRelativeTime(createdAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Autor desconhecido
                </p>
              )}
            </div>

            {/* Scope */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {scopeIcon}
                Visibilidade
              </h3>
              <div className="glass-effect rounded-xl p-4">
                <p className="text-sm font-medium text-foreground">
                  {scopeLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {prompt.scope === 'USER' &&
                    'Visível apenas para você.'}
                  {prompt.scope === 'ORGANIZATION' &&
                    'Disponível para todos da organização.'}
                  {prompt.scope === 'GLOBAL' &&
                    'Publicado na biblioteca global de prompts.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                onClick={() => onUse(prompt)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Usar este prompt
              </Button>
              {onToggleFavorite && (
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    'w-full',
                    prompt.isFavorited &&
                      'border-red-500 text-red-500 hover:bg-red-500/10',
                  )}
                  onClick={handleFavorite}
                >
                  <Heart
                    className="w-4 h-4 mr-2"
                    fill={prompt.isFavorited ? 'currentColor' : 'none'}
                  />
                  {prompt.isFavorited
                    ? 'Remover dos favoritos'
                    : 'Adicionar aos favoritos'}
                </Button>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground/80">
              Última atualização {formatRelativeTime(updatedAt)} • ID{' '}
              <span className="font-mono text-foreground/80">
                {prompt.id.slice(0, 12)}…
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 lg:px-8 lg:pt-8 space-y-2 border-b border-border/50">
          <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Detalhes do Prompt
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Explore todas as informações do prompt e utilize em suas conversas.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[85vh]">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}


