'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChatArea } from './chat-area'
import { ChatConversationsSidebar } from './chat-conversations-sidebar'
import { MemoryPanel } from './memory-panel'
import { Menu, X, Brain, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

export function ChatLayout() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo')
  const [currentConversation, setCurrentConversation] = useState<string | null>(
    searchParams.get('conversationId'),
  )

  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  useEffect(() => {
    const convId = searchParams.get('conversationId')
    setCurrentConversation(convId)
  }, [searchParams])

  const handleSelectConversation = (id: string | null) => {
    setCurrentConversation(id)
    if (id) {
      router.push(`/app?conversationId=${id}`)
    } else {
      router.push('/app')
    }
  }

  const handleConversationCreated = (conversationId: string) => {
    setCurrentConversation(conversationId)
    router.push(`/app?conversationId=${conversationId}`)
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Conversations Sidebar */}
      {sidebarOpen && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div
            className={cn(
              'flex h-full flex-col border-r bg-muted/30',
              isMobile
                ? 'fixed left-0 top-0 bottom-0 z-50 w-80 transform transition-transform duration-300 ease-in-out'
                : 'w-80',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <ChatConversationsSidebar
              onConversationSelect={handleSelectConversation}
            />
          </div>
        </>
      )}

      {/* Main Content Area - Full Height, No Scroll */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0 h-full overflow-hidden">
        <ChatArea
          conversationId={currentConversation}
          selectedModel={selectedModel}
          isMobile={isMobile}
          onModelChange={setSelectedModel}
          onConversationCreated={handleConversationCreated}
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
              bg-background border-l
              transform transition-transform duration-300 ease-in-out
              ${memoryPanelOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  <h2 className="font-semibold">Memory</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMemoryPanelOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <MemoryPanel />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Action Buttons - Mobile */}
      {isMobile && (
        <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-30">
          <Button
            size="icon"
            variant="default"
            className="w-12 h-12 rounded-full shadow-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant="default"
            className="w-12 h-12 rounded-full shadow-lg"
            onClick={() => setMemoryPanelOpen(!memoryPanelOpen)}
          >
            <Brain className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Desktop Sidebar Toggle */}
      {!isMobile && !sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-30"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Desktop Memory Toggle */}
      {!isMobile && !memoryPanelOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-30"
          onClick={() => setMemoryPanelOpen(true)}
        >
          <Brain className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}
