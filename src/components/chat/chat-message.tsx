'use client'

import { motion } from 'framer-motion'
import { User, Bot, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  provider?: string
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
  index: number
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'mb-6 flex gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.05 + 0.1, type: 'spring' }}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? (
          <User className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </motion.div>

      <div className={cn('flex-1', isUser ? 'items-end' : 'items-start')}>
        <Card
          className={cn(
            'relative max-w-[85%] overflow-hidden',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <div className="p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {isUser ? (
                <p className="text-primary-foreground">{message.content}</p>
              ) : (
                <ReactMarkdown
                  className={cn(
                    'text-sm leading-relaxed',
                    'prose-headings:mt-4 prose-headings:mb-2',
                    'prose-p:my-2',
                    'prose-ul:my-2 prose-ol:my-2',
                    'prose-code:text-xs prose-code:bg-muted-foreground/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
                    'prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto',
                    'prose-strong:font-semibold',
                    'prose-a:text-primary prose-a:underline'
                  )}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          </div>

          {!isUser && (
            <div className="flex items-center justify-between border-t bg-muted/50 px-4 py-2">
              <div className="flex items-center gap-2">
                {message.provider && (
                  <Badge variant="outline" className="text-xs">
                    {message.provider}
                  </Badge>
                )}
                {message.model && (
                  <span className="text-xs text-muted-foreground">{message.model}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </Card>

        <span className="mt-1 block text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  )
}

