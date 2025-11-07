import { prisma } from '@/services/prisma'
import type { Usage, UsageType } from '../usage.interface'
import type { UsageEvent } from '../usage.interface'
import { AppError, AppErrorCode } from '@/utils/app-error'
import { registeredJobs, hasJobs } from '@/services/jobs'

/**
 * @class UsageService
 * @description Service for managing AI usage tracking and billing
 */
export class UsageService {
  /**
   * @method createUsage
   * @description Create a usage record
   */
  async createUsage(
    userId: string,
    data: {
      model: string
      provider: string
      type: UsageType
      tokens: number
      tokensIn: number | null
      tokensOut: number | null
      cost: number
      requestId: string | null
      conversationId?: string | null
      agentId?: string | null
    },
  ): Promise<Usage> {
    return prisma.usage.create({
      data: {
        userId,
        ...data,
      },
    })
  }

  /**
   * @method recordUsageEvent
   * @description Record usage event and queue for billing processing
   */
  async recordUsageEvent(event: UsageEvent): Promise<void> {
    // Create usage record first
    const usage = await this.createUsage(event.userId, {
      model: event.model,
      provider: event.provider,
      type: event.type,
      tokens: event.tokensIn + event.tokensOut,
      tokensIn: event.tokensIn,
      tokensOut: event.tokensOut,
      cost: event.cost,
      requestId: event.requestId,
      conversationId: event.conversationId,
      agentId: event.agentId,
    })

    // Queue usage event for billing processing (only if jobs are available)
    if (hasJobs && registeredJobs?.usage?.processBilling) {
      await registeredJobs.usage.processBilling.enqueue({
        event: {
          ...event,
          usageId: usage.id,
        },
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * @method getUserUsage
   * @description Get usage records for a user
   */
  async getUserUsage(
    userId: string,
    filters?: {
      type?: UsageType
      provider?: string
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    },
  ): Promise<{ usage: Usage[]; total: number }> {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    const skip = (page - 1) * limit

    const where: {
      userId: string
      type?: UsageType
      provider?: string
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {
      userId,
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.provider) {
      where.provider = filters.provider
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    const [usage, total] = await Promise.all([
      prisma.usage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.usage.count({ where }),
    ])

    return { usage, total }
  }

  /**
   * @method getTotalCost
   * @description Get total cost for a user
   */
  async getTotalCost(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where: {
      userId: string
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {
      userId,
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = startDate
      }
      if (endDate) {
        where.createdAt.lte = endDate
      }
    }

    const result = await prisma.usage.aggregate({
      where,
      _sum: {
        cost: true,
      },
    })

    return result._sum.cost ?? 0
  }

  /**
   * @method checkIdempotency
   * @description Check if requestId already exists (for idempotency)
   */
  async checkIdempotency(requestId: string): Promise<Usage | null> {
    if (!requestId) {
      return null
    }

    return prisma.usage.findFirst({
      where: {
        requestId,
      },
    })
  }
}

