import type { SocialConnector, SocialResult, SocialSearchOptions } from './provider.interface'
import { logger } from '@/services/logger'

export class InstagramProvider implements SocialConnector {
  name = 'instagram' as const

  private readonly token = process.env.INSTAGRAM_ACCESS_TOKEN

  isConfigured(): boolean {
    return !!this.token
  }

  async search(query: string, options: SocialSearchOptions = {}): Promise<SocialResult[]> {
    if (!this.token) {
      logger.warn('[Social:Instagram] Missing INSTAGRAM_ACCESS_TOKEN, returning empty results')
      return []
    }
    const businessUserId = process.env.INSTAGRAM_BUSINESS_USER_ID
    if (!businessUserId) {
      logger.warn('[Social:Instagram] Missing INSTAGRAM_BUSINESS_USER_ID, returning empty results')
      return []
    }
    try {
      // 1) Find hashtag ID
      const tagUrl = `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${businessUserId}&q=${encodeURIComponent(query)}&access_token=${this.token}`
      const tagRes = await fetch(tagUrl)
      if (!tagRes.ok) {
        const text = await tagRes.text()
        logger.error('[Social:Instagram] Hashtag search error', { status: tagRes.status, text })
        return []
      }
      const tagData: any = await tagRes.json()
      const tagId = tagData?.data?.[0]?.id
      if (!tagId) {
        logger.debug('[Social:Instagram] No hashtag id found')
        return []
      }
      // 2) Fetch recent media for hashtag
      const limit = Math.min(options.limit ?? 10, 50)
      const mediaUrl = `https://graph.facebook.com/v18.0/${tagId}/recent_media?user_id=${businessUserId}&fields=id,caption,permalink,timestamp&limit=${limit}&access_token=${this.token}`
      const mediaRes = await fetch(mediaUrl)
      if (!mediaRes.ok) {
        const text = await mediaRes.text()
        logger.error('[Social:Instagram] Recent media error', { status: mediaRes.status, text })
        return []
      }
      const mediaData: any = await mediaRes.json()
      const results: SocialResult[] = (mediaData?.data || []).map((m: any) => ({
        id: m.id,
        platform: 'instagram',
        type: 'post',
        title: m.caption?.slice(0, 80) || `Post relacionado: ${query}`,
        text: m.caption,
        url: m.permalink,
        timestamp: m.timestamp,
        metadata: {},
      }))
      logger.debug('[Social:Instagram] Mapped results', { count: results.length })
      return results
    } catch (error: any) {
      logger.error('[Social:Instagram] Fetch failed', { message: error?.message })
      return []
    }
  }
}