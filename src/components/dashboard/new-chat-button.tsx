'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/**
 * @component NewChatButton
 * @description Botão destacado para iniciar uma nova conversa
 */
export function NewChatButton() {
  const router = useRouter()

  const handleNewChat = () => {
    router.push('/app')
  }

  return (
    <Button
      variant="default"
      className="w-full justify-start bg-primary"
      onClick={handleNewChat}
    >
      <Plus className="w-4 h-4 mr-2" />
      Novo Chat
    </Button>
  )
}

