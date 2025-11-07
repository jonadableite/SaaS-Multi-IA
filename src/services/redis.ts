import { Redis } from "ioredis";
import { checkRedisConfig } from "@/utils/env-check";

/**
 * Redis singleton instance for job queue
 * @description Ensures a single Redis connection across the Next.js app directory
 */
declare global {
  // Allow global var for Redis in Node.js
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
  // Track connection state to avoid spam
  // eslint-disable-next-line no-var
  var _redisConnectionAttempted: boolean | undefined;
  // BullMQ-specific Redis instance
  // eslint-disable-next-line no-var
  var _bullmqRedis: Redis | undefined;
}

// Type guard for Node.js environment
const isNodeEnv =
  typeof process !== "undefined" &&
  process.env &&
  typeof window === "undefined";

// Check Redis config on module load (only in Node.js environment)
if (isNodeEnv && process.env.NODE_ENV === "development") {
  checkRedisConfig();
}

// Track error logging to avoid spam
let lastErrorTime = 0;
const ERROR_LOG_INTERVAL = 10000; // Only log errors every 10 seconds

const getRedisUrl = () => {
  // Only access process.env in Node.js
  if (!isNodeEnv) return null;

  // Try REDIS_URL first (check for common typo too)
  const redisUrl = process.env.REDIS_URL || process.env.REIDS_URL;

  if (redisUrl) {
    // If it's a full URL, use it directly
    if (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://")) {
      return redisUrl;
    }
    // If it's just a host, construct the URL
    return `redis://${redisUrl}`;
  }

  // Do not fallback to localhost when REDIS_URL is missing.
  // This avoids noisy connection attempts and write errors during development.
  return null;
};

const redisUrl = getRedisUrl();

// Helper to get globalThis safely
const getGlobal = () => {
  if (typeof globalThis !== "undefined") {
    return globalThis as any;
  }
  if (typeof global !== "undefined") {
    return global as any;
  }
  return null;
};

// Track connection state to prevent multiple simultaneous connections
let isConnecting = false;

// Helper to check if Redis connection is ready
const isRedisReady = (redisInstance: Redis | null): boolean => {
  if (!redisInstance) return false;
  const status = redisInstance.status;
  return status === "ready" || status === "connect";
};

// Only create Redis instance if we have a URL and we're in Node.js
const redis =
  redisUrl && isNodeEnv
    ? (() => {
        const globalObj = getGlobal();
        // Return existing instance if available and ready
        if (globalObj?._redis && isRedisReady(globalObj._redis)) {
          return globalObj._redis;
        }
        // Prevent multiple simultaneous connection attempts
        if (isConnecting) {
          console.log("[Redis] Connection already in progress, waiting...");
          return globalObj?._redis ?? null;
        }
        isConnecting = true;
        return (
          globalObj?._redis ??
          new Redis(redisUrl, {
            retryStrategy: (times) => {
              // Stop retrying after 5 attempts to avoid spam
              if (times > 5) {
                isConnecting = false;
                return null;
              }
              const delay = Math.min(times * 50, 2000);
              console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
              return delay;
            },
            reconnectOnError: (err) => {
              // Suppress "Stream isn't writeable" errors - these happen during connection state transitions
              if (
                err.message?.includes("Stream isn't writeable") ||
                err.message?.includes("enableOfflineQueue")
              ) {
                return false; // Don't reconnect, just suppress the error
              }
              // Only reconnect on specific errors
              const targetError = "READONLY";
              if (err.message.includes(targetError)) {
                return true;
              }
              return false;
            },
            enableOfflineQueue: true, // IMPORTANTE: habilitar queue para evitar erros de stream
            keepAlive: 30000, // Keep connection alive
            family: 4, // Use IPv4
            connectTimeout: 10000, // Increase timeout
            lazyConnect: false, // Connect immediately
            showFriendlyErrorStack: false, // Reduce stack trace noise
            enableReadyCheck: true, // Enable ready check
            maxRetriesPerRequest: 3, // Limit retries per request
          })
        );
      })()
    : (null as unknown as Redis);

