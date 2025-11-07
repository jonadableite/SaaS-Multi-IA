import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { api } from '@/igniter.client'
import { ChatLayout } from '@/components/chat/chat-layout'

export const metadata: Metadata = {
  title: 'Chat Multi-IA | Converse com Inteligência Artificial',
  description:
    'Converse com os melhores modelos de IA do mundo: OpenAI, Anthropic e Google.',
}

export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = false
export const fetchCache = 'auto'

export default async function ChatPage() {
  // Business Rule: Check if user has an organization before accessing chat
  const session = await api.auth.getSession.query()

  // Business Rule: If no session or organization, redirect to get-started
  if (!session.data?.organization) {
    redirect('/app/get-started')
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen overflow-hidden">
          Carregando...
        </div>
      }
    >
      <ChatLayout />
    </Suspense>
  )
}
