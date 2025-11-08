import { logger } from '@/services/logger'

export class EmbeddingService {
  private apiKey = process.env.OPENAI_API_KEY
  private model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'

  isConfigured() {
    return !!this.apiKey
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      logger.warn('[Embedding] Missing OPENAI_API_KEY')
      return []
    }
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: this.model, input: text }),
      })
      if (!res.ok) {
        const t = await res.text()
        logger.error('[Embedding] HTTP error', { status: res.status, t })
        return []
      }
      const data: any = await res.json()
      const vec: number[] = data?.data?.[0]?.embedding || []
      return vec
    } catch (error: any) {
      logger.error('[Embedding] Fetch failed', { message: error?.message })
      return []
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom ? dot / denom : 0
  }
}