'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  FileText,
  Users,
  MoreHorizontal,
  Search,
  Folder,
  GraduationCap,
  HelpCircle,
  Star,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { api } from '@/igniter.client'
import { formatDistanceToNow } from 'date-fns'
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
}

interface SidebarProps {
  currentConversation: string | null
  onSelectConversation: (id: string) => void
  onClose: () => void
  isMobile: boolean
}

export function Sidebar({
  currentConversation,
  onSelectConversation,
  onClose,
  isMobile,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('chat')

  const { data: conversationsData, isLoading: isLoadingQuery } =
    api.conversation.list.useQuery()

  // Temporarily disable realtime subscription to avoid invalid SSE channel errors
  // Revalidation hooks on mutations/streaming will keep the list updated

  useEffect(() => {
    if (conversationsData?.data) {
      setConversations(conversationsData.data as any[])
      setLoading(false)
    }
    if (isLoadingQuery !== undefined) {
      setLoading(isLoadingQuery)
    }
  }, [conversationsData, isLoadingQuery])

  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Nova conversa')
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const today = filteredConversations.filter((c) =>
    isToday(new Date(c.updatedAt)),
  )
  const thisWeek = filteredConversations.filter(
    (c) =>
      !isToday(new Date(c.updatedAt)) &&
      isThisWeek(new Date(c.updatedAt)),
  )

  const menuItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'prompts', label: 'Prompts', icon: FileText },
    { id: 'assistants', label: 'Assistentes', icon: Users },
    { id: 'more', label: 'Mais', icon: MoreHorizontal },
  ]

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Top Section - Logo/Icon and Title */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-primary"></div>
            <div className="absolute w-1 h-1 rounded-full bg-primary translate-x-1 translate-y-1"></div>
          </div>
        </div>
        <h1 className="text-center text-lg font-semibold text-sidebar-foreground">
          Chat com IA
        </h1>
      </div>

      {/* Navigation Menu */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* History Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-sidebar-foreground">
              Histórico
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-foreground/70"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 py-2 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {today.length > 0 && (
                  <ConversationGroup
                    title="Hoje"
                    conversations={today}
                    currentId={currentConversation}
                    onSelect={onSelectConversation}
                  />
                )}

                {thisWeek.length > 0 && (
                  <ConversationGroup
                    title="Esta Semana"
                    conversations={thisWeek}
                    currentId={currentConversation}
                    onSelect={onSelectConversation}
                  />
                )}

                {filteredConversations.length === 0 && (
                  <div className="text-center py-8 text-sidebar-foreground/50">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Nenhuma conversa encontrada</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border p-4 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          <Folder className="w-5 h-5" />
          <span className="text-sm font-medium">Projetos</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          <GraduationCap className="w-5 h-5" />
          <span className="text-sm font-medium">Cursos</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="mt-4 flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[8px]">
              Z
            </span>
            70 FREE
          </div>
        </div>
      </div>
    </div>
  )
}

function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect,
}: {
  title: string
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === currentId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: Conversation
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const hasStar = conversation.id === 'active' // Example logic for starred
  const preview = conversation.title || 'Nova conversa'

  return (
    <div
      className={cn(
        'group relative px-3 py-2 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/70',
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex items-center gap-2">
        {hasStar ? (
          <Star className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0" />
        ) : (
          <Circle className="w-4 h-4 text-primary flex-shrink-0" />
        )}
        <span className="text-sm truncate flex-1">{preview}</span>
      </div>
    </div>
  )
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isThisWeek(date: Date): boolean {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  return date >= weekAgo && date < today
}

