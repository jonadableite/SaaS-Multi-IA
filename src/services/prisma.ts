import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient()
}

// Helper to get global safely
const getGlobal = () => {
  if (typeof globalThis !== 'undefined') {
    return globalThis as any
  }
  if (typeof global !== 'undefined') {
    return global as any
  }
  return null
}

// Check if we're in Node.js environment (server-side only)
const isNodeEnv =
  typeof process !== 'undefined' &&
  process.env &&
  typeof window === 'undefined'

// Only create Prisma client on server-side
const globalObj = isNodeEnv ? getGlobal() : null

export const prisma = isNodeEnv
  ? (globalObj?.prisma || createPrismaClient())
  : (null as any)

if (isNodeEnv && process.env.NODE_ENV !== 'production' && globalObj) {
  globalObj.prisma = prisma
}
