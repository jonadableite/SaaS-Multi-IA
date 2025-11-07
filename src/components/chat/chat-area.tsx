'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, ExternalLink, Upload } from 'lucide-react'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { AgentSelector } from './agent-selector'
import { api } from '@/igniter.client'
import { Button } from '@/components/ui/button'
import { useChatStream } from '@/hooks/useChatStream'

interface ChatAreaProps {
  conversationId: string | null
  selectedModel: string
  isMobile: boolean
  onModelChange?: (model: string) => void
}

// Helper function to extract provider from model ID
function getProviderFromModel(modelId: string): string {
  const modelLower = modelId.toLowerCase()
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
}: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null)
  const [conversationTitle, setConversationTitle] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { connect: connectStream, disconnect: disconnectStream } =
    useChatStream()

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId)
    } else {
      setMessages([])
      setConversationTitle(null)
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
              provider: msg.provider || getProviderFromModel(msg.model || selectedModel),
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
          const metadataProvider = message.data.provider || getProviderFromModel(streamModel)
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
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      {/* Chat Header */}
      {conversationId && conversationTitle && (
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">
                {conversationTitle}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{selectedModel}</span>
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Upload className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Como posso ajudar você hoje?
            </h2>
            <p className="text-muted-foreground mb-8">
              Escolha um modelo de IA ou execute um agente para começar.
            </p>

            {activeAgentName && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-primary">
                      Agente ativo: {activeAgentName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveAgentId(null)
                      setActiveAgentName(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-6 flex justify-center">
              <AgentSelector onSelectAgent={handleSelectAgent} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
              {[
                {
                  title: '📝 Escrever',
                  description: 'Criar conteúdo, emails e documentos',
                  action: 'Me ajude a escrever um email profissional',
                },
                {
                  title: '💡 Ideias',
                  description: 'Brainstorming e criatividade',
                  action: 'Me dê ideias para um projeto de startup',
                },
                {
                  title: '🔍 Pesquisar',
                  description: 'Buscar informações e análises',
                  action: 'Pesquise sobre as últimas tendências em IA',
                },
                {
                  title: '💻 Código',
                  description: 'Programação e desenvolvimento',
                  action: 'Me ajude a criar uma função em Python',
                },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(item.action)}
                  className="p-4 rounded-xl border-2 border-border hover:border-primary transition-all text-left group bg-card hover:bg-card/80"
                >
                  <div className="text-2xl mb-2">{item.title}</div>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isMobile={isMobile}
        />
      )}

      <ChatInput
        onSend={handleSendMessage}
        isLoading={isLoading}
        onStop={handleStopGenerating}
        isMobile={isMobile}
        disabled={!conversationId && messages.length === 0}
        selectedModel={selectedModel}
        onModelChange={(modelId) => {
          onModelChange?.(modelId)
        }}
      />
    </div>
  )
}
