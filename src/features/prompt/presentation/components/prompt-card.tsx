'use client'

import { Star, Heart, Eye, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Prompt } from '../../prompt.interface'
import {
  getCategoryIcon,
  getCategoryColor,
  getCategoryBgColor,
  truncateText,
  formatFavoriteCount,
  formatRelativeTime,
} from '../utils/prompt-helpers'
import { cn } from '@/utils/cn'

interface PromptCardProps {
  prompt: Prompt
  onUse: (prompt: Prompt) => void
  onView: (prompt: Prompt) => void
  onToggleFavorite?: (promptId: string) => void
  className?: string
}

export function PromptCard({
  prompt,
  onUse,
  onView,
  onToggleFavorite,
  className,
}: PromptCardProps) {
  const CategoryIcon = getCategoryIcon(prompt.category)
  const categoryColor = getCategoryColor(prompt.category)
  const categoryBgColor = getCategoryBgColor(prompt.category)

  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        'glass-effect hover:glass-effect-strong',
        'transition-all-smooth hover-lift',
        'border border-border/50',
        'animate-fade-in-up',
        className,
      )}
    >
      {/* Category Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
            'text-xs font-medium',
            categoryBgColor,
            categoryColor,
          )}
        >
          <CategoryIcon className="w-3 h-3" />
          <span>{prompt.category}</span>
        </div>
      </div>

      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(prompt.id)
          }}
          className={cn(
            'absolute top-3 left-3 z-10',
            'p-2 rounded-full',
            'glass-effect hover:glass-effect-strong',
            'transition-all-smooth',
            prompt.isFavorited
              ? 'text-red-500'
              : 'text-muted-foreground hover:text-red-500',
          )}
          aria-label={prompt.isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart
            className="w-4 h-4"
            fill={prompt.isFavorited ? 'currentColor' : 'none'}
          />
        </button>
      )}

      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 pr-8 line-clamp-2">
          {prompt.title}
        </h3>

        {/* Description */}
        {prompt.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {truncateText(prompt.description, 120)}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {/* Rating */}
          {prompt.averageRating && prompt.averageRating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{prompt.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground/60">
                ({prompt._count?.ratings || 0})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-muted-foreground/60">Sem avaliações</span>
            </div>
          )}

          {/* Favorites Count */}
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            <span>{formatFavoriteCount(prompt._count?.favorites || 0)}</span>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-1 ml-auto">
            <span>{formatRelativeTime(new Date(prompt.createdAt))}</span>
          </div>
        </div>

        {/* Author */}
        {prompt.user && (
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {prompt.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {prompt.user.name}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => onUse(prompt)}
            className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Usar
          </Button>
          <Button onClick={() => onView(prompt)} variant="outline" size="icon">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

