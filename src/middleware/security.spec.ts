import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SecurityService } from './security'
import { AppError } from '@/utils/app-error'

describe('SecurityService', () => {
  let service: SecurityService

  beforeEach(() => {
    service = new SecurityService()
    vi.clearAllMocks()
  })

  describe('validateURL', () => {
    it('should allow valid HTTPS URLs', async () => {
      const result = await service.validateURL('https://api.example.com', {
        requireHTTPS: true,
      })

      expect(result).toBe(true)
    })

    it('should reject HTTP when HTTPS required', async () => {
      await expect(
        service.validateURL('http://api.example.com', {
          requireHTTPS: true,
        }),
      ).rejects.toThrow(AppError)
    })

    it('should allow URLs from whitelist', async () => {
      const result = await service.validateURL('https://api.example.com', {
        allowedDomains: ['example.com', 'api.example.com'],
      })

      expect(result).toBe(true)
    })

    it('should reject URLs not in whitelist', async () => {
      await expect(
        service.validateURL('https://malicious.com', {
          allowedDomains: ['example.com'],
        }),
      ).rejects.toThrow(AppError)
    })

    it('should reject private IP addresses', async () => {
      await expect(
        service.validateURL('http://192.168.1.1', {
          blockPrivateIPs: true,
        }),
      ).rejects.toThrow(AppError)

      await expect(
        service.validateURL('http://127.0.0.1', {
          blockPrivateIPs: true,
        }),
      ).rejects.toThrow(AppError)

      await expect(
        service.validateURL('http://10.0.0.1', {
          blockPrivateIPs: true,
        }),
      ).rejects.toThrow(AppError)
    })

    it('should reject invalid URLs', async () => {
      await expect(service.validateURL('not-a-url', {})).rejects.toThrow(
        AppError,
      )
    })
  })

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const output = service.sanitizeString(input)

      expect(output).not.toContain('<script>')
      expect(output).not.toContain('</script>')
      expect(output).toContain('Hello')
    })

    it('should escape special characters', () => {
      const input = '<>&"\'/'
      const output = service.sanitizeString(input)

      expect(output).toContain('&lt;')
      expect(output).toContain('&gt;')
      expect(output).toContain('&amp;')
      expect(output).toContain('&quot;')
      expect(output).toContain('&#x27;')
      expect(output).toContain('&#x2F;')
    })

    it('should normalize whitespace', () => {
      const input = '  Hello   World  '
      const output = service.sanitizeString(input)

      expect(output).toBe('Hello World')
    })

    it('should handle empty strings', () => {
      const output = service.sanitizeString('')
      expect(output).toBe('')
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize string values', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
      }

      const output = service.sanitizeObject(input)

      expect(output.name).not.toContain('<script>')
      expect(output.email).toBe('test@example.com')
    })

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          bio: '  Multiple   spaces  ',
        },
      }

      const output = service.sanitizeObject(input)

      expect(output.user.name).not.toContain('<b>')
      expect(output.user.bio).toBe('Multiple spaces')
    })

    it('should sanitize arrays', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2', '  tag3  '],
      }

      const output = service.sanitizeObject(input)

      expect(output.tags[0]).not.toContain('<script>')
      expect(output.tags[1]).toBe('tag2')
      expect(output.tags[2]).toBe('tag3')
    })

    it('should skip specified fields', () => {
      const input = {
        name: '<script>test</script>',
        htmlContent: '<div>Allowed HTML</div>',
      }

      const output = service.sanitizeObject(input, ['htmlContent'])

      expect(output.name).not.toContain('<script>')
      expect(output.htmlContent).toBe('<div>Allowed HTML</div>')
    })

    it('should handle null and undefined', () => {
      const input = {
        name: null,
        email: undefined,
        value: 'test',
      }

      const output = service.sanitizeObject(input)

      expect(output.name).toBeNull()
      expect(output.email).toBeUndefined()
      expect(output.value).toBe('test')
    })
  })

  describe('logSecurityEvent', () => {
    it('should log security events', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await service.logSecurityEvent('SSRF_ATTEMPT', {
        url: 'http://192.168.1.1',
        ip: '10.0.0.1',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY EVENT]'),
        expect.any(Object),
      )

      consoleSpy.mockRestore()
    })
  })
})

