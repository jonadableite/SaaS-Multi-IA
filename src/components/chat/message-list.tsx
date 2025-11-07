'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { Message } from './message'

interface MessageListProps {
  messages: any[]
  isLoading: boolean
  isMobile: boolean
}

export function MessageList({ messages, isLoading, isMobile }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <ScrollArea className="flex-1 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isLast={index === messages.length - 1}
            isMobile={isMobile}
          />
        ))}

        {isLoading && !messages[messages.length - 1]?.isStreaming && (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Pensando...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

