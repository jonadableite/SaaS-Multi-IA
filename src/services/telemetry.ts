import { createConsoleTelemetryAdapter } from '@igniter-js/core/adapters'
import { store } from './store'

// Only enable Redis-backed telemetry when REDIS_URL is configured
const isNodeEnv = typeof process !== 'undefined' && process.env && typeof window === 'undefined'
const hasRedis = isNodeEnv && !!process.env.REDIS_URL

export const telemetry = createConsoleTelemetryAdapter(
  {
    serviceName: 'SaaS Boilerplate',
    environment: 'development',
    enableTracing: true,
    enableMetrics: true,
    enableEvents: true,
  },
  (() => {
    const opts: any = { enableCliIntegration: !!hasRedis }
    if (hasRedis) {
      opts.store = store // ✅ Redis connection when available
    }
    return opts
  })(),
)
