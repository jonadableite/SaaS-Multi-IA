import { useState, useMemo } from 'react'
import { api } from '@/igniter.client'

/**
 * @hook useConversationHistory
 * @description Hook para gerenciar o estado do histórico de conversas
 */

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  
  useMemo(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debounced
}

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
  createdAt: string
  messages?: Array<{
    id: string
    role: string
    content: string
  }>
  category?: string | null
  tags?: string[]
  starred?: boolean
  archived?: boolean
}

interface ConversationFilters {
  starred: boolean
  archived: boolean
  dateRange: 'all' | 'today' | 'week' | 'month'
}

export function useConversationHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ConversationFilters>({
    starred: false,
    archived: false,
    dateRange: 'all',
  })

  const debouncedSearch = useDebouncedValue(searchQuery, 250)

  const { data: conversationsData, isLoading } = api.conversation.list.useQuery(
    {
      search: debouncedSearch || undefined,
      dateRange: filters.dateRange,
      starred: filters.starred || undefined,
      // Only filter archived when explicitly set to true
      archived: filters.archived ? true : undefined,
    },
  )

  // Extract conversations - Igniter.js returns { data: T } or T directly
  const conversations = useMemo(() => {
    console.log('[useConversationHistory] 🔍 Raw response:', conversationsData)
    
    if (!conversationsData) {
      return []
    }

    // Check if response has .data property
    if ((conversationsData as any)?.data) {
      const data = (conversationsData as any).data
      console.log('[useConversationHistory] 🔍 Found .data:', data)
      console.log('[useConversationHistory] 🔍 Is array?', Array.isArray(data))
      
      if (Array.isArray(data)) {
        console.log('[useConversationHistory] ✅ Returning array from .data')
        return data as Conversation[]
      }
    }
    
    // Check if response is directly an array
    if (Array.isArray(conversationsData)) {
      console.log('[useConversationHistory] ✅ Response is directly an array')
      return conversationsData as Conversation[]
    }

    console.log('[useConversationHistory] ⚠️ Could not extract conversations')
    return []
  }, [conversationsData])

  const groupedConversations = useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      Hoje: [],
      'Esta semana': [],
      'Este mês': [],
      'Mais antigos': [],
    }

    const now = new Date()
    conversations.forEach((conv) => {
      const d = new Date(conv.updatedAt || conv.createdAt)
      const isToday = d.toDateString() === now.toDateString()

      const startOfWeek = new Date(now)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      if (isToday) groups['Hoje'].push(conv)
      else if (d >= startOfWeek) groups['Esta semana'].push(conv)
      else if (d >= startOfMonth) groups['Este mês'].push(conv)
      else groups['Mais antigos'].push(conv)
    })

    return groups
  }, [conversations])

  const toggleStarred = async (conversationId: string, currentStarred: boolean) => {
    try {
      await api.conversation.update.mutate({
        params: { id: conversationId },
        body: { starred: !currentStarred },
      })
    } catch (error) {
      console.error('Error toggling starred:', error)
    }
  }

  const toggleArchived = async (conversationId: string, currentArchived: boolean) => {
    try {
      await api.conversation.update.mutate({
        params: { id: conversationId },
        body: { archived: !currentArchived },
      })
    } catch (error) {
      console.error('Error toggling archived:', error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await api.conversation.delete.mutate({
        params: { id: conversationId },
      })
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  return {
    conversations,
    isLoading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    groupedConversations,
    toggleStarred,
    toggleArchived,
    deleteConversation,
  }
}

