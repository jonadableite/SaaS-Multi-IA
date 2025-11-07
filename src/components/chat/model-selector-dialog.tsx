'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { X, Search, ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'

interface Model {
  id: string
  name: string
  provider: string
  iconPath: string
  description: string
  category: 'fast' | 'advanced' | 'reasoning'
  tier?: 'free' | 'pro' | 'premium'
}

// Helper function to get icon path by provider
function getProviderIcon(provider: string): string {
  const providerIcons: Record<string, string> = {
    OpenAI: '/gpt.png',
    Anthropic: '/claude.png',
    Google: '/gemini.png',
    Cohere: '/cohere.png',
    Meta: '/llama.png',
    DeepSeek: '/1bb72c07-4584-4e37-9cce-324f8b6a7d8d_deepseeklogo.png',
  }
  return providerIcons[provider] || '/icon.svg'
}

const models: Model[] = [
  // Rápido
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Respostas instantâneas para o dia a dia',
    category: 'fast',
    tier: 'free',
  },
  {
    id: 'gpt-oss',
    name: 'GPT OSS',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Open source e rápido',
    category: 'fast',
    tier: 'free',
  },
  {
    id: 'claude-4.5-haiku',
    name: 'Claude 4.5 Haiku',
    provider: 'Anthropic',
    iconPath: getProviderIcon('Anthropic'),
    description: 'Velocidade extrema com qualidade',
    category: 'fast',
    tier: 'pro',
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'Cohere',
    iconPath: getProviderIcon('Cohere'),
    description: 'Rápido e eficiente para tarefas gerais',
    category: 'fast',
    tier: 'pro',
  },
  {
    id: 'llama-4-scout',
    name: 'Llama 4 Scout',
    provider: 'Meta',
    iconPath: getProviderIcon('Meta'),
    description: 'Modelo rápido e compacto',
    category: 'fast',
    tier: 'free',
  },
  {
    id: 'deepseek-3.1',
    name: 'Deepseek 3.1',
    provider: 'DeepSeek',
    iconPath: getProviderIcon('DeepSeek'),
    description: 'Velocidade otimizada',
    category: 'fast',
    tier: 'free',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Versão rápida do GPT-4o',
    category: 'fast',
    tier: 'pro',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    iconPath: getProviderIcon('Google'),
    description: 'Flash mode para respostas instantâneas',
    category: 'fast',
    tier: 'pro',
  },
  // Avançados
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Mais rápido e poderoso da OpenAI',
    category: 'advanced',
    tier: 'pro',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Máxima qualidade e versatilidade',
    category: 'advanced',
    tier: 'pro',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    iconPath: getProviderIcon('Anthropic'),
    description: 'Equilíbrio perfeito entre velocidade e qualidade',
    category: 'advanced',
    tier: 'pro',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    iconPath: getProviderIcon('Google'),
    description: 'Multimodal avançado do Google',
    category: 'advanced',
    tier: 'pro',
  },
  // Raciocínio Profundos
  {
    id: 'claude-4.5-sonnet-thinking',
    name: 'Claude 4.5 Sonnet Thinking',
    provider: 'Anthropic',
    iconPath: getProviderIcon('Anthropic'),
    description: 'Raciocínio profundo com pensamento explícito',
    category: 'reasoning',
    tier: 'premium',
  },
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Raciocínio avançado com planejamento',
    category: 'reasoning',
    tier: 'premium',
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    provider: 'OpenAI',
    iconPath: getProviderIcon('OpenAI'),
    description: 'Versão compacta com raciocínio profundo',
    category: 'reasoning',
    tier: 'premium',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    iconPath: getProviderIcon('Anthropic'),
    description: 'Melhor da Anthropic para tarefas complexas',
    category: 'reasoning',
    tier: 'premium',
  },
]

interface ModelSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedModel: string
  onSelectModel: (modelId: string) => void
}

export function ModelSelectorDialog({
  open,
  onOpenChange,
  selectedModel,
  onSelectModel,
}: ModelSelectorDialogProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('models')

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models

    const query = search.toLowerCase()
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query),
    )
  }, [search])

  const fastModels = filteredModels.filter((m) => m.category === 'fast')
  const advancedModels = filteredModels.filter((m) => m.category === 'advanced')
  const reasoningModels = filteredModels.filter(
    (m) => m.category === 'reasoning',
  )

  const selectedModelData = models.find((m) => m.id === selectedModel)

  const getTierBadge = (tier?: string) => {
    if (!tier) return null
    switch (tier) {
      case 'free':
        return <Badge variant="secondary">Grátis</Badge>
      case 'pro':
        return <Badge className="bg-blue-500">Pro</Badge>
      case 'premium':
        return <Badge className="bg-purple-500">Premium</Badge>
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Selecionar Modelo
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 pt-4 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="models">Modelos de IA</TabsTrigger>
              <TabsTrigger value="assistants">Assistentes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="models"
            className="flex-1 flex flex-col min-h-0 mt-0"
          >
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-8">
                {/* Rápido ⚡ */}
                {fastModels.length > 0 && (
                  <ModelCategory
                    title="Rápido "
                    description="Respostas instantâneas para o dia a dia, com foco em velocidade e eficiência"
                    iconPath="/fasterModels.svg"
                    models={fastModels}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    getTierBadge={getTierBadge}
                  />
                )}

                {/* Avançados */}
                {advancedModels.length > 0 && (
                  <ModelCategory
                    title="Avançados"
                    description="Modelos de alta qualidade para tarefas complexas e análises profundas"
                    iconPath="/advancedModels.svg"
                    models={advancedModels}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    getTierBadge={getTierBadge}
                  />
                )}

                {/* Raciocínio Profundos */}
                {reasoningModels.length > 0 && (
                  <ModelCategory
                    title="Raciocínio Profundos"
                    description="Modelos especializados em raciocínio lógico, planejamento e resolução de problemas complexos"
                    models={reasoningModels}
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    getTierBadge={getTierBadge}
                  />
                )}

                {filteredModels.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhum modelo encontrado
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="assistants"
            className="flex-1 flex flex-col min-h-0 mt-0"
          >
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">Assistentes em breve</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer - Selected Model */}
        {selectedModelData && (
          <div className="border-t px-6 py-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden">
                  <Image
                    src={selectedModelData.iconPath}
                    alt={selectedModelData.provider}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selectedModelData.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedModelData.provider}
                  </p>
                </div>
              </div>
              <Button onClick={() => onOpenChange(false)}>Confirmar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ModelCategory({
  title,
  description,
  iconPath,
  models,
  selectedModel,
  onSelectModel,
  getTierBadge,
}: {
  title: string
  description: string
  iconPath?: string
  models: Model[]
  selectedModel: string
  onSelectModel: (id: string) => void
  getTierBadge: (tier?: string) => React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {iconPath && (
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src={iconPath}
              alt={title}
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="space-y-2">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group',
              selectedModel === model.id
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-card hover:bg-muted border-2 border-transparent',
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden',
                selectedModel === model.id
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'bg-muted',
              )}
            >
              <Image
                src={model.iconPath}
                alt={model.provider}
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{model.name}</span>
                {getTierBadge(model.tier)}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {model.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: Show model info
                }}
                aria-label="Informações do modelo"
                asChild
              >
                <span>
                  <Info className="w-4 h-4" />
                </span>
              </Button>
              {selectedModel === model.id && (
                <ChevronRight className="w-5 h-5 text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
