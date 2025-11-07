'use client'

import { useState, useEffect } from 'react'
import { Brain, Search, Plus, X, Tag, Calendar, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { api } from '@/igniter.client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MemoryPanelProps {
  onClose: () => void
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const [memories, setMemories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newMemory, setNewMemory] = useState({ key: '', value: '', category: '' })
  const [loading, setLoading] = useState(true)

  const { data: memoriesData, isLoading } = api.memory.list.useQuery({
    search: search || undefined,
    category: selectedCategory || undefined,
  })

  useEffect(() => {
    if (memoriesData?.data) {
      setMemories(memoriesData.data as any[])
      setLoading(false)
    }
  }, [memoriesData])

  const categories = Array.from(new Set(memories.map(m => m.category).filter(Boolean)))

  const handleCreateMemory = async () => {
    if (!newMemory.key.trim() || !newMemory.value.trim()) return

    try {
      const created = await api.memory.create.mutate({
        key: newMemory.key,
        value: newMemory.value,
        category: newMemory.category || null,
      })

      if (created?.data) {
        setMemories([created.data as any, ...memories])
        setNewMemory({ key: '', value: '', category: '' })
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Error creating memory:', error)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      await api.memory.delete.mutate({ params: { id } })
      setMemories(memories.filter(m => m.id !== id))
    } catch (error) {
      console.error('Error deleting memory:', error)
    }
  }

  const filteredMemories = memories.filter(m => {
    if (selectedCategory && m.category !== selectedCategory) return false
    if (search && !m.key.toLowerCase().includes(search.toLowerCase()) && 
        !m.value.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Memórias
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Memória
        </Button>

        {isCreating && (
          <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
            <Input
              placeholder="Chave (ex: nome, preferência, etc)"
              value={newMemory.key}
              onChange={(e) => setNewMemory({ ...newMemory, key: e.target.value })}
            />
            <Input
              placeholder="Valor"
              value={newMemory.value}
              onChange={(e) => setNewMemory({ ...newMemory, value: e.target.value })}
            />
            <Input
              placeholder="Categoria (opcional)"
              value={newMemory.category}
              onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleCreateMemory}
                size="sm"
                className="flex-1"
              >
                Salvar
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false)
                  setNewMemory({ key: '', value: '', category: '' })
                }}
                size="sm"
                variant="ghost"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar memórias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Todas
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Memories List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma memória encontrada</p>
            </div>
          ) : (
            filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {memory.key}
                      </h4>
                      {memory.category && (
                        <Badge variant="secondary" className="text-xs">
                          {memory.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {memory.value}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(memory.updatedAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        // Edit logic
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteMemory(memory.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

