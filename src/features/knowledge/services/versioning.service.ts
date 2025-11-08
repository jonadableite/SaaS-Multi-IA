import redis from '@/services/redis'

export interface MemoryVersion {
  value: string
  conversationId?: string | null
  timestamp: number
}

export class VersioningService {
  private key(memoryId: string) {
    return `memver:${memoryId}`
  }

  async add(memoryId: string, value: string, conversationId?: string | null) {
    const entry: MemoryVersion = { value, conversationId: conversationId || null, timestamp: Date.now() }
    await redis.lpush(this.key(memoryId), JSON.stringify(entry))
  }

  async list(memoryId: string): Promise<MemoryVersion[]> {
    const arr = await (redis as any).lrange?.(this.key(memoryId), 0, -1)
    if (!Array.isArray(arr)) return []
    return arr.map((s: string) => {
      try { return JSON.parse(s) } catch { return null }
    }).filter(Boolean)
  }

  async latest(memoryId: string): Promise<MemoryVersion | null> {
    const s = await (redis as any).lindex?.(this.key(memoryId), 0)
    if (!s) return null
    try { return JSON.parse(s) } catch { return null }
  }
}