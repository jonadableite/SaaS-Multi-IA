'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sparkles, X, ExternalLink, Upload } from 'lucide-react'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { AgentSelector } from './agent-selector'
import { ChatEmptyState } from './chat-empty-state'
import { api } from '@/igniter.client'
import { Button } from '@/components/ui/button'
import { useChatStream } from '@/hooks/useChatStream'

interface ChatAreaProps {
  conversationId: string | null
  selectedModel: string
  isMobile: boolean
  onModelChange?: (model: string) => void
  onConversationCreated?: (conversationId: string) => void
}

// Helper function to extract provider from model ID
function getProviderFromModel(modelId: string): string {
  const modelLower = modelId.toLowerCase()
  if (modelLower.includes('whatlead-fusion') || modelLower.includes('fusion')) {
    return 'fusion'
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
  return 'openai' // Default fallback
}

export function ChatArea({
  conversationId,
  selectedModel,
  isMobile,
  onModelChange,
  onConversationCreated,
}: ChatAreaProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null)
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  )
  const abortControllerRef = useRef<AbortController | null>(null)
  const { connect: connectStream, disconnect: disconnectStream } =
    useChatStream()

  // Handle prompt from query param (from Prompt Library)
  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt')
    if (promptFromUrl && !conversationId && messages.length === 0) {
      // Remove prompt from URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('prompt')
      router.replace(`/app${newParams.toString() ? `?${newParams.toString()}` : ''}`)
      
      // Send prompt as message
      handleSendMessage(promptFromUrl)
    }
  }, [searchParams])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId)
    } else {
      setMessages([])
      setConversationTitle(null)
      setActiveAgentId(null)
      setActiveAgentName(null)
    }
  }, [conversationId])

  const loadMessages = async (convId: string) => {
    try {
      const conversation = await api.conversation.retrieve.query({
        params: { id: convId },
      })

      if (conversation.data) {
        setConversationTitle(conversation.data.title || null)
        if (conversation.data.messages) {
          setMessages(
            conversation.data.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role.toLowerCase(),
              content: msg.content,
              model: msg.model || selectedModel,
              provider:
                msg.provider ||
                getProviderFromModel(msg.model || selectedModel),
              timestamp: new Date(msg.createdAt),
            })),
          )
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSelectAgent = (agentId: string, agentName: string) => {
    setActiveAgentId(agentId)
    setActiveAgentName(agentName)
  }

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() && !attachments?.length) return

    // If agent is selected, execute agent instead
    if (activeAgentId) {
      await handleExecuteAgent(activeAgentId, content)
      return
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: attachments?.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Create streaming message placeholder
    const assistantMessageId = (Date.now() + 1).toString()
    let streamingContent = ''
    let streamModel = selectedModel
    const streamProvider = getProviderFromModel(selectedModel)

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        model: selectedModel,
        provider: streamProvider,
        timestamp: new Date(),
        isStreaming: true,
      },
    ])

    abortControllerRef.current = new AbortController()

    // Use streaming with EventSource
    const cleanup = connectStream({
      query: {
        content,
        conversationId: conversationId || undefined,
        model: selectedModel,
        provider: streamProvider,
        stream: true,
      },
      onMessage: (message: any) => {
        if (message.type === 'content' && message.data) {
          streamingContent += message.data
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: streamingContent }
                : msg,
            ),
          )
        } else if (message.type === 'metadata' && message.data) {
          streamModel = message.data.model || selectedModel
          const metadataProvider =
            message.data.provider || getProviderFromModel(streamModel)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, model: streamModel, provider: metadataProvider }
                : msg,
            ),
          )
        } else if (message.type === 'done' && message.data) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg,
            ),
          )
          setIsLoading(false)
          disconnectStream()

          // Update conversationId if a new conversation was created
          const newConversationId = message.data?.conversationId
          if (newConversationId && !conversationId) {
            onConversationCreated?.(newConversationId)
          }
        } else if (message.type === 'error') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                  ...msg,
                  content:
                    message.data?.error || 'Erro ao processar mensagem',
                  isStreaming: false,
                }
                : msg,
            ),
          )
          setIsLoading(false)
          disconnectStream()
        }
      },
      onError: (error: Error) => {
        console.error('Stream error:', error)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: 'Erro na conexão. Tentando reconectar...',
                isStreaming: false,
              }
              : msg,
          ),
        )
        setIsLoading(false)
      },
      onDone: () => {
        disconnectStream()
      },
    })

    // Cleanup on component unmount or abort
    if (abortControllerRef.current) {
      abortControllerRef.current.signal.addEventListener('abort', () => {
        disconnectStream()
        cleanup?.()
      })
    }
  }

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleExecuteAgent = async (agentId: string, input: string) => {
    setIsLoading(true)
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const result = await api.agent.execute.mutate({
        params: { id: agentId },
        body: { input },
      })

      if (result.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.data!.output,
            model: 'Agent',
            provider: 'openai', // Default provider for agents
            timestamp: new Date(),
          },
        ])
      }
    } catch (error) {
      console.error('Error executing agent:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Erro ao executar agente. Tente novamente.',
          provider: 'openai',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative h-full">
      {/* Chat Header with Glass Effect - Fixed at top */}
      {conversationId && conversationTitle && (
        <div className="glass-effect border-b border-border/50 px-6 py-4 animate-fade-in-scale shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold gradient-text mb-1">
                {conversationTitle}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {selectedModel}
                </span>
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="glass-effect hover-lift"
            >
              <Upload className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        /* Empty State with Centered Input */
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <ChatEmptyState 
            onPromptSelect={handleSendMessage}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            onSend={handleSendMessage}
            isLoading={isLoading}
            onStop={handleStopGenerating}
            isMobile={isMobile}
          />
        </div>
      ) : (
        <>
          {/* Messages Area - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              isMobile={isMobile}
            />
          </div>

          {/* Chat Input - Fixed at bottom */}
          <div className="shrink-0">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              onStop={handleStopGenerating}
              isMobile={isMobile}
              selectedModel={selectedModel}
              onModelChange={(modelId) => {
                onModelChange?.(modelId)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
