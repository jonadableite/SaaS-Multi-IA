import { AIRouter } from '@/features/ai/ai-router'

export class ToolsService {
  private router: AIRouter
  constructor() {
    this.router = AIRouter.createFromEnv()
  }

  async summarize(text: string, provider = 'openai' as const) {
    const model = await this.router.getProvider(provider).getDefaultModel('summarization')
    const prompt = `Resuma de forma objetiva:
"""
${text}
"""`
    return this.router.getProvider(provider).chat({ messages: [{ role: 'user', content: prompt }] })
  }

  async extractTasks(text: string, provider = 'openai' as const) {
    const prompt = `Extraia tarefas acionáveis em formato de lista:
"""
${text}
"""`
    return this.router.getProvider(provider).chat({ messages: [{ role: 'user', content: prompt }] })
  }

  async outline(text: string, provider = 'openai' as const) {
    const prompt = `Crie um sumário estruturado com seções e subtópicos:
"""
${text}
"""`
    return this.router.getProvider(provider).chat({ messages: [{ role: 'user', content: prompt }] })
  }
}