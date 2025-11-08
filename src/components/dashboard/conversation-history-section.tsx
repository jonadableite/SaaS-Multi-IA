'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  MessageSquare,
  Search,
  X,
  Star,
  Archive,
  Trash2,
  Loader2,
  MoreVertical,
  Pencil,
  FolderPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/utils/cn'
import { useConversationHistory } from '@/hooks/useConversationHistory'
import { api } from '@/igniter.client'

interface ConversationLike {
  id: string
  title?: string | null
  updatedAt?: string
  createdAt?: string
  starred?: boolean
  archived?: boolean
  messages?: Array<{
    role?: string
    content?: string
    model?: string
    provider?: string
  }>
}

function getProviderIconPath(provider?: string): string {
  if (!provider) return '/icon.svg'

  const providerLower = provider.toLowerCase()
  const iconMap: Record<string, string> = {
    whatlead: '/icon.svg',
    fusion: '/icon.svg',
    openai: '/gpt.png',
    anthropic: '/claude.png',
    google: '/gemini.png',
    cohere: '/cohere.png',
    meta: '/llama.png',
    deepseek: '/1bb72c07-4584-4e37-9cce-324f8b6a7d8d_deepseeklogo.png',
  }

  return iconMap[providerLower] || '/icon.svg'
}

function getAssistantMessage(conversation: ConversationLike) {
  return conversation.messages?.find(
    (msg) => msg.role?.toLowerCase() === 'assistant',
  )
}

function getConversationModelIcon(conversation: ConversationLike): string {
  const assistantMessage = getAssistantMessage(conversation)
  if (assistantMessage?.provider) {
    return getProviderIconPath(assistantMessage.provider)
  }
  if (assistantMessage?.model) {
    const modelLower = assistantMessage.model.toLowerCase()
    if (modelLower.includes('whatlead') || modelLower.includes('fusion')) {
      return getProviderIconPath('whatlead')
    }
    if (modelLower.includes('gpt') || modelLower.includes('o1')) {
      return getProviderIconPath('openai')
    }
    if (modelLower.includes('claude')) {
      return getProviderIconPath('anthropic')
    }
    if (modelLower.includes('gemini')) {
      return getProviderIconPath('google')
    }
    if (modelLower.includes('command')) {
      return getProviderIconPath('cohere')
    }
    if (modelLower.includes('llama')) {
      return getProviderIconPath('meta')
    }
    if (modelLower.includes('deepseek')) {
      return getProviderIconPath('deepseek')
    }
  }
  return '/icon.svg'
}

function getConversationModelId(conversation: ConversationLike): string {
  const assistantMessage = getAssistantMessage(conversation)
  return (assistantMessage?.model as string) || ''
}

function getModelColor(provider?: string): string {
  if (!provider) return 'bg-blue-500'

  const providerLower = provider.toLowerCase()
  const colorMap: Record<string, string> = {
    whatlead: 'bg-blue-500',
    fusion: 'bg-blue-500',
    openai: 'bg-green-500',
    anthropic: 'bg-orange-500',
    google: 'bg-purple-500',
    cohere: 'bg-pink-500',
    meta: 'bg-indigo-500',
    deepseek: 'bg-cyan-500',
  }

  return colorMap[providerLower] || 'bg-blue-500'
}

const MODEL_MAPPINGS: Array<{
  keywords: string[]
  label: string
  short: string
}> = [
  {
    keywords: ['whatlead', 'fusion'],
    label: 'WhatLead AI Fusion',
    short: 'WF',
  },
  { keywords: ['gpt-4o'], label: 'GPT-4o', short: '4O' },
  { keywords: ['gpt-4-turbo'], label: 'GPT-4 Turbo', short: 'G4' },
  { keywords: ['gpt-4'], label: 'GPT-4', short: 'G4' },
  { keywords: ['gpt-5'], label: 'GPT-5', short: 'G5' },
  { keywords: ['gpt-4o-mini'], label: 'GPT-4o Mini', short: '4M' },
  { keywords: ['claude-4.5'], label: 'Claude 4.5', short: 'C4' },
  { keywords: ['claude-3.5'], label: 'Claude 3.5', short: 'C3' },
  { keywords: ['claude-3'], label: 'Claude 3', short: 'C3' },
  { keywords: ['gemini-2.5'], label: 'Gemini 2.5', short: 'GM' },
  { keywords: ['gemini-1.5'], label: 'Gemini 1.5', short: 'GM' },
  { keywords: ['command-r'], label: 'Command R', short: 'CR' },
  { keywords: ['llama-4'], label: 'Llama 4', short: 'L4' },
  { keywords: ['deepseek'], label: 'DeepSeek', short: 'DS' },
]

