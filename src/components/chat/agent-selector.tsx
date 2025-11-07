'use client'

import { useState } from 'react'
import { Bot, Play, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/igniter.client'

interface AgentSelectorProps {
  onSelectAgent: (agentId: string, agentName: string) => void
}

export function AgentSelector({ onSelectAgent }: AgentSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const { data: agentsData, isLoading } = api.agent.list.useQuery({})

  const agents = agentsData?.data || []

  const handleExecuteAgent = async (agentId: string, agentName: string) => {
    setSelectedAgent(agentId)
    onSelectAgent(agentId, agentName)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bot className="w-4 h-4 mr-2" />
          Agentes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Executar Agente</DialogTitle>
          <DialogDescription>
            Selecione um agente para executar no chat
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum agente disponível</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent: any) => (
                <div
                  key={agent.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Bot className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {agent.name}
                        </h4>
                        {agent.isPublic && (
                          <Badge variant="secondary">Público</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {agent.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Usos: {agent.usageCount || 0}</span>
                        {agent.category && (
                          <span>Categoria: {agent.category}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleExecuteAgent(agent.id, agent.name)}
                      disabled={selectedAgent === agent.id}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Executar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

