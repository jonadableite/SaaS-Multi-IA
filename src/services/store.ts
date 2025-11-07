import redis, { createBullMQRedis } from "./redis";

import { createRedisStoreAdapter } from "@igniter-js/adapter-redis";

/**
 * Store adapter for data persistence
 * @description Provides a unified interface for data storage operations
 * Uses BullMQ-specific Redis instance with maxRetriesPerRequest: null
 */
const bullmqRedis = createBullMQRedis();
export const store = createRedisStoreAdapter(bullmqRedis || redis);