function getProviderLabel(provider?: string): string {
  if (!provider) return 'WhatLead AI'
  const providerLower = provider.toLowerCase()
  const labels: Record<string, string> = {
    whatlead: 'WhatLead AI',
    fusion: 'WhatLead AI',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    cohere: 'Cohere',
    meta: 'Meta',
    deepseek: 'DeepSeek',
  }
  return labels[providerLower] || provider
}

function humanizeModelId(modelId: string): string {
  return modelId
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

function getModelDisplayName(provider?: string, modelId?: string): string {
  if (!modelId) return getProviderLabel(provider)
  const normalized = modelId.toLowerCase()
  for (const mapping of MODEL_MAPPINGS) {
    if (mapping.keywords.some((keyword) => normalized.includes(keyword))) {
      return mapping.label
    }
  }
  return humanizeModelId(modelId)
}

function getModelShortCode(provider?: string, modelId?: string): string {
  if (modelId) {
    const normalized = modelId.toLowerCase()
    const mapping = MODEL_MAPPINGS.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(keyword)),
    )
    if (mapping) return mapping.short
  }
  const providerLabel = getProviderLabel(provider)
  const initials =
    providerLabel
      .match(/\b[A-Za-z0-9]/g)
      ?.join('')
      .slice(0, 2)
      .toUpperCase() || 'AI'
  return initials
}

function getModelGradient(provider?: string): string {
  if (!provider) {
    return 'bg-gradient-to-br from-blue-500/70 via-blue-500/30 to-blue-600/80'
  }
  const providerLower = provider.toLowerCase()
  const gradients: Record<string, string> = {
    whatlead:
      'bg-gradient-to-br from-blue-500/70 via-blue-500/30 to-blue-600/80',
    fusion: 'bg-gradient-to-br from-blue-500/70 via-blue-500/30 to-blue-600/80',
    openai:
      'bg-gradient-to-br from-emerald-500/70 via-emerald-400/30 to-teal-500/80',
    anthropic:
      'bg-gradient-to-br from-orange-500/70 via-orange-400/30 to-amber-500/80',
    google:
      'bg-gradient-to-br from-purple-500/70 via-purple-400/30 to-indigo-500/80',
    cohere: 'bg-gradient-to-br from-pink-500/70 via-pink-400/30 to-rose-500/80',
    meta: 'bg-gradient-to-br from-indigo-500/70 via-indigo-400/30 to-blue-500/80',
    deepseek:
      'bg-gradient-to-br from-cyan-500/70 via-cyan-400/30 to-sky-500/80',
  }
  return (
    gradients[providerLower] ||
    'bg-gradient-to-br from-primary/60 via-primary/30 to-blue-500/60'
  )
}

/**
 * @component ConversationHistorySection
 * @description Seção de histórico de conversas integrada na sidebar principal
 */

interface ConversationHistorySectionProps {
  onConversationSelect: (id: string | null) => void
  currentConversationId: string | null
}

