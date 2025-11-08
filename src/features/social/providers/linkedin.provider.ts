import type { SocialConnector, SocialResult, SocialSearchOptions } from './provider.interface'
import { logger } from '@/services/logger'

export class LinkedinProvider implements SocialConnector {
  name = 'linkedin' as const

  private readonly token = process.env.LINKEDIN_ACCESS_TOKEN

  isConfigured(): boolean {
    return !!this.token
  }

  async search(query: string, options: SocialSearchOptions = {}): Promise<SocialResult[]> {
    if (!this.token) {
      logger.warn('[Social:LinkedIn] Missing LINKEDIN_ACCESS_TOKEN, returning empty results')
      return []
    }
    try {
      // LinkedIn "blended" search (requires appropriate scopes and partner access)
      const url = new URL('https://api.linkedin.com/v2/search')
      url.searchParams.set('q', 'blended')
      url.searchParams.set('keywords', query)
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })
      if (!res.ok) {
        const text = await res.text()
        logger.error('[Social:LinkedIn] HTTP error', { status: res.status, text })
        return []
      }
      const data: any = await res.json()
      const elements = data?.elements || []
      const results: SocialResult[] = elements.map((el: any) => {
        const title = el?.title?.text || el?.hitInfo?.summary || query
        const entity = el?.entity || el?.hitInfo?.entity
        const url = entity?.url || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`
        return {
          id: entity?.entityUrn || el?.id || Math.random().toString(36).slice(2),
          platform: 'linkedin',
          type: 'profile',
          title,
          url,
          timestamp: new Date().toISOString(),
          metadata: { raw: el },
        }
      })
      logger.debug('[Social:LinkedIn] Mapped results', { count: results.length })
      return results
    } catch (error: any) {
      logger.error('[Social:LinkedIn] Fetch failed', { message: error?.message })
      return []
    }
  }
}