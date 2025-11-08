/**
 * @class IntentClassifier
 * @description Classifies user intent to route to appropriate AI model
 */

/**
 * @type IntentType
 * @description Types of intent that can be classified
 */
export type IntentType =
  | 'creative_writing'
  | 'code_development'
  | 'data_analysis'
  | 'research'
  | 'image_generation'
  | 'conversation'
  | 'summarization'
  | 'translation'
  | 'specialized_knowledge'

/**
 * @interface IntentClassification
 * @description Result of intent classification
 */
export interface IntentClassification {
  intent: IntentType
  confidence: number
  subCategory?: string
}

export class IntentClassifier {
  private apiKey: string
  private baseURL: string

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey
    this.baseURL = baseURL || 'https://api.openai.com/v1'
  }

  /**
   * @method classifyIntent
   * @description Classify user query intent
   */
  async classifyIntent(query: string): Promise<IntentClassification> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Você é um classificador de intenções. Analise a consulta do usuário e determine a categoria mais apropriada entre: creative_writing, code_development, data_analysis, research, image_generation, conversation, summarization, translation, specialized_knowledge.

Responda apenas com um JSON no formato:
{
  "intent": "categoria_escolhida",
  "confidence": 0.XX,
  "subCategory": "subcategoria_específica"
}

Onde confidence é um número entre 0 e 1 representando sua confiança na classificação.`,
            },
            { role: 'user', content: query },
          ],
          temperature: 0.1,
          max_tokens: 150,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''

      try {
        return JSON.parse(content) as IntentClassification
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]) as IntentClassification
        }
        throw new Error('Invalid JSON format')
      }
    } catch (error) {
      console.error('Erro ao classificar intenção:', error)
      // Fallback para conversação geral
      return {
        intent: 'conversation',
        confidence: 0.5,
      }
    }
  }

  /**
   * @method extractKeywords
   * @description Extract keywords from query to improve classification
   */
  async extractKeywords(query: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Extraia as 3-5 palavras-chave mais relevantes da consulta. Responda apenas com as palavras separadas por vírgula, sem explicações.`,
            },
            { role: 'user', content: query },
          ],
          temperature: 0.1,
          max_tokens: 50,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      return content
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    } catch (error) {
      console.error('Erro ao extrair palavras-chave:', error)
      return []
    }
  }
}