export function ConversationHistorySection({
  onConversationSelect,
  currentConversationId,
}: ConversationHistorySectionProps) {
  const {
    conversations,
    isLoading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    groupedConversations,
    toggleStarred,
    toggleArchived,
    deleteConversation,
  } = useConversationHistory()

  const [onlyStarred, setOnlyStarred] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState<string>('')
  const [favoriteOrder, setFavoriteOrder] = useState<string[]>([])

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load and persist favorite order in localStorage
  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('wl.favoriteOrder')
        : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        setFavoriteOrder(parsed)
      } catch {}
    }
  }, [])

  const persistFavoriteOrder = (order: string[]) => {
    setFavoriteOrder(order)
    try {
      window.localStorage.setItem('wl.favoriteOrder', JSON.stringify(order))
    } catch {}
  }

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
    e.stopPropagation()
    await deleteConversation(conversationId)

    if (currentConversationId === conversationId) {
      onConversationSelect(null)
    }
  }

  const handleToggleStarred = async (
    e: React.MouseEvent,
    conversationId: string,
    currentStarred: boolean,
  ) => {
    e.stopPropagation()
    await toggleStarred(conversationId, currentStarred)
    // Ensure newly starred items appear in favorite order at the top
    if (!currentStarred) {
      const next = [
        conversationId,
        ...favoriteOrder.filter((id) => id !== conversationId),
      ]
      persistFavoriteOrder(next)
    } else {
      const next = favoriteOrder.filter((id) => id !== conversationId)
      persistFavoriteOrder(next)
    }
  }

  const handleToggleArchived = async (
    e: React.MouseEvent,
    conversationId: string,
    currentArchived: boolean,
  ) => {
    e.stopPropagation()
    await toggleArchived(conversationId, currentArchived)
  }

  const handleRenameConversation = async (
    conversationId: string,
    newTitle: string,
  ) => {
    try {
      await api.conversation.update.mutate({
        params: { id: conversationId },
        body: { title: newTitle },
      })
    } catch (error) {
      console.error('Erro ao renomear conversa:', error)
    }
  }

  const handleMoveToFolder = async (
    conversationId: string,
    newFolder: string | null,
  ) => {
    try {
      await api.conversation.update.mutate({
        params: { id: conversationId },
        body: { category: newFolder },
      })
    } catch (error) {
      console.error('Erro ao mover conversa de pasta:', error)
    }
  }

  const availableFolders = useMemo(() => {
    const set = new Set<string>()
    conversations?.forEach((c) => {
      if (c.category) set.add(c.category)
    })
    return Array.from(set)
  }, [conversations])

  const getConversationProvider = (conversation: ConversationLike): string => {
    const assistantMessage = getAssistantMessage(conversation)
    if (assistantMessage?.provider) {
      return assistantMessage.provider
    }
    if (assistantMessage?.model) {
      const modelLower = assistantMessage.model.toLowerCase()
      if (modelLower.includes('whatlead') || modelLower.includes('fusion')) {
        return 'whatlead'
      }
      if (modelLower.includes('gpt') || modelLower.includes('o1')) {
        return 'openai'
      }
      if (modelLower.includes('claude')) {
        return 'anthropic'
      }
      if (modelLower.includes('gemini')) {
        return 'google'
      }
      if (modelLower.includes('command')) {
        return 'cohere'
      }
      if (modelLower.includes('llama')) {
        return 'meta'
      }
      if (modelLower.includes('deepseek')) {
        return 'deepseek'
      }
    }
    return 'whatlead'
  }

  const getProviderIconPath = (provider?: string) => {
    if (!provider) return '/logomodelo.png'
    const providerLower = provider.toLowerCase()
    const iconMap: Record<string, string> = {
      whatlead: '/logomodelo.png',
      fusion: '/logomodelo.png',
      openai: '/gpt.png',
      anthropic: '/claude.png',
      google: '/gemini.png',
      cohere: '/cohere.png',
      meta: '/llama.png',
      deepseek: '/1bb72c07-4584-4e37-9cce-324f8b6a7d8d_deepseeklogo.png',
    }
    return iconMap[providerLower] || '/logomodelo.png'
  }

  const getProviderColor = (provider?: string) => {
    if (!provider) return 'bg-blue-500'
    const providerLower = provider.toLowerCase()
    const colorMap: Record<string, string> = {
      whatlead: 'bg-blue-500',
      fusion: 'bg-blue-500',
      openai: 'bg-green-500',
      anthropic: 'bg-orange-500',
      google: 'bg-purple-500',
      cohere: 'bg-pink-500',
      meta: 'bg-indigo-500',
      deepseek: 'bg-cyan-500',
    }
    return colorMap[providerLower] || 'bg-blue-500'
  }

  const sortedConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return []
    }

    const base = [...conversations].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )

    // If only starred view, apply custom favorite order
    if (onlyStarred) {
      const starred = base.filter((c) => c.starred)
      const byOrder = starred.sort((a, b) => {
        const ai = favoriteOrder.indexOf(a.id)
        const bi = favoriteOrder.indexOf(b.id)
        const as = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
        const bs = bi === -1 ? Number.MAX_SAFE_INTEGER : bi
        return as - bs
      })
      return byOrder
    }

    return base
  }, [conversations, onlyStarred, favoriteOrder])

  const getConversationPreview = (conversation: ConversationLike) => {
    if (conversation.title) return conversation.title
    if (conversation.messages && conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find(
        (msg) => msg.role?.toLowerCase() === 'user',
      )
      if (firstUserMessage?.content) {
        return `${firstUserMessage.content.slice(0, 60)}...`
      }
    }
    return 'Nova conversa'
  }

  // Extract assistant providers used in the conversation
  const extractAssistantProviders = (
    conversation: ConversationLike,
  ): string[] => {
    const set = new Set<string>()
    conversation.messages?.forEach((msg) => {
      if (msg.role?.toLowerCase() === 'assistant') {
        const provider = msg.provider || getConversationProvider(conversation)
        set.add(provider)
      }
    })
    return Array.from(set)
  }

  const ModelIconsGroup = ({
    conversation,
  }: {
    conversation: ConversationLike
  }) => {
    const providers = extractAssistantProviders(conversation)
    const visibles = providers.slice(0, 2)
    const extra = providers.length - visibles.length
    return (
      <div className="flex items-center gap-1">
        {visibles.map((p, idx) => (
          <div
            key={`${conversation.id}-${p}-${idx}`}
            className="size-5 rounded-full overflow-hidden border border-border/40 bg-background"
          >
            <Image
              src={getProviderIconPath(p)}
              alt={getProviderLabel(p)}
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
        ))}
        {extra > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            +{extra}
          </span>
        )}
      </div>
    )
  }

  // Drag & drop handlers for favorites (active only in starred view)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const handleDragStart = (id: string) => setDragSourceId(id)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (targetId: string) => {
    if (!dragSourceId || dragSourceId === targetId) return
    const current = favoriteOrder.filter(Boolean)
    const withoutSource = current.filter((cid) => cid !== dragSourceId)
    const targetIndex = withoutSource.indexOf(targetId)
    const next = [
      ...withoutSource.slice(0, Math.max(0, targetIndex)),
      dragSourceId,
      ...withoutSource.slice(Math.max(0, targetIndex)),
    ]
    persistFavoriteOrder(next)
    setDragSourceId(null)
  }

  return (
    <SidebarGroup className="flex flex-col h-full">
      <SidebarGroupLabel>Histórico</SidebarGroupLabel>
      <SidebarGroupContent className="flex-1 min-h-0 flex flex-col">
        {/* Cabeçalho Fixo */}
        <div className="px-1 pt-1 pb-2">
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Select
              value={filters.dateRange}
              onValueChange={(v) =>
                setFilters({ ...filters, dateRange: v as any })
              }
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue placeholder="Intervalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={onlyStarred ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOnlyStarred(!onlyStarred)
                setFilters({ ...filters, starred: !onlyStarred })
              }}
              className="h-9"
            >
              <Star className="h-3 w-3" />
            </Button>
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowArchived(!showArchived)
                setFilters({ ...filters, archived: !showArchived })
              }}
              className="h-9"
            >
              <Archive className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Lista de Conversas com Scroll */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-2">
            {!isMounted ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Nenhuma conversa encontrada'
                    : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {/* Agrupamento por período temporal */}
                {['Hoje', 'Esta semana', 'Este mês', 'Mais antigos'].map(
                  (groupLabel) => {
                    const group =
                      groupedConversations[
                        groupLabel as keyof typeof groupedConversations
                      ] || []
                    if (!group || group.length === 0) return null
                    return (
                      <div key={groupLabel} className="space-y-2">
                        <div className="px-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {groupLabel}
                          </span>
                        </div>
                        <AnimatePresence mode="popLayout">
                          {group.map((conversation: ConversationLike) => {
                            const isSelected =
                              currentConversationId === conversation.id
                            const preview = getConversationPreview(conversation)
                            // Removido: exibição textual do nome do modelo/provedor no histórico

                            return (
                              <ContextMenu key={conversation.id}>
                                <ContextMenuTrigger asChild>
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={cn(
                                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all cursor-pointer',
                                      isSelected
                                        ? 'bg-primary/10 border-l-2 border-primary'
                                        : 'hover:bg-muted/40 border-l-2 border-transparent',
                                    )}
                                    onClick={() =>
                                      onConversationSelect(conversation.id)
                                    }
                                    draggable={
                                      onlyStarred && !!conversation.starred
                                    }
                                    onDragStart={() =>
                                      handleDragStart(conversation.id)
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(conversation.id)}
                                  >
                                    {/* Grupo de ícones dos modelos (20–24px) */}
                                    <ModelIconsGroup
                                      conversation={conversation}
                                    />

                                    {/* Título e descrição */}
                                    <div className="flex-1 min-w-0">
                                      {renamingId === conversation.id ? (
                                        <div className="flex items-center gap-2">
                                          <Input
                                            autoFocus
                                            value={renameValue}
                                            onChange={(e) =>
                                              setRenameValue(e.target.value)
                                            }
                                            className="h-8"
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={async (e) => {
                                              if (e.key === 'Enter') {
                                                await handleRenameConversation(
                                                  conversation.id,
                                                  renameValue.trim(),
                                                )
                                                setRenamingId(null)
                                              } else if (e.key === 'Escape') {
                                                setRenamingId(null)
                                              }
                                            }}
                                          />
                                          <Button
                                            size="sm"
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              await handleRenameConversation(
                                                conversation.id,
                                                renameValue.trim(),
                                              )
                                              setRenamingId(null)
                                            }}
                                          >
                                            Salvar
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <p
                                            className={cn(
                                              'text-sm font-semibold truncate flex items-center gap-2',
                                              isSelected
                                                ? 'text-primary'
                                                : 'text-foreground',
                                            )}
                                          >
                                            {preview}
                                            {conversation.starred && (
                                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                            )}
                                          </p>
                                          <p className="text-xs text-muted-foreground/80 truncate">
                                            {/* Modelo/Provider label removido do histórico conforme solicitação */}
                                          </p>
                                        </>
                                      )}
                                    </div>

                                    {/* Ações inline no hover */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setRenamingId(conversation.id)
                                          setRenameValue(preview)
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={(e) =>
                                          handleDeleteConversation(
                                            e,
                                            conversation.id,
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            onClick={(e) =>
                                              handleToggleStarred(
                                                e,
                                                conversation.id,
                                                conversation.starred || false,
                                              )
                                            }
                                          >
                                            <Star
                                              className={cn(
                                                'h-4 w-4 mr-2',
                                                conversation.starred
                                                  ? 'text-yellow-500 fill-yellow-500'
                                                  : '',
                                              )}
                                            />
                                            {conversation.starred
                                              ? 'Remover favorito'
                                              : 'Adicionar favorito'}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) =>
                                              handleToggleArchived(
                                                e,
                                                conversation.id,
                                                conversation.archived || false,
                                              )
                                            }
                                          >
                                            <Archive className="h-4 w-4 mr-2" />
                                            {conversation.archived
                                              ? 'Desarquivar'
                                              : 'Arquivar'}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={(e) =>
                                              handleDeleteConversation(
                                                e,
                                                conversation.id,
                                              )
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </motion.div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    onClick={() => {
                                      setRenamingId(conversation.id)
                                      setRenameValue(preview)
                                    }}
                                  >
                                    Renomear
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={async () => {
                                      const choice = window.prompt(
                                        'Mover para pasta (nome):',
                                        conversation.category || '',
                                      )
                                      if (choice !== null) {
                                        await handleMoveToFolder(
                                          conversation.id,
                                          choice.trim() || null,
                                        )
                                      }
                                    }}
                                  >
                                    Mover para pasta
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={(e) =>
                                      handleToggleStarred(
                                        e as unknown as React.MouseEvent,
                                        conversation.id,
                                        conversation.starred || false,
                                      )
                                    }
                                  >
                                    {conversation.starred
                                      ? 'Remover favorito'
                                      : 'Favoritar'}
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) =>
                                      handleDeleteConversation(
                                        e as unknown as React.MouseEvent,
                                        conversation.id,
                                      )
                                    }
                                  >
                                    Excluir
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
