'use client'

import { useState } from 'react'
import {
  Sparkles,
  Globe,
  Code,
  Image as ImageIcon,
  FileText,
  Calculator,
  Mail,
  Linkedin,
  Brain,
  TrendingUp,
  X,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Tool {
  id: string
  name: string
  icon: React.ReactNode
  template: string
  category: string
  description: string
  tags: string[]
}

const tools: Tool[] = [
  {
    id: 'web-search',
    name: 'Buscar na Web',
    icon: <Globe className="w-4 h-4" />,
    template: 'Pesquise na internet sobre: ',
    category: 'Pesquisa',
    description: 'Buscar informações atualizadas na web',
    tags: ['pesquisa', 'web', 'informação'],
  },
  {
    id: 'code-help',
    name: 'Ajuda com Código',
    icon: <Code className="w-4 h-4" />,
    template: 'Me ajude a escrever código para: ',
    category: 'Desenvolvimento',
    description: 'Gerar, explicar ou debugar código',
    tags: ['código', 'programação', 'desenvolvimento'],
  },
  {
    id: 'create-image',
    name: 'Gerar Imagem',
    icon: <ImageIcon className="w-4 h-4" />,
    template: 'Crie uma imagem de: ',
    category: 'Criativo',
    description: 'Gerar imagens com IA',
    tags: ['imagem', 'arte', 'criativo'],
  },
  {
    id: 'write-doc',
    name: 'Escrever Documento',
    icon: <FileText className="w-4 h-4" />,
    template: 'Me ajude a escrever um documento sobre: ',
    category: 'Escrita',
    description: 'Criar documentos profissionais',
    tags: ['documento', 'escrita', 'texto'],
  },
  {
    id: 'write-email',
    name: 'Escrever Email',
    icon: <Mail className="w-4 h-4" />,
    template: 'Escreva um email profissional para: ',
    category: 'Escrita',
    description: 'Redigir emails profissionais',
    tags: ['email', 'escrita', 'profissional'],
  },
  {
    id: 'linkedin-post',
    name: 'Post LinkedIn',
    icon: <Linkedin className="w-4 h-4" />,
    template: 'Crie um post para LinkedIn sobre: ',
    category: 'Marketing',
    description: 'Criar posts engajantes',
    tags: ['linkedin', 'post', 'marketing'],
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: <Brain className="w-4 h-4" />,
    template: 'Me dê ideias criativas sobre: ',
    category: 'Criativo',
    description: 'Gerar ideias e soluções',
    tags: ['ideias', 'criatividade', 'brainstorm'],
  },
  {
    id: 'analyze-data',
    name: 'Analisar Dados',
    icon: <TrendingUp className="w-4 h-4" />,
    template: 'Analise estes dados e dê insights sobre: ',
    category: 'Análise',
    description: 'Análise de dados e insights',
    tags: ['dados', 'análise', 'insights'],
  },
  {
    id: 'calculate',
    name: 'Calcular',
    icon: <Calculator className="w-4 h-4" />,
    template: 'Calcule e explique: ',
    category: 'Análise',
    description: 'Realizar cálculos complexos',
    tags: ['cálculo', 'matemática', 'análise'],
  },
]

interface ToolsMenuProps {
  onSelect: (template: string) => void
  onClose: () => void
}

export function ToolsMenu({ onSelect, onClose }: ToolsMenuProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(tools.map(t => t.category)))]

  const filteredTools = tools.filter(tool => {
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'all' || tool.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-whatlead" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ferramentas & Templates
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar ferramentas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="w-full">
          <div className="flex space-x-2 mb-4 pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="flex-shrink-0"
              >
                {category === 'all' ? 'Todas' : category}
              </Button>
            ))}
          </div>
        </ScrollArea>

        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-4">
            {filteredTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onSelect(tool.template)}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-whatlead flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {tool.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {tool.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhuma ferramenta encontrada</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

