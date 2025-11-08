import redis from '@/services/redis'
import { logger } from '@/services/logger'

export interface VectorRecord {
  id: string
  key: string
  category?: string | null
  preview?: string
  vector: number[]
}

export class VectorStoreService {
  private key(userId: string) {
    return `emb:${userId}`
  }

  async upsert(userId: string, record: VectorRecord): Promise<void> {
    const k = this.key(userId)
    await redis.hset(k, record.id, JSON.stringify(record))
  }

  async remove(userId: string, id: string): Promise<void> {
    const k = this.key(userId)
    await redis.hdel(k, id)
  }

  async list(userId: string): Promise<VectorRecord[]> {
    const k = this.key(userId)
    const obj = (await redis.hget(k, '*')) as any // safe wrapper returns null for errors
    // When hget wildcard unsupported, iterate keys via hgetall
    const all = (await (redis as any).hgetall?.(k)) || {}
    return Object.entries(all).map(([_, v]) => {
      try {
        return JSON.parse(v as string)
      } catch {
        return null
      }
    }).filter(Boolean) as VectorRecord[]
  }
}