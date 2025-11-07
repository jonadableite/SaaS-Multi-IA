/**
 * @file agent-engine.spec.ts
 * @description Unit tests for AgentEngine
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentEngine } from '../features/agent/services/agent-engine.service'
import { AIRouter } from '@/features/ai/ai-router'
import { prisma } from '@/services/prisma'

// Mock dependencies
vi.mock('@/services/prisma', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    memory: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/features/ai/ai-router')

describe('AgentEngine', () => {
  let engine: AgentEngine
  let mockAIRouter: any

  beforeEach(() => {
    mockAIRouter = {
      chat: vi.fn().mockResolvedValue({
        content: 'Test response',
        tokensIn: 10,
        tokensOut: 20,
      }),
    }

    engine = new AgentEngine(mockAIRouter)
  })

  describe('executeAgent', () => {
    it('should execute agent with steps', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'Test Agent',
        prompt: 'You are a helpful assistant',
        model: 'gpt-4-turbo',
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 2000,
        tools: [
          {
            name: 'chat',
            type: 'chat',
            prompt: 'Respond to the user',
          },
        ],
        knowledge: null,
      }

      ;(prisma.agent.findUnique as any).mockResolvedValue(mockAgent)
      ;(prisma.agent.update as any).mockResolvedValue(mockAgent)
      ;(prisma.memory.findMany as any).mockResolvedValue([])

      const result = await engine.executeAgent('agent-123', 'Hello', 'user-123')

      expect(result.output).toBe('Test response')
      expect(result.stepsExecuted).toBe(1)
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { usageCount: { increment: 1 } },
      })
    })

    it('should throw error if agent not found', async () => {
      ;(prisma.agent.findUnique as any).mockResolvedValue(null)

      await expect(
        engine.executeAgent('invalid-id', 'Hello', 'user-123'),
      ).rejects.toThrow('Agent not found')
    })

    it('should execute tool steps', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'Test Agent',
        prompt: 'Test',
        model: 'gpt-4-turbo',
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 2000,
        tools: [
          {
            name: 'calculator',
            type: 'tool',
            tool: 'calculator',
          },
        ],
      }

      ;(prisma.agent.findUnique as any).mockResolvedValue(mockAgent)
      ;(prisma.agent.update as any).mockResolvedValue(mockAgent)
      ;(prisma.memory.findMany as any).mockResolvedValue([])

      const result = await engine.executeAgent('agent-123', '2+2', 'user-123')

      expect(result.stepsExecuted).toBe(1)
      expect(result.output).toContain('Resultado')
    })
  })
})

