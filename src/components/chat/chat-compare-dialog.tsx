'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { api } from '@/igniter.client'
import { MessageSquare, Clock, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChatMessage } from './chat-message'

interface ChatCompareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConversationId: string | null
}

export function ChatCompareDialog({ open, onOpenChange, currentConversationId }: ChatCompareDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [compareWithId, setCompareWithId] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(searchQuery, 250)

  const { data: conversationsData, isLoading } = api.conversation.list.useQuery({
    search: debouncedSearch || undefined,
    limit: 50,
  })

  const conversations = conversationsData || []

  const { data: leftConv } = api.conversation.retrieve.useQuery(
    currentConversationId ? { params: { id: currentConversationId } } : undefined as any,
    { enabled: !!currentConversationId }
  )
  const { data: rightConv } = api.conversation.retrieve.useQuery(
    compareWithId ? { params: { id: compareWithId } } : undefined as any,
    { enabled: !!compareWithId }
  )

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setCompareWithId(null)
    }
  }, [open])

  const leftMessages = useMemo(() => mapMessages(leftConv?.messages || []), [leftConv])
  const rightMessages = useMemo(() => mapMessages(rightConv?.messages || []), [rightConv])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>Comparar conversas</DialogTitle>
          <DialogDescription>
            Veja duas threads lado a lado para analisar respostas e contextos.
          </DialogDescription>
        </DialogHeader>

        {/* Selector */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa para comparar..."
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

          <div className="mt-2 flex gap-2 overflow-x-auto">
            {(conversations || []).map((conv: any) => (
              <button
                key={conv.id}
                className={cn(
                  'shrink-0 rounded-lg border px-3 py-2 text-left',
                  compareWithId === conv.id ? 'border-primary bg-primary/10' : ''
                )}
                onClick={() => setCompareWithId(conv.id)}
                title={conv.title || 'Conversa'}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium truncate max-w-[220px]">
                    {conv.title || conv.messages?.[0]?.content?.slice(0, 50) || 'Conversa'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(conv.updatedAt || conv.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConversationColumn title={leftConv?.title || 'Conversa atual'} messages={leftMessages} />
          <ConversationColumn title={rightConv?.title || 'Selecione uma conversa'} messages={rightMessages} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConversationColumn({ title, messages }: { title: string; messages: Array<any> }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium truncate max-w-[280px]">{title}</span>
        </div>
        <Badge variant="outline" className="text-xs">{messages.length} msgs</Badge>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
          ) : (
            messages.map((m, idx) => <ChatMessage key={m.id} message={m} index={idx} />)
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

function mapMessages(messages: Array<any>) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
    model: m.model || undefined,
    provider: m.provider || undefined,
    timestamp: new Date(m.createdAt),
  }))
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}