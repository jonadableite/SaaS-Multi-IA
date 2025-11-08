import type { SocialConnector, SocialResult, SocialSearchOptions } from './provider.interface'
import { logger } from '@/services/logger'

export class FacebookProvider implements SocialConnector {
  name = 'facebook' as const

  private readonly token = process.env.FACEBOOK_ACCESS_TOKEN

  isConfigured(): boolean {
    return !!this.token
  }

  async search(query: string, options: SocialSearchOptions = {}): Promise<SocialResult[]> {
    if (!this.token) {
      logger.warn('[Social:Facebook] Missing FACEBOOK_ACCESS_TOKEN, returning empty results')
      return []
    }
    try {
      const limit = Math.min(options.limit ?? 10, 50)
      const base = 'https://graph.facebook.com/v18.0'
      // Search pages
      const pagesUrl = `${base}/search?type=page&q=${encodeURIComponent(query)}&limit=${limit}&access_token=${this.token}`
      const res = await fetch(pagesUrl)
      if (!res.ok) {
        const text = await res.text()
        logger.error('[Social:Facebook] HTTP error', { status: res.status, text })
        return []
      }
      const data: any = await res.json()
      const results: SocialResult[] = (data?.data || []).map((p: any) => ({
        id: p.id,
        platform: 'facebook',
        type: 'page',
        title: p.name,
        url: `https://www.facebook.com/${p.id}`,
        timestamp: new Date().toISOString(),
        metadata: { category: p.category },
      }))
      logger.debug('[Social:Facebook] Mapped results', { count: results.length })
      return results
    } catch (error: any) {
      logger.error('[Social:Facebook] Fetch failed', { message: error?.message })
      return []
    }
  }
}