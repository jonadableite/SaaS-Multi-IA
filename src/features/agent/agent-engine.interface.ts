/**
 * @interface AgentStep
 * @description Represents a step in an agent's execution flow
 */
export interface AgentStep {
  name: string
  type: 'chat' | 'tool' | 'api'
  model?: string
  prompt?: string
  tool?: string
  config?: Record<string, unknown>
}

/**
 * @interface AgentConfig
 * @description Complete configuration for an agent execution
 */
export interface AgentConfig {
  id: string
  name: string
  prompt: string
  model: string
  provider: string
  steps: AgentStep[]
  knowledge?: Record<string, unknown>
  tools?: string[]
  temperature?: number
  maxTokens?: number
}

/**
 * @interface AgentContext
 * @description Context available during agent execution
 */
export interface AgentContext {
  originalInput: string
  userId: string
  memory: Array<{
    key: string
    value: string
    category?: string
  }>
  variables?: Record<string, unknown>
}

/**
 * @interface AgentExecutionResult
 * @description Result of agent execution
 */
export interface AgentExecutionResult {
  output: string
  stepsExecuted: number
  executionTime: number
  metadata?: Record<string, unknown>
}

