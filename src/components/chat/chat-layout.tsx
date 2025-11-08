'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChatArea } from './chat-area'
import { MemoryPanel } from './memory-panel'
import { X, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function ChatLayout() {
  const searchParams = useSearchParams()
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState('whatlead-fusion')
  const [currentConversation, setCurrentConversation] = useState<string | null>(
    searchParams.get('conversationId'),
  )

  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    const convId = searchParams.get('conversationId')
    setCurrentConversation(convId)
  }, [searchParams])

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Animated Holographic Background */}
      <div className="absolute inset-0 holographic-bg animate-gradient-shift" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95" />

      {/* Main Content Area - Full Width */}
      <div className="relative flex-1 min-h-0 flex flex-col min-w-0 h-full overflow-hidden z-10">
        <ChatArea
          conversationId={currentConversation}
          selectedModel={selectedModel}
          isMobile={isMobile}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Memory Panel - Overlay on Mobile */}
      {memoryPanelOpen && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMemoryPanelOpen(false)}
            />
          )}

          <div
            className={`
              fixed right-0 top-0 bottom-0 z-50
              w-full sm:w-96 md:w-[400px]
              glass-effect-strong border-l
              shadow-[0_-4px_24px_rgba(0,0,0,0.15),0_0_40px_rgba(37,99,235,0.2)]
              dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4),0_0_40px_rgba(37,99,235,0.3)]
              transform transition-transform duration-300 ease-in-out
              ${memoryPanelOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            <div className="flex flex-col h-full">
              {/* Header with Glow Effect */}
              <div className="flex items-center justify-between p-6 border-b border-border/50 glass-effect">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary to-blue-600 shadow-md">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-semibold gradient-text text-lg">Memory</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMemoryPanelOpen(false)}
                  className="hover:bg-destructive/20 transition-all-smooth"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content with Fade */}
              <div className="flex-1 overflow-y-auto">
                <MemoryPanel />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Action Button - Memory (Mobile) */}
      {isMobile && !memoryPanelOpen && (
        <Button
          size="icon"
          variant="default"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-glow animate-pulse-glow z-30 bg-gradient-to-br from-primary to-blue-600 border-2 border-primary/20"
          onClick={() => setMemoryPanelOpen(true)}
        >
          <Brain className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Desktop Memory Toggle */}
      {!isMobile && !memoryPanelOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-6 right-6 z-30 glass-effect hover:glass-effect-strong transition-all-smooth hover-lift shadow-glow p-3"
          onClick={() => setMemoryPanelOpen(true)}
          aria-label="Abrir painel de memórias"
        >
          <Brain className="w-6 h-6 text-primary" />
        </Button>
      )}
    </div>
  )
}