// Handle connection errors gracefully with debouncing
if (redis && isNodeEnv) {
  redis.on("error", (err) => {
    const now = Date.now();
    // Only log errors if enough time has passed since last error
    if (now - lastErrorTime > ERROR_LOG_INTERVAL) {
      lastErrorTime = now;

      // Only log in development, suppress in production
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Redis] Connection error (this is normal if Redis is not running): ${err.message}`,
        );
        if (redisUrl) {
          console.warn(
            `[Redis] Attempting to connect to: ${redisUrl.replace(/:[^:@]+@/, ":****@")}`,
          );
        }
      }
    }
    // Suppress unhandled error events by not throwing
  });

  // Handle connection success
  redis.on("connect", () => {
    lastErrorTime = 0; // Reset error timer on successful connection
    isConnecting = false;
    if (process.env.NODE_ENV === "development") {
      console.log("[Redis] Connected successfully");
    }
  });

  // Handle ready state
  redis.on("ready", () => {
    isConnecting = false;
    if (process.env.NODE_ENV === "development") {
      console.log("[Redis] Ready to accept commands");
    }
  });

  // Handle connection close
  redis.on("close", () => {
    isConnecting = false;
    if (process.env.NODE_ENV === "development") {
      console.log("[Redis] Connection closed");
    }
  });

  // Try to connect only once if REDIS_URL is provided
  const globalObj = getGlobal();
  if (globalObj && !globalObj._redisConnectionAttempted && redisUrl) {
    globalObj._redisConnectionAttempted = true;

    // Small delay to avoid immediate connection attempts
    setTimeout(async () => {
      try {
        // Only connect if not already connected
        if (redis.status !== "ready" && redis.status !== "connecting") {
          await redis.connect();
        }
      } catch (err: any) {
        isConnecting = false;
        // Log error once but don't fail the application
        if (process.env.NODE_ENV === "development") {
          console.warn(`[Redis] Failed to connect: ${err.message}`);
          console.warn(
            "[Redis] Continuing without Redis cache - some features may be limited",
          );
          const maskedUrl = redisUrl.replace(/:[^:@]+@/, ":****@");
          console.warn(`[Redis] Check your REDIS_URL: ${maskedUrl}`);
          console.warn(
            "[Redis] Verify the URL format: redis://username:password@host:port",
          );
        }
      }
    }, 100);
  }
}

// Store in global to prevent multiple instances (only in Node.js)
if (isNodeEnv && process.env.NODE_ENV !== "production" && redis) {
  const globalObj = getGlobal();
  if (globalObj) {
    globalObj._redis = redis;
  }
}

// Create a safe wrapper that checks connection status before operations
const safeRedis = redis
  ? (new Proxy(redis, {
      get(target, prop) {
        // For methods that write to Redis, check connection status first
        const writeMethods = [
          "get",
          "set",
          "del",
          "incr",
          "expire",
          "exists",
          "hget",
          "hset",
          "hdel",
          "sadd",
          "srem",
        ];

        if (writeMethods.includes(prop as string)) {
          return async (...args: any[]) => {
            try {
              // Check if connection is ready before attempting operation
              if (!isRedisReady(target)) {
                if (process.env.NODE_ENV === "development") {
                  // Only log in development to avoid spam
                  const now = Date.now();
                  if (now - lastErrorTime > ERROR_LOG_INTERVAL) {
                    lastErrorTime = now;
                    console.warn(
                      `[Redis] Skipping ${String(prop)} operation - connection not ready (status: ${target.status})`,
                    );
                  }
                }
                // Return safe defaults for read operations
                if (prop === "get" || prop === "hget" || prop === "exists") {
                  return null;
                }
                // Return success for write operations (they'll just fail silently)
                return "OK";
              }

              // Connection is ready, execute the operation
              return await (target as any)[prop](...args);
            } catch (error: any) {
              // Suppress "Stream isn't writeable" errors silently
              if (
                error?.message?.includes("Stream isn't writeable") ||
                error?.message?.includes("enableOfflineQueue") ||
                error?.message?.includes(
                  "Stream isn't writeable and enableOfflineQueue options is false",
                )
              ) {
                // Silently return safe defaults without logging
                if (prop === "get" || prop === "hget" || prop === "exists") {
                  return null;
                }
                return "OK";
              }
              // Re-throw other errors
              throw error;
            }
          };
        }

        // For non-write methods, return as-is
        return (target as any)[prop];
      },
    }) as Redis)
  : ({
      get: async () => null,
      set: async () => "OK",
      del: async () => 0,
      incr: async () => 1,
      expire: async () => 0,
      exists: async () => 0,
      on: () => {},
      connect: async () => {},
      disconnect: () => {},
      status: "end" as const,
    } as unknown as Redis);

// Export safe Redis wrapper
export default safeRedis;

/**
 * Create a Redis instance specifically for BullMQ
 * BullMQ requires maxRetriesPerRequest to be null
 */
export const createBullMQRedis = (): Redis | null => {
  if (!redisUrl || !isNodeEnv) {
    return null;
  }

  const globalObj = getGlobal();
  // Check if we already have a BullMQ Redis instance
  if (globalObj?._bullmqRedis && isRedisReady(globalObj._bullmqRedis)) {
    return globalObj._bullmqRedis;
  }

  // Create new instance for BullMQ with required configuration
  const bullmqRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // REQUIRED by BullMQ
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      if (times > 5) {
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    reconnectOnError: (err) => {
      if (
        err.message?.includes("Stream isn't writeable") ||
        err.message?.includes("enableOfflineQueue")
      ) {
        return false;
      }
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  // Store in global for reuse
  if (globalObj && process.env.NODE_ENV !== "production") {
    globalObj._bullmqRedis = bullmqRedis;
  }

  return bullmqRedis;
};
