import { igniter } from "@/igniter";
import redis from "@/services/redis";
import { AppError, AppErrorCode } from "@/utils/app-error";

/**
 * @interface RateLimitConfig
 * @description Configuration for rate limiting
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;
  /**
   * Time window in seconds
   */
  window: number;
  /**
   * Key prefix for Redis storage
   */
  keyPrefix?: string;
  /**
   * Whether to skip rate limiting (for development)
   */
  skip?: boolean;
}

/**
 * @interface RateLimitResult
 * @description Result of rate limit check
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  /**
   * Total limit
   */
  limit: number;
  /**
   * Remaining requests
   */
  remaining: number;
  /**
   * Time until reset in seconds
   */
  reset: number;
}

/**
 * @class RateLimitService
 * @description Service for managing rate limiting with Redis
 */
export class RateLimitService {
  /**
   * @method checkRateLimit
   * @description Check if request is within rate limit
   */
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    // Skip rate limiting in development if configured
    if (config.skip && process.env.NODE_ENV !== "production") {
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        reset: config.window,
      };
    }

    const key = `${config.keyPrefix || "ratelimit"}:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % config.window);

    // Get current count
    const current = await redis.get(`${key}:${windowStart}`);
    const count = current ? parseInt(current, 10) : 0;

    // Check if limit exceeded
    if (count >= config.limit) {
      const reset = windowStart + config.window - now;
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        reset,
      };
    }

    // Increment counter
    const newCount = await redis.incr(`${key}:${windowStart}`);
    await redis.expire(`${key}:${windowStart}`, config.window);

    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - newCount),
      reset: windowStart + config.window - now,
    };
  }

  /**
   * @method resetRateLimit
   * @description Reset rate limit for identifier (admin only)
   */
  async resetRateLimit(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<void> {
    const key = `${config.keyPrefix || "ratelimit"}:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % config.window);

    await redis.del(`${key}:${windowStart}`);
  }
}

/**
 * @function createRateLimitProcedure
 * @description Create a rate limit procedure for Igniter.js
 */
export function createRateLimitProcedure(config: RateLimitConfig) {
  const rateLimitService = new RateLimitService();

  return igniter.procedure({
    name: "RateLimitProcedure",
    handler: async (_, { context, request, response }) => {
      // Get user identifier (from session or IP)
      let identifier: string;

      // Try to get authenticated user
      try {
        const session = await context.auth?.getSession?.({
          requirements: "authenticated",
        });

        if (session?.user?.id) {
          identifier = `user:${session.user.id}`;
        } else {
          // Fallback to IP address
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";
          identifier = `ip:${ip}`;
        }
      } catch {
        // If auth fails, use IP
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          "unknown";
        identifier = `ip:${ip}`;
      }

      // Check rate limit
      const result = await rateLimitService.checkRateLimit(identifier, config);

      // Set rate limit headers
      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", result.reset.toString());

      // If limit exceeded, return error
      if (!result.allowed) {
        throw AppError.createRateLimitError(config.limit, result.reset);
      }

      // Continue to next handler
      return {};
    },
  });
}

/**
 * @constant defaultRateLimitConfig
 * @description Default rate limit configuration
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  window: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "60", 10),
  keyPrefix: "ratelimit",
  skip: process.env.NODE_ENV === "development",
};

/**
 * @constant chatRateLimitConfig
 * @description Rate limit configuration for chat endpoints (more restrictive)
 */
export const chatRateLimitConfig: RateLimitConfig = {
  limit: parseInt(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS || "30", 10),
  window: parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_SECONDS || "60", 10),
  keyPrefix: "ratelimit:chat",
  skip: process.env.NODE_ENV === "development",
};
