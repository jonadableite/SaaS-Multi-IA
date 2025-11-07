/**
 * Security configuration for the Multi-IA system
 */

/**
 * @constant allowedDomains
 * @description Whitelist of allowed domains for SSRF protection
 * 
 * Add your production domains here to prevent SSRF attacks
 */
export const allowedDomains = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(',').map((d) => d.trim())
  : [
      // Add your allowed domains here
      'api.openai.com',
      'api.anthropic.com',
      'generativelanguage.googleapis.com',
      'api.openai.com',
      // Add production domains
    ]

/**
 * @constant ssrfConfig
 * @description Default SSRF protection configuration
 */
export const ssrfConfig = {
  allowedDomains,
  blockPrivateIPs: process.env.SSRF_BLOCK_PRIVATE_IPS !== 'false',
  requireHTTPS: process.env.SSRF_REQUIRE_HTTPS === 'true',
}

/**
 * @constant securityConfig
 * @description Security configuration for different environments
 */
export const securityConfig = {
  development: {
    sanitizeBody: true,
    sanitizeQuery: true,
    validateURLs: false, // Less restrictive in dev
    ssrfConfig: {
      ...ssrfConfig,
      blockPrivateIPs: false, // Allow localhost in dev
    },
  },
  staging: {
    sanitizeBody: true,
    sanitizeQuery: true,
    validateURLs: true,
    ssrfConfig,
  },
  production: {
    sanitizeBody: true,
    sanitizeQuery: true,
    validateURLs: true,
    ssrfConfig: {
      ...ssrfConfig,
      requireHTTPS: true,
      blockPrivateIPs: true,
    },
  },
}

/**
 * @function getSecurityConfig
 * @description Get security configuration for current environment
 */
export function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development'
  return securityConfig[env as keyof typeof securityConfig] || securityConfig.development
}

