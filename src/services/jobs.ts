import { createBullMQAdapter } from "@igniter-js/adapter-bullmq";
import { store } from "./store";
import { z } from "zod";
import { igniter } from "@/igniter";
import { AppConfig } from "@/config/boilerplate.config.client";

/**
 * Check if we're in Node.js environment (server-side only)
 */
const isNodeEnv =
  typeof process !== "undefined" &&
  process.env &&
  typeof window === "undefined";

/**
 * Job queue adapter for background processing
 * @description Handles asynchronous job processing with BullMQ
 * @note Only available on server-side
 */
let jobsAdapter: ReturnType<typeof createBullMQAdapter> | null = null;

// Initialize jobs only when Redis is configured
if (isNodeEnv && process.env.REDIS_URL) {
  try {
    jobsAdapter = createBullMQAdapter({
      store,
      autoStartWorker: {
        concurrency: 1,
        debug: true,
      },
    });
  } catch (error) {
    // Log error but don't fail - jobs will be null
    if (process.env.NODE_ENV === "development") {
      console.warn("[Jobs] Failed to initialize job adapter:", error);
    }
  }
}

// Export jobs - use adapter if available, otherwise create a no-op wrapper for client-side
export const jobs =
  jobsAdapter ||
  ({
    router: () => ({
      namespace: "",
      jobs: {},
    }),
    register: () => ({
      name: "",
      input: z.any(),
      handler: async () => ({}),
      options: {},
    }),
    merge: (routes: any) => routes,
  } as any);

/**
 * @description Calculate cost based on provider and model
 */
