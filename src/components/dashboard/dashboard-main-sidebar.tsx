'use client'

import * as React from 'react'

import { Link } from 'next-view-transitions'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/ui/logo'
import { OrganizationDashboardSidebarSelector } from '@/@saas-boilerplate/features/organization/presentation/components/organization-dashboard-sidebar-selector'
import { BillingDashboardSidebarUpgradeCard } from '@/@saas-boilerplate/features/billing/presentation/components/billing-dashboard-sidebar-upgrade-card'
import { dashboardSidebarMenu } from '@/content/menus/dashboard'
import { UserDashboardSidebarDropdown } from '@/@saas-boilerplate/features/user/presentation/components/user-dashboard-sidebar-dropdown'
import { SearchIcon, Search, Star, Circle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommandDialog } from '@/components/ui/command-dialog'
import { useKeybind } from '@/@saas-boilerplate/hooks/use-keybind'
import { NotificationMenu } from '@/@saas-boilerplate/features/notification/presentation/components/notification-menu'
import { api } from '@/igniter.client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { useEffect, useState } from 'react'

export function DashboardMainSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [commandDialogOpen, setCommandDialogOpen] = React.useState(false)
  const isChatPage = pathname === '/app' || pathname?.startsWith('/app?')

  const isActive = (path: string) => pathname === path

  // Handle command+k shortcut
  useKeybind(
    'cmd+k',
    () => {
      setCommandDialogOpen(true)
    },
    [],
  )

  return (
    <Sidebar className={className}>
      <SidebarMenu>
        <SidebarHeader className="pl-6 pt-6 flex items-center justify-between">
          <span
            id="welcome_tour-presentation"
            className="flex items-center w-full justify-between"
          >
            <Logo size="full" />
            <div className="space-x-2 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setCommandDialogOpen(true)}
                title="Search (⌘K)"
              >
                <SearchIcon className="size-3" />
              </Button>
              <NotificationMenu />
              <UserDashboardSidebarDropdown />
            </div>
          </span>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup key="sidebar-toolbar" className="w-full">
            <SidebarGroupContent className="w-full">
              <OrganizationDashboardSidebarSelector />
            </SidebarGroupContent>
          </SidebarGroup>

          {dashboardSidebarMenu.groups.map(
            (group: {
              id: string
              name: string
              menu: Array<{
                id: string
                title: string
                url: string
                icon: React.ElementType
                items?: Array<{
                  id: string
                  title: string
                  href?: string
                  url?: string
                  icon?: React.ElementType
                }>
              }>
            }) => (
              <SidebarGroup key={group.id}>
                <SidebarGroupLabel>{group.name}</SidebarGroupLabel>
                <SidebarGroupContent>
                  {group.menu.map((item) =>
                    item.items ? (
                      <div id={item.id} key={item.id}>
                        <SidebarMenuSubButton id={`trigger_${item.id}`}>
                          <item.icon className="w-4 h-4" />
                          {item.title}
                        </SidebarMenuSubButton>
                        <SidebarMenuSub id={`sub_${item.id}`}>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem
                              active={isActive(subItem.href ?? '#')}
                              key={subItem.id}
                            >
                              <Link href={subItem.href || subItem.url || '#'}>
                                {subItem.icon && (
                                  <subItem.icon className="w-4 h-4" />
                                )}
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </div>
                    ) : (
                      <SidebarMenuItem
                        id={item.id}
                        active={isActive(item.url || '#')}
                        key={item.id}
                      >
                        <Link href={item.url || '#'} className="w-full">
                          <item.icon className="w-4 h-4" />
                          {item.title}
                        </Link>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            ),
          )}

          {/* Chat History Section - Only visible on chat page */}
          {isChatPage && (
            <ConversationHistorySection
              currentConversationId={searchParams.get('conversationId')}
              onSelectConversation={(id: string | null) => {
                if (id) {
                  router.push(`/app?conversationId=${id}`)
                } else {
                  router.push('/app')
                }
              }}
            />
          )}
        </SidebarContent>

        <SidebarFooter className="flex flex-col pt-0 h-auto space-y-4">
          <BillingDashboardSidebarUpgradeCard />
        </SidebarFooter>
      </SidebarMenu>

      <CommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
    </Sidebar>
  )
}

// Conversation History Component
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

function ConversationHistorySection({
  currentConversationId,
  onSelectConversation,
}: {
  currentConversationId: string | null
  onSelectConversation: (id: string | null) => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const { data: conversationsData, isLoading: isLoadingQuery } =
    api.conversation.list.useQuery()

  // Subscribe to realtime updates for conversation list
  // Temporarily disable realtime subscription to avoid invalid SSE channel errors

  useEffect(() => {
    if (
      conversationsData &&
      typeof conversationsData === 'object' &&
      'data' in conversationsData &&
      conversationsData.data
    ) {
      setConversations(conversationsData.data as any[])
      setLoading(false)
    }
    if (isLoadingQuery !== undefined) {
      setLoading(isLoadingQuery)
    }
  }, [conversationsData, isLoadingQuery])

  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Nova conversa').toLowerCase().includes(search.toLowerCase()),
  )

  const today = filteredConversations.filter((c) =>
    isToday(new Date(c.updatedAt)),
  )
  const thisWeek = filteredConversations.filter(
    (c) => !isToday(new Date(c.updatedAt)) && isThisWeek(new Date(c.updatedAt)),
  )

  return (
    <SidebarGroup className="border-t border-sidebar-border mt-auto">
      <SidebarGroupContent>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <SidebarGroupLabel className="text-sm font-semibold">
              Histórico
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const input = document.getElementById('conversation-search')
                input?.focus()
              }}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Input
            id="conversation-search"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <ScrollArea className="flex-1 max-h-[400px]">
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
                    currentId={currentConversationId}
                    onSelect={onSelectConversation}
                  />
                )}

                {thisWeek.length > 0 && (
                  <ConversationGroup
                    title="Esta Semana"
                    conversations={thisWeek}
                    currentId={currentConversationId}
                    onSelect={onSelectConversation}
                  />
                )}

                {filteredConversations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Nenhuma conversa encontrada</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SidebarGroupContent>
    </SidebarGroup>
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
  onSelect: (id: string | null) => void
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
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
  onSelect: (id: string | null) => void
}) {
  const hasStar = false // Can be enhanced later
  const preview = conversation.title || 'Nova conversa'

  return (
    <button
      className={cn(
        'w-full px-3 py-2 rounded-lg text-left transition-colors text-sm',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex items-center gap-2">
        {hasStar ? (
          <Star className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0" />
        ) : (
          <Circle className="w-4 h-4 text-primary flex-shrink-0" />
        )}
        <span className="truncate flex-1">{preview}</span>
      </div>
    </button>
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
