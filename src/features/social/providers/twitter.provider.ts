import type { SocialConnector, SocialResult, SocialSearchOptions } from './provider.interface'
import { logger } from '@/services/logger'

export class TwitterProvider implements SocialConnector {
  name = 'twitter' as const

  private readonly token = process.env.TWITTER_BEARER_TOKEN

  isConfigured(): boolean {
    return !!this.token
  }

  async search(query: string, options: SocialSearchOptions = {}): Promise<SocialResult[]> {
    if (!this.token) {
      logger.warn('[Social:Twitter] Missing TWITTER_BEARER_TOKEN, returning empty results')
      return []
    }
    try {
      const url = new URL('https://api.twitter.com/2/tweets/search/recent')
      url.searchParams.set('query', query)
      url.searchParams.set('max_results', String(Math.min(options.limit ?? 10, 100)))
      url.searchParams.set('tweet.fields', 'author_id,created_at,lang,text')
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        logger.error('[Social:Twitter] HTTP error', { status: res.status, text })
        return []
      }
      const data: any = await res.json()
      const results: SocialResult[] = (data?.data || []).map((t: any) => ({
        id: t.id,
        platform: 'twitter',
        type: 'post',
        title: t.text?.slice(0, 80),
        text: t.text,
        url: `https://x.com/i/web/status/${t.id}`,
        author: t.author_id,
        timestamp: t.created_at,
        metadata: { lang: t.lang },
      }))
      logger.debug('[Social:Twitter] Mapped results', { count: results.length })
      return results
    } catch (error: any) {
      logger.error('[Social:Twitter] Fetch failed', { message: error?.message })
      return []
    }
  }
}