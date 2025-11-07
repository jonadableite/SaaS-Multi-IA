import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimitService } from './rate-limit'
import redis from '@/services/redis'

// Mock Redis
vi.mock('@/services/redis', () => ({
  default: {
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}))

describe('RateLimitService', () => {
  let service: RateLimitService
  const mockRedis = redis as unknown as {
    get: ReturnType<typeof vi.fn>
    incr: ReturnType<typeof vi.fn>
    expire: ReturnType<typeof vi.fn>
    del: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    service = new RateLimitService()
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      mockRedis.get.mockResolvedValue('5')
      mockRedis.incr.mockResolvedValue(6)

      const result = await service.checkRateLimit('user:123', {
        limit: 10,
        window: 60,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(10)
      expect(mockRedis.incr).toHaveBeenCalled()
      expect(mockRedis.expire).toHaveBeenCalled()
    })

    it('should reject request when limit exceeded', async () => {
      mockRedis.get.mockResolvedValue('10')

      const result = await service.checkRateLimit('user:123', {
        limit: 10,
        window: 60,
      })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(mockRedis.incr).not.toHaveBeenCalled()
    })

    it('should initialize counter when first request', async () => {
      mockRedis.get.mockResolvedValue(null)
      mockRedis.incr.mockResolvedValue(1)

      const result = await service.checkRateLimit('user:123', {
        limit: 10,
        window: 60,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(mockRedis.incr).toHaveBeenCalled()
    })

    it('should skip rate limiting in development when configured', async () => {
      const result = await service.checkRateLimit('user:123', {
        limit: 10,
        window: 60,
        skip: true,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10)
      expect(mockRedis.get).not.toHaveBeenCalled()
    })

    it('should calculate reset time correctly', async () => {
      mockRedis.get.mockResolvedValue('5')
      mockRedis.incr.mockResolvedValue(6)

      const result = await service.checkRateLimit('user:123', {
        limit: 10,
        window: 60,
      })

      expect(result.reset).toBeGreaterThan(0)
      expect(result.reset).toBeLessThanOrEqual(60)
    })
  })

  describe('resetRateLimit', () => {
    it('should delete rate limit key', async () => {
      mockRedis.del.mockResolvedValue(1)

      await service.resetRateLimit('user:123', {
        limit: 10,
        window: 60,
      })

      expect(mockRedis.del).toHaveBeenCalled()
    })
  })
})

