import { prisma } from '@/services/prisma'
import { AIRouter, type ProviderName } from '@/features/ai/ai-router'
import type {
  AgentStep,
  AgentConfig,
  AgentContext,
  AgentExecutionResult,
} from './agent-engine.interface'
import { AppError, AppErrorCode } from '@/utils/app-error'
import type { ChatOptions } from '@/features/ai/providers/ai-provider.interface'

/**
 * @class AgentEngine
 * @description Engine for executing AI agents with multi-step workflows
 */
export class AgentEngine {
  private aiRouter: AIRouter

  constructor(aiRouter?: AIRouter) {
    this.aiRouter = aiRouter || AIRouter.createFromEnv()
  }

  /**
   * @method executeAgent
   * @description Execute an agent with user input
   */
  async executeAgent(
    agentId: string,
    userInput: string,
    userId: string,
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now()

    // Buscar configuração do agente
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    })

    if (!agent) {
      throw new AppError(
        {
          code: AppErrorCode.NOT_FOUND,
          message: 'Agent not found',
        },
        404,
      )
    }

    // Build configuration
    const config: AgentConfig = {
      id: agent.id,
      name: agent.name,
      prompt: agent.prompt,
      model: agent.model,
      provider: (agent.provider || 'openai') as ProviderName,
      steps: (agent.tools as AgentStep[]) || [],
      knowledge: (agent.knowledge as Record<string, unknown>) || undefined,
      tools: agent.tools ? Object.keys(agent.tools as Record<string, unknown>) : [],
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    }

    // Build context
    const context: AgentContext = {
      originalInput: userInput,
      userId,
      memory: await this.loadMemory(userId),
      variables: {},
    }

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(config, context)

    // Execute steps
    let result = userInput
    let stepsExecuted = 0

    for (const step of config.steps) {
      try {
        result = await this.executeStep(step, result, systemPrompt, config, context)
        stepsExecuted++
      } catch (error) {
        throw new AppError(
          {
            code: AppErrorCode.AI_PROVIDER_ERROR,
            message: `Error executing step ${step.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
          500,
        )
      }
    }

    // Increment usage count
    await prisma.agent.update({
      where: { id: agentId },
      data: { usageCount: { increment: 1 } },
    })

    const executionTime = Date.now() - startTime

    return {
      output: result,
      stepsExecuted,
      executionTime,
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        stepsTotal: config.steps.length,
      },
    }
  }

  /**
   * @method executeStep
   * @description Execute a single step in the agent workflow
   */
  private async executeStep(
    step: AgentStep,
    input: string,
    systemPrompt: string,
    config: AgentConfig,
    context: AgentContext,
  ): Promise<string> {
    switch (step.type) {
      case 'chat':
        return this.executeChatStep(step, input, systemPrompt, config)
      case 'tool':
        return this.executeToolStep(step, input, context)
      case 'api':
        return this.executeApiStep(step, input, context)
      default:
        return input
    }
  }

  /**
   * @method executeChatStep
   * @description Execute a chat step using AI
   */
  private async executeChatStep(
    step: AgentStep,
    input: string,
    systemPrompt: string,
    config: AgentConfig,
  ): Promise<string> {
    const messages: ChatOptions['messages'] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: step.prompt || input },
    ]

    const model = step.model || config.model
    const provider = config.provider

    const response = await this.aiRouter.chat(provider, {
      messages,
      model,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
    })

    return response.content
  }

  /**
   * @method executeToolStep
   * @description Execute a tool step
   */
  private async executeToolStep(
    step: AgentStep,
    input: string,
    context: AgentContext,
  ): Promise<string> {
    if (!step.tool) {
      return input
    }

    switch (step.tool) {
      case 'web_search':
        return this.webSearch(input)
      case 'image_gen':
        return this.generateImage(input)
      case 'calculator':
        return this.calculate(input)
      case 'memory_store':
        return this.storeMemory(input, context)
      default:
        return input
    }
  }

  /**
   * @method executeApiStep
   * @description Execute an API step
   */
  private async executeApiStep(
    step: AgentStep,
    input: string,
    context: AgentContext,
  ): Promise<string> {
    if (!step.config?.url) {
      throw new AppError(
        {
          code: AppErrorCode.VALIDATION_ERROR,
          message: 'API step requires config.url',
        },
        400,
      )
    }

    try {
      const url = step.config.url as string
      const method = (step.config.method as string) || 'POST'
      const headers = (step.config.headers as Record<string, string>) || {}

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          input,
          context: context.variables,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.result || data.output || JSON.stringify(data)
    } catch (error) {
      console.error('API step error:', error)
      return `Error calling API: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  /**
   * @method buildSystemPrompt
   * @description Build system prompt from agent configuration and context
   */
  private buildSystemPrompt(config: AgentConfig, context: AgentContext): string {
    let prompt = config.prompt

    // Add knowledge base
    if (config.knowledge) {
      prompt += '\n\nBase de conhecimento:\n' + JSON.stringify(config.knowledge, null, 2)
    }

    // Add user memories
    if (context.memory && context.memory.length > 0) {
      prompt += '\n\nMemórias do usuário:\n'
      context.memory.forEach((m) => {
        prompt += `- ${m.key}: ${m.value}\n`
      })
    }

    // Add available tools
    if (config.tools && config.tools.length > 0) {
      prompt += '\n\nFerramentas disponíveis:\n'
      config.tools.forEach((tool) => {
        prompt += `- ${tool}\n`
      })
    }

    return prompt
  }

  /**
   * @method loadMemory
   * @description Load user memories from database
   */
  private async loadMemory(userId: string): Promise<AgentContext['memory']> {
    if (!prisma) {
      return []
    }

    try {
      const memories = await prisma.memory.findMany({
        where: { userId },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      })

      return memories.map((m) => ({
        key: m.key,
        value: m.value,
        category: m.category || undefined,
      }))
    } catch (error) {
      console.error('Error loading memory:', error)
      return []
    }
  }

  /**
   * @method webSearch
   * @description Execute web search (placeholder - implement with Tavily, Serper, etc.)
   */
  private async webSearch(query: string): Promise<string> {
    // TODO: Implement with Tavily, Serper, or similar
    return `[Web Search] Resultados da busca para: ${query}\n\nNota: Web search ainda não implementado.`
  }

  /**
   * @method generateImage
   * @description Generate image (placeholder)
   */
  private async generateImage(prompt: string): Promise<string> {
    // TODO: Implement with DALL-E, Midjourney, etc.
    return `[Image Generation] Imagem gerada para: ${prompt}\n\nNota: Geração de imagem ainda não implementada.`
  }

  /**
   * @method calculate
   * @description Safe calculation (using eval - should be replaced with safer alternative)
   */
  private calculate(expression: string): string {
    try {
      // Remove dangerous characters
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
      // eslint-disable-next-line no-eval
      const result = eval(sanitized)
      return `[Calculator] Resultado: ${result}`
    } catch {
      return '[Calculator] Erro no cálculo. Verifique a expressão.'
    }
  }

  /**
   * @method storeMemory
   * @description Store information in user memory
   */
  private async storeMemory(input: string, context: AgentContext): Promise<string> {
    if (!prisma) {
      return input
    }

    try {
      // Extract key-value pairs from input (simple parsing)
      const match = input.match(/(?:store|save|remember)\s+(.+?):\s*(.+)/i)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()

        await prisma.memory.upsert({
          where: {
            userId_key: {
              userId: context.userId,
              key,
            },
          },
          update: {
            value,
            updatedAt: new Date(),
          },
          create: {
            userId: context.userId,
            key,
            value,
          },
        })

        return `[Memory] Armazenado: ${key} = ${value}`
      }

      return input
    } catch (error) {
      console.error('Error storing memory:', error)
      return input
    }
  }
}

