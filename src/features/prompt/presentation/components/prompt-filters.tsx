'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ALL_CATEGORIES, getCategoryIcon } from '../utils/prompt-helpers'
import { cn } from '@/utils/cn'

interface PromptFiltersProps {
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  showOnlyMine: boolean
  onToggleOnlyMine: (value: boolean) => void
}

export function PromptFilters({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  showOnlyMine,
  onToggleOnlyMine,
}: PromptFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar prompts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 glass-effect"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={showOnlyMine ? 'default' : 'outline'}
          onClick={() => onToggleOnlyMine(true)}
          size="sm"
        >
          Meus Prompts
        </Button>
        <Button
          variant={!showOnlyMine ? 'default' : 'outline'}
          onClick={() => onToggleOnlyMine(false)}
          size="sm"
        >
          Todos
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          onClick={() => onCategoryChange(null)}
          size="sm"
        >
          Todas
        </Button>
        <Button
          variant={selectedCategory === 'Popular' ? 'default' : 'outline'}
          onClick={() => onCategoryChange('Popular')}
          size="sm"
        >
          Popular
        </Button>
        {ALL_CATEGORIES.map((category) => {
          const Icon = getCategoryIcon(category)
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => onCategoryChange(category)}
              size="sm"
              className="whitespace-nowrap"
            >
              <Icon className="w-4 h-4 mr-2" />
              {category}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

