'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Sparkles,
  Loader2,
  Settings2,
  Image as ImageIcon,
  Paperclip,
  X,
  ChevronDown,
  GitCompare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { ChatMessage } from './chat-message'
import { ModelSelector } from './model-selector'
import { ChatConversationsSidebar } from './chat-conversations-sidebar'
import { ChatCompareDialog } from './chat-compare-dialog'
import { api } from '@/igniter.client'
import type { ChatMessageBody } from '@/features/message/message.interface'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  provider?: string
  timestamp: Date
  attachments?: Array<{ type: string; url: string; name?: string }>
}

interface ChatContainerProps {
  conversationId?: string | null
  initialMessages?: Message[]
}

export function ChatContainer({
  conversationId,
  initialMessages = [],
}: ChatContainerProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<
    'openai' | 'anthropic' | 'google'
  >('openai')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId || null)
  const [attachments, setAttachments] = useState<
    Array<{ file: File; preview: string }>
  >([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [showNewIndicator, setShowNewIndicator] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Models available per provider
  const models = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    google: [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
  }

  // Set default model when provider changes
  useEffect(() => {
    if (!selectedModel && models[selectedProvider].length > 0) {
      setSelectedModel(models[selectedProvider][0])
    }
  }, [selectedProvider, selectedModel])

  // Update messages when conversation changes
  useEffect(() => {
    setMessages(initialMessages)
  }, [conversationId, initialMessages])

  // Track scroll position and smart auto-scroll
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null

    if (!viewport) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
      const atBottom = distanceToBottom < 60
      setIsAtBottom(atBottom)
      if (atBottom) {
        setShowNewIndicator(false)
        setNewMessageCount(0)
      }
    }

    viewport.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null
    if (!viewport) return

    if (isAtBottom) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
    } else {
      setShowNewIndicator(true)
      setNewMessageCount((c) => c + 1)
    }
  }, [messages, streamingContent, isAtBottom])

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior })
  }

  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null
    if (!viewport) return
    viewport.scrollTo({ top: 0, behavior })
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200,
      )}px`
    }
  }, [input])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setAttachments((prev) => [
            ...prev,
            {
              file,
              preview: event.target?.result as string,
            },
          ])
        }
        reader.readAsDataURL(file)
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            file,
            preview: '',
          },
        ])
      }
    })
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      attachments:
        attachments.length > 0
          ? attachments.map((att) => ({
            type: att.file.type,
            url: att.preview || URL.createObjectURL(att.file),
            name: att.file.name,
          }))
          : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setAttachments([])
    setIsLoading(true)
    setIsStreaming(false)
    setStreamingContent('')

    // Create placeholder for assistant message
    const assistantMessageId = `msg-${Date.now() + 1}`
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ])

    try {
      const chatBody: ChatMessageBody = {
        content: userMessage.content,
        conversationId: currentConversationId || undefined,
        provider: selectedProvider,
        model: selectedModel,
        stream: true, // Enable streaming
      }

      // For now, use regular mutation (we'll implement SSE streaming separately)
      const response = await api.chat.send.mutate(chatBody)

      if (response.data) {
        setCurrentConversationId(response.data.conversationId)

        // Update assistant message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: response.data!.content,
                model: response.data!.model,
                provider: response.data!.provider,
              }
              : msg,
          ),
        )

        // Update URL with conversation ID
        if (response.data.conversationId) {
          router.push(`/app?conversationId=${response.data.conversationId}`)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessageId),
      )
      const errorMessage: Message = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content:
          'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleConversationSelect = (convId: string | null) => {
    setCurrentConversationId(convId)
    setMessages([])
    if (convId) {
      router.push(`/app?conversationId=${convId}`)
    } else {
      router.push('/app')
    }
  }

  return (
    <div className="relative flex h-full w-full bg-background">
      {/* Ambient futuristic glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-muted/20 blur-3xl" />
      </div>
      {/* Conversations Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <ChatConversationsSidebar
          onConversationSelect={handleConversationSelect}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 min-h-0 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b bg-background/80 backdrop-blur-sm shrink-0"
        >
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Chat Multi-IA
                </h1>
                <p className="text-xs text-muted-foreground">
                  {messages.filter((m) => m.role === 'user').length} mensagens
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModelSelector
                provider={selectedProvider}
                model={selectedModel}
                onProviderChange={setSelectedProvider}
                onModelChange={setSelectedModel}
                models={models}
              />
              <Button variant="ghost" size="icon" onClick={() => setIsCompareOpen(true)} aria-label="Comparar conversas">
                <GitCompare className="h-4 w-4" />
              </Button>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurações do Chat</DialogTitle>
                    <DialogDescription>
                      Personalize sua experiência de chat
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Provedor de IA
                      </label>
                      <Select
                        value={selectedProvider}
                        onValueChange={(value) =>
                          setSelectedProvider(value as typeof selectedProvider)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Modelo</label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {models[selectedProvider].map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>
        <ChatCompareDialog
          open={isCompareOpen}
          onOpenChange={setIsCompareOpen}
          currentConversationId={currentConversationId}
        />

        {/* Messages Area */}
        <ScrollArea className="flex-1 scroll-smooth overscroll-y-contain" ref={scrollAreaRef}>
          <div className="container mx-auto max-w-4xl px-4 py-8">
            {messages.length === 0 && !isLoading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full flex-col items-center justify-center py-20"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold">
                  Comece uma conversa
                </h2>
                <p className="mt-2 text-center text-muted-foreground max-w-md">
                  Faça sua primeira pergunta e deixe a IA responder. Experimente
                  diferentes modelos para encontrar o que funciona melhor para
                  você.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            )}

            {/* Streaming indicator */}
            {(isLoading || isStreaming) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 py-4"
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isStreaming ? 'Digitando...' : 'Pensando...'}
                </span>
              </motion.div>
            )}

            {/* Streaming content preview */}
            {streamingContent && (
              <div className="py-4">
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: new Date(),
                  }}
                  index={messages.length}
                />
              </div>
            )}
          </div>
          {/* New messages indicator */}
          <AnimatePresence>
            {showNewIndicator && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="pointer-events-auto fixed bottom-24 left-1/2 z-10 -translate-x-1/2"
              >
                <Button
                  variant="secondary"
                  className="rounded-full px-4 py-2 shadow-lg backdrop-blur-md bg-background/80 border border-primary/30"
                  onClick={() => scrollToBottom('smooth')}
                >
                  <ChevronDown className="mr-2 h-4 w-4 text-primary" />
                  {newMessageCount > 1
                    ? `${newMessageCount} novas mensagens`
                    : 'Nova mensagem'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
        {/* Navigation rail */}
        <div className="pointer-events-auto fixed bottom-24 right-6 z-10 flex flex-col gap-2">
          <Button
            variant="secondary"
            className="rounded-full h-10 w-10 bg-background/80 border border-primary/30"
            onClick={() => scrollToTop('smooth')}
            aria-label="Ir para o topo"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </Button>
          <Button
            variant="secondary"
            className="rounded-full h-10 w-10 bg-background/80 border border-primary/30"
            onClick={() => scrollToBottom('smooth')}
            aria-label="Ir para a última mensagem"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="relative inline-block rounded-lg overflow-hidden border"
                >
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="h-20 w-20 object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 flex items-center justify-center bg-muted">
                      <Paperclip className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t bg-background/80 backdrop-blur-sm shrink-0"
        >
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-[0_0_30px_0_rgba(0,0,0,0.2)]">
              <div className="flex items-end gap-2 p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isStreaming}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem... (Shift + Enter para nova linha)"
                  className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                  disabled={isLoading || isStreaming}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isStreaming}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  {isLoading || isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedProvider}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {selectedModel}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Pressione Enter para enviar, Shift+Enter para nova linha
                </span>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
