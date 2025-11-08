'use client'

import { useState } from 'react'
import {
  ChevronDown,
  Check,
  Zap,
  Brain,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface Model {
  id: string
  name: string
  provider: string
  icon: React.ReactNode
  description: string
  tier: 'free' | 'pro' | 'premium'
  speed: 'fast' | 'medium' | 'slow'
  quality: 'good' | 'better' | 'best'
}

const models: Model[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Mais rápido e poderoso da OpenAI',
    tier: 'pro',
    speed: 'fast',
    quality: 'best',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    icon: <Brain className="w-4 h-4" />,
    description: 'Máxima qualidade e raciocínio',
    tier: 'pro',
    speed: 'medium',
    quality: 'best',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    icon: <Brain className="w-4 h-4" />,
    description: 'Melhor da Anthropic para tarefas complexas',
    tier: 'premium',
    speed: 'medium',
    quality: 'best',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    icon: <Zap className="w-4 h-4" />,
    description: 'Equilíbrio perfeito entre velocidade e qualidade',
    tier: 'pro',
    speed: 'fast',
    quality: 'better',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'IA multimodal do Google',
    tier: 'pro',
    speed: 'fast',
    quality: 'better',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    icon: <Zap className="w-4 h-4" />,
    description: 'Rápido e eficiente',
    tier: 'free',
    speed: 'fast',
    quality: 'good',
  },
]

interface ModelSelectorProps {
  selected: string
  onSelect: (modelId: string) => void
}

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedModel = models.find(m => m.id === selected) || models[0]

  const getTierBadge = (tier: Model['tier']) => {
    switch (tier) {
      case 'free':
        return <Badge variant="secondary">Grátis</Badge>
      case 'pro':
        return <Badge className="bg-blue-500">Pro</Badge>
      case 'premium':
        return <Badge className="bg-blue-600">Premium</Badge>
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[200px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-whatlead flex items-center justify-center text-white">
              {selectedModel.icon}
            </div>
            <span className="font-medium">{selectedModel.name}</span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[400px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Selecione o Modelo</span>
          <Badge variant="outline" className="text-xs">
            {models.length} modelos
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => {
                onSelect(model.id)
                setOpen(false)
              }}
              className={`p-3 cursor-pointer ${model.id === selected ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                }`}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-whatlead flex items-center justify-center text-white flex-shrink-0">
                  {model.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {model.name}
                    </span>
                    {getTierBadge(model.tier)}
                    {model.id === selected && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {model.description}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
