import type { SocialResult, SocialSearchOptions, SocialPlatform } from '../providers/provider.interface'
import { TwitterProvider } from '../providers/twitter.provider'
import { LinkedinProvider } from '../providers/linkedin.provider'
import { FacebookProvider } from '../providers/facebook.provider'
import { InstagramProvider } from '../providers/instagram.provider'

export class SocialService {
  private connectors = {
    twitter: new TwitterProvider(),
    linkedin: new LinkedinProvider(),
    facebook: new FacebookProvider(),
    instagram: new InstagramProvider(),
  }

  getAvailableProviders(): SocialPlatform[] {
    return (Object.keys(this.connectors) as SocialPlatform[]).filter(
      (p) => this.connectors[p].isConfigured(),
    )
  }

  async search(platform: SocialPlatform, q: string, options: SocialSearchOptions = {}): Promise<SocialResult[]> {
    const connector = this.connectors[platform]
    if (!connector) return []
    return connector.search(q, options)
  }
}