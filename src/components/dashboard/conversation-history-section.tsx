'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Search,
  X,
  Clock,
  Star,
  Archive,
  Trash2,
  Loader2,
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
import { cn } from '@/utils/cn'
import { useConversationHistory } from '@/hooks/useConversationHistory'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const router = useRouter()
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

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

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
  }

  const handleToggleArchived = async (
    e: React.MouseEvent,
    conversationId: string,
    currentArchived: boolean,
  ) => {
    e.stopPropagation()
    await toggleArchived(conversationId, currentArchived)
  }

  const getConversationPreview = (conversation: any) => {
    if (conversation.title) return conversation.title
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[0]
      return lastMessage.content.slice(0, 50) + '...'
    }
    return 'Nova conversa'
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Histórico</SidebarGroupLabel>
      <SidebarGroupContent className="space-y-2">
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

        {/* Filters */}
        <div className="flex items-center gap-2">
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

        {/* Conversation List */}
        <ScrollArea className="h-[400px]">
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
              {Object.entries(groupedConversations).map(([groupName, items]) =>
                items.length > 0 ? (
                  <div key={groupName}>
                    <p className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {groupName}
                    </p>
                    <div className="space-y-1">
                      <AnimatePresence mode="popLayout">
                        {items.map((conversation) => {
                          const isSelected =
                            currentConversationId === conversation.id
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
                              onClick={() =>
                                onConversationSelect(conversation.id)
                              }
                            >
                              <MessageSquare className="h-4 w-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate flex items-center">
                                  {preview}
                                  {conversation.starred && (
                                    <Star className="h-3 w-3 ml-2 text-yellow-500 fill-yellow-500" />
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
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
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
                                      'h-3 w-3',
                                      conversation.starred
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : '',
                                    )}
                                  />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) =>
                                    handleToggleArchived(
                                      e,
                                      conversation.id,
                                      conversation.archived || false,
                                    )
                                  }
                                >
                                  <Archive className="h-3 w-3" />
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
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </ScrollArea>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

