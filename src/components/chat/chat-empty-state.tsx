'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { ChatInput } from './chat-input'

interface ChatEmptyStateProps {
  onPromptSelect?: (prompt: string) => void
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  onSend?: (message: string, attachments?: File[]) => void
  isLoading?: boolean
  onStop?: () => void
  isMobile?: boolean
}

// Removido: sugestões pré-definidas de prompts

const featuredModels = [
  {
    id: 'whatlead-fusion',
    name: 'WhatLead AI Fusion',
    icon: '/logomodelo.png',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    icon: '/gpt.png',
  },
  {
    id: 'claude-4.5-sonnet-thinking',
    name: 'Claude 4.5 Sonnet Thinking',
    icon: '/claude.png',
  },
]

export function ChatEmptyState({
  onPromptSelect,
  selectedModel,
  onModelChange,
  onSend,
  isLoading,
  onStop,
  isMobile
}: ChatEmptyStateProps) {
  // Removido: estado para hover das sugestões

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
      {/* Main Content Container */}
      <div className="w-full max-w-3xl mx-auto space-y-8 flex flex-col items-center justify-center flex-1">

        {/* Header - Logo e Título */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            WhatLead IA
          </h1>
        </div>

        {/* Model Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {featuredModels.map((model) => (
            <Button
              key={model.id}
              variant="outline"
              onClick={() => onModelChange?.(model.id)}
              className={cn(
                'h-11 px-4 rounded-full border-2 transition-all',
                selectedModel === model.id
                  ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                  : 'border-border/50 hover:border-border bg-background/50 hover:bg-background'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 relative">
                  <Image
                    src={model.icon}
                    alt={model.name}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-medium">{model.name}</span>
              </div>
            </Button>
          ))}

          {/* Ver todos os modelos */}
          <Button
            variant="outline"
            onClick={() => {
              // Trigger model selector dialog
              const event = new CustomEvent('open-model-selector')
              window.dispatchEvent(event)
            }}
            className="h-11 px-4 rounded-full border-2 border-border/50 hover:border-border bg-background/50 hover:bg-background"
          >
            <span className="text-sm font-medium">Ver todos os 28 modelos</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Removido: bloco de sugestões de prompts */}

        {/* Centralized Chat Input */}
        <div className="w-full pt-8">
          <ChatInput
            onSend={onSend || (() => { })}
            isLoading={isLoading || false}
            onStop={onStop || (() => { })}
            isMobile={isMobile || false}
            selectedModel={selectedModel || 'whatlead-fusion'}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  )
}

