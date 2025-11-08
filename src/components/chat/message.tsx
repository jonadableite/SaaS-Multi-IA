'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, CheckCircle2, ThumbsUp, ThumbsDown, RefreshCw, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import { useAuth } from '@/@saas-boilerplate/features/auth/presentation/contexts/auth.context'
import { String } from '@/@saas-boilerplate/utils/string'

interface MessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    model?: string
    provider?: string
    timestamp: Date
    attachments?: any[]
    isStreaming?: boolean
  }
  isLast: boolean
  isMobile: boolean
}

// Helper function to get provider icon path
function getProviderIconPath(provider?: string): string {
  if (!provider) return '/icon.svg'

  const providerLower = provider.toLowerCase()
  const iconMap: Record<string, string> = {
    openai: '/gpt.png',
    anthropic: '/claude.png',
    google: '/gemini.png',
    cohere: '/cohere.png',
    meta: '/llama.png',
    deepseek: '/1bb72c07-4584-4e37-9cce-324f8b6a7d8d_deepseeklogo.png',
  }

  return iconMap[providerLower] || '/icon.svg'
}

export function Message({ message, isLast, isMobile }: MessageProps) {
  const [copied, setCopied] = useState(false)
  const [reaction, setReaction] = useState<'up' | 'down' | null>(null)
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([])
  const auth = useAuth()

  // Lazy-load remark-gfm to avoid build-time dependency issues
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const mod = await import('remark-gfm')
          if (mounted) setRemarkPlugins([mod.default])
        } catch (err) {
          // If plugin is unavailable, render without GFM enhancements
          if (mounted) setRemarkPlugins([])
        }
      })()
    return () => {
      mounted = false
    }
  }, [])

  const isUser = message.role === 'user'
  const user = auth.session?.user
  const providerIconPath = !isUser ? getProviderIconPath(message.provider) : null

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(message.content)
    utterance.lang = 'pt-BR'
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div
      className={`
        flex items-start space-x-3 group
        ${isUser ? 'flex-row-reverse space-x-reverse animate-slide-in-right' : 'animate-slide-in-left'}
        ${message.isStreaming ? 'animate-pulse' : ''}
      `}
    >
      {/* User Avatar or Model Icon */}
      {isUser ? (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
            {user?.name ? String.getInitials(user.name) : 'U'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted overflow-hidden">
          {providerIconPath ? (
            <Image
              src={providerIconPath}
              alt={message.provider || 'AI'}
              width={32}
              height={32}
              className="object-contain"
            />
          ) : (
            <span className="text-muted-foreground text-xs font-medium">
              AI
            </span>
          )}
        </div>
      )}

      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`
            max-w-[85%] ${isMobile ? 'max-w-full' : ''}
            ${isUser
              ? 'bg-gradient-to-br from-primary via-primary/90 to-blue-600 text-primary-foreground rounded-2xl rounded-tr-sm shadow-glow'
              : 'glass-effect-strong text-foreground rounded-2xl rounded-tl-sm border border-border/50'
            }
            px-4 py-3 transition-all-smooth hover-lift
          `}
        >
          {!isUser && message.model && (
            <div className="flex items-center space-x-2 mb-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 bg-muted rounded-full font-medium">
                {message.model}
              </span>
            </div>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg text-sm"
                >
                  <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                    📎
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs opacity-75">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert'}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={remarkPlugins}
                components={{
                  ul: ({ children }) => (
                    <ul className="list-none space-y-2 my-4">
                      {children}
                    </ul>
                  ),
                  li: ({ children, ...props }) => {
                    return (
                      <li className="flex items-start gap-2" {...props}>
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{children}</span>
                      </li>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {message.isStreaming && (
            <div className="flex items-center space-x-1 mt-2">
              <div className="w-2 h-2 bg-current rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-typing-dot" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-typing-dot" style={{ animationDelay: '400ms' }} />
            </div>
          )}
        </div>

        {!isUser && !message.isStreaming && (
          <div className="flex items-center space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSpeak}
              className="h-7 text-xs"
            >
              <Volume2 className="w-3 h-3 mr-1" />
              Ouvir
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerar
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              variant={reaction === 'up' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setReaction(reaction === 'up' ? null : 'up')}
              className="h-7 w-7"
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>

            <Button
              variant={reaction === 'down' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setReaction(reaction === 'down' ? null : 'down')}
              className="h-7 w-7"
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

