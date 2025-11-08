export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'instagram'

export interface SocialSearchOptions {
  limit?: number
  lang?: string
}

export interface SocialResult {
  id: string
  platform: SocialPlatform
  type: 'profile' | 'post' | 'page'
  title?: string
  text?: string
  url?: string
  author?: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

export interface SocialConnector {
  name: SocialPlatform
  isConfigured(): boolean
  search(query: string, options?: SocialSearchOptions): Promise<SocialResult[]>
}