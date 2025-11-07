import { z } from 'zod'
import { igniter } from '@/igniter'
import { AppError, AppErrorCode } from '@/utils/app-error'

/**
 * @interface SSRFConfig
 * @description Configuration for SSRF protection
 */
export interface SSRFConfig {
  /**
   * Allowed domains (whitelist)
   */
  allowedDomains?: string[]
  /**
   * Blocked IP ranges (private, reserved)
   */
  blockPrivateIPs?: boolean
  /**
   * Allow only HTTPS
   */
  requireHTTPS?: boolean
}

/**
 * @class SecurityService
 * @description Service for security operations (SSRF protection, sanitization)
 */
export class SecurityService {
  /**
   * Private IP ranges (RFC 1918 + loopback + reserved)
   */
  private readonly privateIPRanges = [
    // IPv4 private ranges
    { start: '10.0.0.0', end: '10.255.255.255' },
    { start: '172.16.0.0', end: '172.31.255.255' },
    { start: '192.168.0.0', end: '192.168.255.255' },
    // Loopback
    { start: '127.0.0.0', end: '127.255.255.255' },
    // Link-local
    { start: '169.254.0.0', end: '169.254.255.255' },
    // Multicast
    { start: '224.0.0.0', end: '239.255.255.255' },
    // Reserved
    { start: '0.0.0.0', end: '0.255.255.255' },
  ]

  /**
   * @method validateURL
   * @description Validate URL to prevent SSRF attacks
   */
  async validateURL(url: string, config: SSRFConfig = {}): Promise<boolean> {
    try {
      const urlObj = new URL(url)

      // Check scheme
      if (config.requireHTTPS && urlObj.protocol !== 'https:') {
        throw new AppError(
          {
            code: AppErrorCode.VALIDATION_ERROR,
            message: 'Only HTTPS URLs are allowed',
            field: 'url',
          },
          400,
        )
      }

      // Check allowed domains
      if (config.allowedDomains && config.allowedDomains.length > 0) {
        const domain = urlObj.hostname.toLowerCase()
        const isAllowed = config.allowedDomains.some((allowed) => {
          const allowedDomain = allowed.toLowerCase().replace(/^\./, '')
          return domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
        })

        if (!isAllowed) {
          throw new AppError(
            {
              code: AppErrorCode.VALIDATION_ERROR,
              message: `Domain not in allowed list: ${domain}`,
              field: 'url',
              context: { allowedDomains: config.allowedDomains },
            },
            400,
          )
        }
      }

      // Block private IPs if configured
      if (config.blockPrivateIPs !== false) {
        // Resolve hostname to IP (in production, use DNS lookup)
        // For now, check if hostname is already an IP
        const hostname = urlObj.hostname
        if (this.isIPAddress(hostname)) {
          if (this.isPrivateIP(hostname)) {
            throw new AppError(
              {
                code: AppErrorCode.VALIDATION_ERROR,
                message: 'Private IP addresses are not allowed',
                field: 'url',
                context: { ip: hostname },
              },
              400,
            )
          }
        }
      }

      return true
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(
        {
          code: AppErrorCode.VALIDATION_ERROR,
          message: `Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
          field: 'url',
        },
        400,
      )
    }
  }

  /**
   * @method sanitizeString
   * @description Sanitize string input to prevent XSS
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input)
    }

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '')

    // Escape special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()

    return sanitized
  }

  /**
   * @method sanitizeObject
   * @description Recursively sanitize object values
   */
  sanitizeObject<T>(obj: T, fieldsToSanitize?: string[]): T {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj) as T
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, fieldsToSanitize)) as T
    }

    if (typeof obj === 'object') {
      const sanitized = {} as T
      for (const [key, value] of Object.entries(obj)) {
        if (fieldsToSanitize && !fieldsToSanitize.includes(key)) {
          ;(sanitized as Record<string, unknown>)[key] = value
        } else {
          ;(sanitized as Record<string, unknown>)[key] = this.sanitizeObject(
            value,
            fieldsToSanitize,
          )
        }
      }
      return sanitized
    }

    return obj
  }

  /**
   * @method isIPAddress
   * @description Check if string is an IP address
   */
  private isIPAddress(str: string): boolean {
    const ipv4Regex =
      /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

    return ipv4Regex.test(str) || ipv6Regex.test(str)
  }

  /**
   * @method isPrivateIP
   * @description Check if IP is in private range
   */
  private isPrivateIP(ip: string): boolean {
    // Simplified check - in production, use proper IP range library
    const parts = ip.split('.').map(Number)

    if (parts.length !== 4) {
      return false
    }

    // Check private ranges
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 127) ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] >= 224 && parts[0] <= 239) ||
      parts[0] === 0
    )
  }

  /**
   * @method logSecurityEvent
   * @description Log security events for analysis
   */
  async logSecurityEvent(
    event: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    // In production, send to security monitoring system
    console.warn(`[SECURITY EVENT] ${event}:`, details)
  }
}

/**
 * @function createSecurityProcedure
 * @description Create a security procedure for Igniter.js
 */
export function createSecurityProcedure(config?: {
  sanitizeBody?: boolean
  sanitizeQuery?: boolean
  sanitizeFields?: string[]
  validateURLs?: boolean
  ssrfConfig?: SSRFConfig
}) {
  const securityService = new SecurityService()

  return igniter.procedure({
    name: 'SecurityProcedure',
    handler: async (_, { context, request }) => {
      // Sanitize request body
      if (config?.sanitizeBody && request.body) {
        request.body = securityService.sanitizeObject(
          request.body,
          config.sanitizeFields,
        ) as typeof request.body
      }

      // Sanitize query parameters
      if (config?.sanitizeQuery && request.query) {
        request.query = securityService.sanitizeObject(
          request.query,
          config.sanitizeFields,
        ) as typeof request.query
      }

      // Validate URLs if present
      if (config?.validateURLs && config.ssrfConfig) {
        const body = request.body as Record<string, unknown>
        if (body && typeof body === 'object') {
          for (const [key, value] of Object.entries(body)) {
            if (
              key.toLowerCase().includes('url') &&
              typeof value === 'string'
            ) {
              await securityService.validateURL(value, config.ssrfConfig)
            }
          }
        }
      }

      return {}
    },
  })
}

