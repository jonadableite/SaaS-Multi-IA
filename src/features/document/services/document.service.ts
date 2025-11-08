import { ToolsService } from '@/features/tools/services/tools.service'

export class DocumentService {
  private tools = new ToolsService()

  async generateReport(title: string, text: string) {
    const summary = await this.tools.summarize(text)
    const outline = await this.tools.outline(text)
    const body = `# ${title}\n\n## Sumário\n\n${summary?.content ?? ''}\n\n## Estrutura\n\n${outline?.content ?? ''}`
    return { title, body, format: 'markdown' as const }
  }
}