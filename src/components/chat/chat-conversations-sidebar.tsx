'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
  Clock,
  Star,
  Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { api } from '@/igniter.client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
  createdAt: string
  messages?: Array<{
    id: string
    role: string
    content: string
  }>
  category?: string | null
  tags?: string[]
  starred?: boolean
  archived?: boolean
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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [onlyStarred, setOnlyStarred] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(searchParams.get('conversationId'))

  // Load conversations with realtime updates
  const debouncedSearch = useDebouncedValue(searchQuery, 250)
  const { data: conversationsData, isLoading: isLoadingQuery } =
    api.conversation.list.useQuery({
      search: debouncedSearch || undefined,
      dateRange,
      starred: onlyStarred ? true : undefined,
      archived: showArchived ? true : undefined,
    })

  // Temporarily disable realtime subscription to avoid invalid SSE channel errors
  // Revalidation hooks on mutations/streaming will keep the list updated

  useEffect(() => {
    if (conversationsData?.data) {
      setConversations(conversationsData.data)
    }
    setIsLoading(isLoadingQuery)
  }, [conversationsData, isLoadingQuery])

  // Group by date for navigable sections
  const groupedConversations = useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      Hoje: [],
      'Esta semana': [],
      'Este mês': [],
      'Mais antigos': [],
    }
    const now = new Date()
    conversations.forEach((conv) => {
      const d = new Date(conv.updatedAt || conv.createdAt)
      const isToday = d.toDateString() === now.toDateString()
      const startOfWeek = new Date(now)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      if (isToday) groups['Hoje'].push(conv)
      else if (d >= startOfWeek) groups['Esta semana'].push(conv)
      else if (d >= startOfMonth) groups['Este mês'].push(conv)
      else groups['Mais antigos'].push(conv)
    })
    return groups
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
      const lastMessage = conversation.messages[0]
      return lastMessage.content.slice(0, 50) + '...'
    }
    return 'Nova conversa'
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-muted/30',
        className,
      )}
    >
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNewConversation}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
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

        {/* Filtros */}
        <div className="mt-3 flex items-center gap-2">
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
        ) : conversations.length === 0 ? (
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
          <div className="p-2 space-y-4">
            {Object.entries(groupedConversations).map(([groupName, items]) => (
              <div key={groupName}>
                <p className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {groupName}
                </p>
                <div className="space-y-1">
                  <AnimatePresence mode="popLayout">
                    {items.map((conversation) => {
                      const isSelected = selectedConversationId === conversation.id
                      const preview = getConversationPreview(conversation)
                      const lastUpdate = new Date(conversation.updatedAt)

                      return (
                        <motion.div
                          key={conversation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            'group relative flex items-center gap-2 rounded-lg p-2 transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted/50',
                          )}
                          onClick={() => handleSelectConversation(conversation.id)}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate flex items-center">
                              {preview}
                              {conversation.starred && (
                                <Star className="h-3 w-3 ml-2 text-yellow-500" />
                              )}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(lastUpdate, "dd MMM 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => toggleStarred(e, conversation)}
                            >
                              <Star className={cn('h-3 w-3', conversation.starred ? 'text-yellow-500' : '')} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => toggleArchived(e, conversation)}
                            >
                              <Archive className={cn('h-3 w-3', conversation.archived ? 'text-muted-foreground' : '')} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) =>
                                handleDeleteConversation(e, conversation.id)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
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

