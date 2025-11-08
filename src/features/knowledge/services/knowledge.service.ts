import type { CreateMemorySchema } from '@/features/memory/memory.interface'

interface IngestInput {
  title?: string
  text: string
  tags?: string[]
}

export class KnowledgeService {
  async buildMemoryPayload(input: IngestInput) {
    return {
      key: (input.title || input.text.slice(0, 48)).toLowerCase().replace(/\s+/g, '-'),
      value: input.text,
      category: 'knowledge',
      tags: input.tags || [],
    }
  }
}