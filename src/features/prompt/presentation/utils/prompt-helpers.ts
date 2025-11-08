import {
  Code2,
  Megaphone,
  TrendingUp,
  MessageSquare,
  PenTool,
  GraduationCap,
  FileText,
  Scale,
  Smile,
  Briefcase,
  Lightbulb,
  Heart,
  Users,
  DollarSign,
  Presentation,
} from 'lucide-react'
import type { PromptCategory } from '../../prompt.interface'

export const PROMPT_CATEGORIES: PromptCategory[] = [
  'Código',
  'Marketing',
  'Vendas',
  'Comunicação',
  'Escrita',
  'Acadêmico',
  'Criação de Conteúdo',
  'Jurídico',
  'Entretenimento',
  'Trabalho',
  'Resolução de Problemas',
  'Estilo de Vida',
  'Recursos Humanos',
  'Finanças',
  'Apresentações',
]

export const ALL_CATEGORIES = PROMPT_CATEGORIES

/**
 * Get icon component for category
 */
export function getCategoryIcon(category: string) {
  const icons: Record<string, typeof Code2> = {
    Código: Code2,
    Marketing: Megaphone,
    Vendas: TrendingUp,
    Comunicação: MessageSquare,
    Escrita: PenTool,
    Acadêmico: GraduationCap,
    'Criação de Conteúdo': FileText,
    Jurídico: Scale,
    Entretenimento: Smile,
    Trabalho: Briefcase,
    'Resolução de Problemas': Lightbulb,
    'Estilo de Vida': Heart,
    'Recursos Humanos': Users,
    Finanças: DollarSign,
    Apresentações: Presentation,
  }
  return icons[category] || Code2
}

/**
 * Get color class for category
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Código: 'text-blue-500',
    Marketing: 'text-pink-500',
    Vendas: 'text-green-500',
    Comunicação: 'text-purple-500',
    Escrita: 'text-orange-500',
    Acadêmico: 'text-indigo-500',
    'Criação de Conteúdo': 'text-yellow-500',
    Jurídico: 'text-gray-500',
    Entretenimento: 'text-red-500',
    Trabalho: 'text-cyan-500',
    'Resolução de Problemas': 'text-teal-500',
    'Estilo de Vida': 'text-lime-500',
    'Recursos Humanos': 'text-violet-500',
    Finanças: 'text-emerald-500',
    Apresentações: 'text-fuchsia-500',
  }
  return colors[category] || 'text-gray-500'
}

/**
 * Get background color class for category
 */
export function getCategoryBgColor(category: string): string {
  const colors: Record<string, string> = {
    Código: 'bg-blue-500/10',
    Marketing: 'bg-pink-500/10',
    Vendas: 'bg-green-500/10',
    Comunicação: 'bg-purple-500/10',
    Escrita: 'bg-orange-500/10',
    Acadêmico: 'bg-indigo-500/10',
    'Criação de Conteúdo': 'bg-yellow-500/10',
    Jurídico: 'bg-gray-500/10',
    Entretenimento: 'bg-red-500/10',
    Trabalho: 'bg-cyan-500/10',
    'Resolução de Problemas': 'bg-teal-500/10',
    'Estilo de Vida': 'bg-lime-500/10',
    'Recursos Humanos': 'bg-violet-500/10',
    Finanças: 'bg-emerald-500/10',
    Apresentações: 'bg-fuchsia-500/10',
  }
  return colors[category] || 'bg-gray-500/10'
}

/**
 * Format relative time (ex: "2 horas atrás")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 30) {
    return date.toLocaleDateString('pt-BR')
  }
  if (diffDay > 0) {
    return `${diffDay} dia${diffDay > 1 ? 's' : ''} atrás`
  }
  if (diffHour > 0) {
    return `${diffHour} hora${diffHour > 1 ? 's' : ''} atrás`
  }
  if (diffMin > 0) {
    return `${diffMin} minuto${diffMin > 1 ? 's' : ''} atrás`
  }
  return 'agora mesmo'
}

/**
 * Get array of star indices for rating component
 */
export function getStarsArray(count: number): Array<{ key: number }> {
  return Array.from({ length: count }, (_, i) => ({ key: i }))
}

/**
 * Process variables in prompt content
 * Ex: "Olá {{nome}}, bem-vindo à {{empresa}}"
 * Variables: { nome: "João", empresa: "Acme Inc" }
 * Result: "Olá João, bem-vindo à Acme Inc"
 */
export function processPromptVariables(
  content: string,
  variables?: Record<string, string>,
): string {
  if (!variables) return content

  let processed = content
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    processed = processed.replace(regex, value)
  })

  return processed
}

/**
 * Extract variable names from prompt content
 * Ex: "Olá {{nome}}, bem-vindo à {{empresa}}" -> ["nome", "empresa"]
 */
export function extractPromptVariables(content: string): string[] {
  const regex = /{{\\s*([^}]+)\\s*}}/g
  const matches = content.matchAll(regex)
  const variables: string[] = []

  for (const match of matches) {
    const variable = match[1].trim()
    if (!variables.includes(variable)) {
      variables.push(variable)
    }
  }

  return variables
}
