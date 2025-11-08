'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
  Star,
  Archive,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'
import { api } from '@/igniter.client'
import { ChatSidebarFooter } from './chat-sidebar-footer'

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
  createdAt: string
  messages?: Array<{
    id: string
    role: string
    content: string
    model?: string
    provider?: string
  }>
  category?: string | null
  tags?: string[]
  starred?: boolean
  archived?: boolean
}

// Helper function to get provider icon path
function getProviderIconPath(provider?: string): string {
  if (!provider) return '/logomodelo.png'

  const providerLower = provider.toLowerCase()
  const iconMap: Record<string, string> = {
    whatlead: '/icon.svg',
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

// Helper function to get model icon from conversation
function getConversationModelIcon(conversation: Conversation): string {
  // Try to get model from first assistant message
  if (conversation.messages && conversation.messages.length > 0) {
    const assistantMessage = conversation.messages.find(
      (msg) => msg.role === 'assistant' || msg.role === 'ASSISTANT',
    )
    if (assistantMessage?.provider) {
      return getProviderIconPath(assistantMessage.provider)
    }
    if (assistantMessage?.model) {
      // Extract provider from model name
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
  }
  // Default icon
  return '/icon.svg'
}

// Helper function to get model color based on provider
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

interface ChatConversationsSidebarProps {
  className?: string
  onConversationSelect?: (conversationId: string | null) => void
}

export function ChatConversationsSidebar({
  className,
  onConversationSelect,
}: ChatConversationsSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<
    'all' | 'today' | 'week' | 'month'
  >('all')
  const [onlyStarred, setOnlyStarred] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(searchParams.get('conversationId'))

  // Get user session for plan info
  const { data: sessionData } = api.auth.getSession.useQuery()
  const userPlan =
    (sessionData as any)?.data?.user?.userPlan ||
    (sessionData as any)?.user?.userPlan ||
    'FREE'

  // Load conversations with realtime updates - using same approach as useConversationHistory
  const debouncedSearch = useDebouncedValue(searchQuery, 250)
  const { data: conversationsData, isLoading: isLoadingQuery, error } =
    // @ts-expect-error - Igniter.js query types may not match exactly
    api.conversation.list.useQuery({
      search: debouncedSearch || undefined,
      dateRange,
      starred: onlyStarred ? true : undefined,
      // Only filter archived when explicitly set to true
      archived: showArchived ? true : undefined,
    })

  // Extract conversations from API response
  useEffect(() => {
    console.log(
      '[ChatConversationsSidebar] 🔍 Raw API response:',
      conversationsData,
    )
    console.log('[ChatConversationsSidebar] 🔍 isLoadingQuery:', isLoadingQuery)
    console.log('[ChatConversationsSidebar] 🔍 error:', error)

    // Extract conversations array from various possible response formats
    let extractedConversations: Conversation[] = []

    if (conversationsData) {
      const response = conversationsData as any

      // Strategy 1: Check if response has .data property that is an array
      if (response?.data) {
        const data = response.data
        console.log('[ChatConversationsSidebar] 🔍 Found .data property:', data)
        console.log(
          '[ChatConversationsSidebar] 🔍 Is array?',
          Array.isArray(data),
        )

        if (Array.isArray(data)) {
          extractedConversations = data as Conversation[]
        } else if (
          data &&
          typeof data === 'object' &&
          Array.isArray(data.conversations)
        ) {
          extractedConversations = data.conversations as Conversation[]
        }
      }
      // Strategy 2: Check if response is directly an array
      else if (Array.isArray(conversationsData)) {
        console.log(
          '[ChatConversationsSidebar] 🔍 Response is directly an array',
        )
        extractedConversations = conversationsData as Conversation[]
      }
      // Strategy 3: Check for nested structure
      else if (
        response?.conversations &&
        Array.isArray(response.conversations)
      ) {
        console.log(
          '[ChatConversationsSidebar] 🔍 Found .conversations property',
        )
        extractedConversations = response.conversations as Conversation[]
      }

      console.log(
        '[ChatConversationsSidebar] ✅ Extracted conversations:',
        extractedConversations,
      )
      console.log(
        '[ChatConversationsSidebar] ✅ Count:',
        extractedConversations.length,
      )

      if (extractedConversations.length > 0) {
        console.log(
          '[ChatConversationsSidebar] ✅ First conversation:',
          extractedConversations[0],
        )
      }
    } else {
      console.log(
        '[ChatConversationsSidebar] ⚠️ conversationsData is null/undefined',
      )
    }

    setConversations(extractedConversations)
    setIsLoading(isLoadingQuery)

    if (error) {
      console.error(
        '[ChatConversationsSidebar] ❌ Error loading conversations:',
        error,
      )
    }
  }, [conversationsData, isLoadingQuery, error])

  // Sort conversations by most recent first (already sorted by API)
  const sortedConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return []
    }
    // API already returns sorted by updatedAt desc, but just to be safe
    return [...conversations].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )
  }, [conversations])

  const handleNewConversation = () => {
    setSelectedConversationId(null)
    router.push('/app')
    onConversationSelect?.(null)
  }

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    router.push(`/app?conversationId=${conversationId}`)
    onConversationSelect?.(conversationId)
  }

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
    e.stopPropagation()

    try {
      await api.conversation.delete.mutate({
        params: { id: conversationId },
      })

      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId),
      )

      if (selectedConversationId === conversationId) {
        handleNewConversation()
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const toggleStarred = async (
    e: React.MouseEvent,
    conversation: Conversation,
  ) => {
    e.stopPropagation()
    try {
      await api.conversation.update.mutate({
        params: { id: conversation.id },
        body: { starred: !conversation.starred },
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversation.id ? { ...c, starred: !c.starred } : c,
        ),
      )
    } catch (error) {
      console.error('Error toggling starred:', error)
    }
  }

  const toggleArchived = async (
    e: React.MouseEvent,
    conversation: Conversation,
  ) => {
    e.stopPropagation()
    try {
      await api.conversation.update.mutate({
        params: { id: conversation.id },
        body: { archived: !conversation.archived },
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversation.id ? { ...c, archived: !c.archived } : c,
        ),
      )
    } catch (error) {
      console.error('Error toggling archived:', error)
    }
  }

  const getConversationPreview = (conversation: Conversation) => {
    if (conversation.title) return conversation.title
    if (conversation.messages && conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find(
        (msg) => msg.role === 'user' || msg.role === 'USER',
      )
      if (firstUserMessage) {
        return firstUserMessage.content.slice(0, 60) + '...'
      }
    }
    return 'Nova conversa'
  }

  const getConversationProvider = (conversation: Conversation): string => {
    if (conversation.messages && conversation.messages.length > 0) {
      const assistantMessage = conversation.messages.find(
        (msg) => msg.role === 'assistant' || msg.role === 'ASSISTANT',
      )
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
    }
    return 'whatlead' // Default
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-muted/30',
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNewConversation}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 bg-background/50 border-border/50"
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

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="h-9 w-40">
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
            onClick={() => setOnlyStarred((v) => !v)}
            className="h-9"
          >
            <Star className="h-4 w-4 mr-2" />
            Favoritos
          </Button>
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            className="h-9"
          >
            <Archive className="h-4 w-4 mr-2" />
            Arquivados
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
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
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleNewConversation}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova conversa
              </Button>
            )}
          </div>
        ) : (
          <div className="px-2 py-3">
            <AnimatePresence mode="popLayout">
              {sortedConversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation.id
                const preview = getConversationPreview(conversation)
                const provider = getConversationProvider(conversation)
                const modelIcon = getConversationModelIcon(conversation)
                const modelColor = getModelColor(provider)

                return (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1 transition-all cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-muted/40 border-l-2 border-transparent',
                    )}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    {/* Model Icon - Circular with colored background */}
                    <div
                      className={cn(
                        'relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden',
                        modelColor,
                      )}
                    >
                      <Image
                        src={modelIcon}
                        alt={provider}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>

                    {/* Conversation Title */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {preview}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStarred(e as any, conversation)
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleArchived(e as any, conversation)
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {conversation.archived ? 'Desarquivar' : 'Arquivar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteConversation(e as any, conversation.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Footer with Plan and Credits */}
      <ChatSidebarFooter userPlan={userPlan} />
    </div>
  )
}

// Simple hook to debounce values without external libs
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

