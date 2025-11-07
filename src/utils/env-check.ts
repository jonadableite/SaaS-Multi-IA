/**
 * @utility envCheck
 * @description Utility to check and validate environment variables with helpful error messages
 * @note This should only be used in server-side code (Node.js environment)
 */

// Check if we're in Node.js environment
const isNodeEnv = typeof process !== 'undefined' && process.env && typeof window === 'undefined'

export function checkRedisConfig() {
  // Only run in Node.js environment
  if (!isNodeEnv) return false
  const redisUrl = process.env.REDIS_URL
  const reidsUrl = process.env.REIDS_URL // Common typo check

  if (reidsUrl && !redisUrl) {
    console.warn(
      '⚠️ [ENV] Found REIDS_URL (typo) but not REDIS_URL. Please use REDIS_URL instead.',
    )
  }

  if (!redisUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ [ENV] REDIS_URL not found. Some features may not work correctly.',
      )
      console.warn(
        '⚠️ [ENV] Set REDIS_URL in your .env file to enable Redis features.',
      )
    }
    return false
  }

  // Validate Redis URL format
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    console.warn(
      `⚠️ [ENV] REDIS_URL format may be incorrect: ${redisUrl.substring(0, 20)}...`,
    )
    console.warn(
      '⚠️ [ENV] Expected format: redis://username:password@host:port or redis://host:port',
    )
  }

  return true
}

export function checkSMTPConfig() {
  // Only run in Node.js environment
  if (!isNodeEnv) return false
  
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUsername = process.env.SMTP_USERNAME
  const smtpPassword = process.env.SMTP_PASSWORD

  if (!smtpHost || !smtpPort) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ [ENV] SMTP_HOST or SMTP_PORT not found. Email sending may fail.',
      )
    }
    return false
  }

  if (!smtpUsername || !smtpPassword) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ [ENV] SMTP_USERNAME or SMTP_PASSWORD not found. SMTP authentication may fail.',
      )
    }
    return false
  }

  return true
}

// Run checks on import (only in development and Node.js environment)
if (isNodeEnv && process.env.NODE_ENV === 'development') {
  checkRedisConfig()
  checkSMTPConfig()
}