function calculateCost(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  // Pricing per 1M tokens (example rates - should be configurable)
  const pricing: Record<
    string,
    Record<string, { input: number; output: number }>
  > = {
    openai: {
      "gpt-4o": { input: 2.5, output: 10 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "gpt-4-turbo": { input: 10, output: 30 },
      "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
    },
    anthropic: {
      "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
      "claude-3-5-haiku-20241022": { input: 0.8, output: 4 },
      "claude-3-opus-20240229": { input: 15, output: 75 },
    },
    google: {
      "gemini-2.0-flash-exp": { input: 0, output: 0 }, // Free tier
      "gemini-1.5-pro": { input: 1.25, output: 5 },
      "gemini-1.5-flash": { input: 0.075, output: 0.3 },
    },
  };

  const providerPricing = pricing[provider];
  if (!providerPricing) {
    // Default pricing if provider not found
    return (tokensIn * 0.001 + tokensOut * 0.002) / 1000000;
  }

  const modelPricing = providerPricing[model];
  if (!modelPricing) {
    // Default pricing for model
    return (tokensIn * 0.001 + tokensOut * 0.002) / 1000000;
  }

  const inputCost = (tokensIn / 1000000) * modelPricing.input;
  const outputCost = (tokensOut / 1000000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * @function createUsageJobs
 * @description Create usage jobs router (inline to avoid circular dependency)
 */
function createUsageJobs() {
  if (!isNodeEnv || !jobsAdapter) {
    // Return empty router structure for client-side
    return {
      namespace: "usage",
      jobs: {},
    } as any;
  }

  return jobsAdapter.router({
    namespace: "usage",
    jobs: {
      processBilling: jobsAdapter.register({
        name: "processBilling",
        input: z.object({
          event: z.object({
            userId: z.string(),
            model: z.string(),
            provider: z.string(),
            type: z.enum([
              "CHAT",
              "IMAGE",
              "AUDIO",
              "VIDEO",
              "AGENT",
              "EMBEDDING",
              "TRANSCRIPTION",
            ]),
            tokensIn: z.number().int().nonnegative(),
            tokensOut: z.number().int().nonnegative(),
            cost: z.number().nonnegative(),
            requestId: z.string(),
            conversationId: z.string().optional(),
            agentId: z.string().optional(),
            usageId: z.string().optional(),
          }),
          timestamp: z.string().datetime(),
        }),
        handler: async ({ input }) => {
          const { event } = input;
          // Dynamic imports to avoid circular dependency
          const { CreditService } = await import(
            "@/features/usage/services/credit.service"
          );
          const { UsageService } = await import(
            "@/features/usage/services/usage.service"
          );
          const { logger } = await import("@/services/logger");
          const { AppError, AppErrorCode } = await import("@/utils/app-error");
          const { prisma } = await import("@/services/prisma");

          const creditService = new CreditService();
          const usageService = new UsageService();

          try {
            // Check idempotency
            if (event.requestId) {
              const existing = await usageService.checkIdempotency(
                event.requestId,
              );
              if (existing) {
                logger.info(
                  `Usage event already processed: ${event.requestId}`,
                );
                return {
                  success: true,
                  message: "Already processed",
                  usageId: existing.id,
                };
              }
            }

            // Calculate cost (override if needed)
            const finalCost = calculateCost(
              event.provider,
              event.model,
              event.tokensIn,
              event.tokensOut,
            );

            // Check and deduct credits in transaction
            const creditsAfter = await creditService.deductCredits(
              event.userId,
              Math.ceil(finalCost * 100), // Convert to credits (1 credit = $0.01)
              event.usageId || event.requestId, // Use usageId if available
            );

            // Update usage record with final cost if usageId is provided
            if (event.usageId) {
              await prisma.usage.update({
                where: { id: event.usageId },
                data: { cost: finalCost },
              });
            }

            logger.info(
              `Billing processed for user ${event.userId}: ${finalCost} credits deducted, remaining: ${creditsAfter}`,
            );

            return {
              success: true,
              cost: finalCost,
              creditsRemaining: creditsAfter,
            };
          } catch (error) {
            logger.error("Error processing billing:", error);

            if (error instanceof AppError) {
              throw error;
            }

            throw new AppError(
              {
                code: AppErrorCode.BILLING_ERROR,
                message: `Failed to process billing: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
              500,
            );
          }
        },
        options: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      }),
    },
  });
}

// Check if jobs are available
export const hasJobs = isNodeEnv && jobsAdapter !== null;

// Create registeredJobs - use adapter if available, otherwise create a minimal compatible structure
let _registeredJobs: any;

if (hasJobs && jobsAdapter) {
  _registeredJobs = jobsAdapter.merge({
    webhook: jobsAdapter.router({
      namespace: "webhook",
      jobs: {
        dispatch: jobsAdapter.register({
          name: "dispatch",
          input: z.object({
            webhook: z.object({
              id: z.string(),
              url: z.string().url(),
              secret: z.string(),
              events: z.array(z.string()),
            }),
            payload: z.record(z.string(), z.any()), // Dynamic payload for the webhook
            eventName: z.string(), // The specific event that triggered the webhook
            retries: z.number().default(0), // Number of retry attempts
          }),
          handler: async ({ input }) => {
            // Business Logic: Attempt to dispatch the webhook
            try {
              igniter.logger.info(
                `Dispatching webhook ${input.webhook.id} for event ${input.eventName} to ${input.webhook.url}`,
              );

              const response = await fetch(input.webhook.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-App-Name": AppConfig.name,
                  "X-Webhook-Secret": input.webhook.secret,
                  "X-Event-Name": input.eventName,
                },
                body: JSON.stringify(input.payload),
              });

              if (!response.ok) {
                // Observation: Webhook dispatch failed, throw an error to trigger retry
                const errorText = await response.text();
                throw new Error(
                  `Webhook dispatch failed with status ${response.status}: ${errorText}`,
                );
              }

              igniter.logger.info(
                `Webhook ${input.webhook.id} dispatched successfully for event ${input.eventName}`,
              );
            } catch (error: any) {
              igniter.logger.error(
                `Failed to dispatch webhook ${input.webhook.id} for event ${input.eventName}: ${error.message}`,
              );

              throw error;
            }
          },
        }),
      },
    }),
    usage: createUsageJobs(),
  });
} else {
  // Create a minimal compatible structure for client-side
  // This prevents Igniter from trying to call createProxy on undefined
  _registeredJobs = {
    webhook: {
      namespace: "webhook",
      jobs: {},
    },
    usage: {
      namespace: "usage",
      jobs: {},
    },
  };
}

export const registeredJobs = _registeredJobs;
