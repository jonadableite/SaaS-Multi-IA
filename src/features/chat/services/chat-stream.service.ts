/**
 * @service ChatStreamService
 * @description Service for handling streaming chat responses via SSE
 */
import { AIRouter } from "@/features/ai/ai-router";
import { UsageService } from "@/features/usage/services/usage.service";
import { CreditService } from "@/features/usage/services/credit.service";
import type { ChatMessageBody } from "@/features/message/message.interface";
import { MessageRole } from "@/features/message/message.interface";
import { UsageType } from "@/features/usage/usage.interface";
import { AppError, AppErrorCode } from "@/utils/app-error";
import crypto from "node:crypto";

export interface StreamChunk {
  type: "content" | "metadata" | "done" | "error";
  content?: string;
  metadata?: {
    model?: string;
    provider?: string;
    tokensIn?: number;
    tokensOut?: number;
    conversationId?: string;
    messageId?: string;
  };
  error?: string;
}

export interface StreamContext {
  conversation: {
    conversation: {
      create: (
        userId: string,
        data: { title: string | null },
      ) => Promise<{ id: string }>;
      findUnique: (
        id: string,
        userId: string,
      ) => Promise<{ id: string } | null>;
    };
  };
  message: {
    message: {
      findMany: (
        conversationId: string,
      ) => Promise<Array<{ role: string; content: string }>>;
      create: (data: {
        conversationId: string;
        role: MessageRole;
        content: string;
        model: string | null;
        provider: string | null;
        tokens: number | null;
        cost: number | null;
      }) => Promise<{ id: string }>;
    };
  };
}

/**
 * @class ChatStreamService
 * @description Service for streaming chat responses
 */
export class ChatStreamService {
  private aiRouter: AIRouter;
  private usageService: UsageService;
  private creditService: CreditService;

  constructor(aiRouter: AIRouter) {
    this.aiRouter = aiRouter;
    this.usageService = new UsageService();
    this.creditService = new CreditService();
  }

  /**
   * @method streamChat
   * @description Stream chat response chunks
   */
  async *streamChat(
    userId: string,
    data: ChatMessageBody,
    context: StreamContext,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const requestId = `req_${crypto.randomBytes(16).toString("hex")}`;

    console.log("[ChatStreamService] Starting streamChat", {
      userId,
      hasConversationId: !!data.conversationId,
      model: data.model,
      provider: data.provider,
    });

    // Check idempotency
    const existingUsage = await this.usageService.checkIdempotency(requestId);
    if (existingUsage) {
      console.log("[ChatStreamService] Request already processed");
      yield {
        type: "error",
        error: "Request already processed",
      };
      return;
    }

    let conversationId = data.conversationId;
    let fullContent = "";

    try {
      // Get or create conversation
      console.log("[ChatStreamService] Getting/creating conversation");
      if (!conversationId) {
        const conversation = await context.conversation.conversation.create(
          userId,
          { title: null },
        );
        conversationId = conversation.id;
      } else {
        const conversation = await context.conversation.conversation.findUnique(
          conversationId,
          userId,
        );
        if (!conversation) {
          yield {
            type: "error",
            error: "Conversation not found",
          };
          return;
        }
      }

      // Get conversation history
      console.log("[ChatStreamService] Fetching conversation history");
      const messages = await context.message.message.findMany(conversationId);
      console.log("[ChatStreamService] Found messages:", messages.length);
      const conversationHistory = messages.map((msg) => {
        let role: "user" | "assistant" | "system";
        if (msg.role === MessageRole.USER) {
          role = "user";
        } else if (msg.role === MessageRole.ASSISTANT) {
          role = "assistant";
        } else {
          role = "system";
        }

        return {
          role,
          content: msg.content,
        };
      });

      conversationHistory.push({
        role: "user",
        content: data.content,
      });

      // Save user message
      console.log("[ChatStreamService] Saving user message");
      await context.message.message.create({
        conversationId,
        role: MessageRole.USER,
        content: data.content,
        model: null,
        provider: null,
        tokens: null,
        cost: null,
      });

      // Determine provider
      const provider = data.provider || "openai";
      const model =
        data.model ||
        this.aiRouter.getAvailableModels(
          provider as "openai" | "anthropic" | "google",
        )[0];

      // Ensure user has initial credits (if they have 0 credits)
      await this.creditService.ensureInitialCredits(userId);

      // Check credits
      console.log("[ChatStreamService] Checking credits");
      const estimatedCost = 100;
      const hasCredits = await this.creditService.checkCredits(
        userId,
        estimatedCost,
      );
      console.log("[ChatStreamService] Has credits:", hasCredits);
      if (!hasCredits) {
        const currentCredits = await this.creditService.getCredits(userId);
        yield {
          type: "error",
          error: `Insufficient credits. Required: ${estimatedCost}, Available: ${currentCredits}`,
        };
        return;
      }

      // Stream AI response
      console.log("[ChatStreamService] Starting AI stream with:", {
        provider,
        model,
      });
      yield {
        type: "metadata",
        metadata: {
          model,
          provider,
        },
      };

      // Call AI provider with streaming
      console.log("[ChatStreamService] Calling AI router");
      let aiResponse;
      try {
        aiResponse = await this.aiRouter.chat(
          provider as "openai" | "anthropic" | "google",
          {
            model,
            messages: conversationHistory,
            temperature: data.temperature,
            maxTokens: data.maxTokens,
            stream: true, // Enable streaming
          },
        );
        console.log("[ChatStreamService] AI router responded:", {
          hasContent: !!aiResponse.content,
          contentLength: aiResponse.content?.length || 0,
          model: aiResponse.model,
          tokensIn: aiResponse.tokensIn,
          tokensOut: aiResponse.tokensOut,
        });
      } catch (aiError) {
        console.error("[ChatStreamService] AI router error:", {
          error: aiError instanceof Error ? aiError.message : String(aiError),
          stack: aiError instanceof Error ? aiError.stack : undefined,
        });
        throw aiError;
      }

      // Process streaming response
      console.log("[ChatStreamService] Processing AI response");
      if (!aiResponse || !aiResponse.content) {
        console.error("[ChatStreamService] No content in AI response:", {
          aiResponse,
        });
        yield {
          type: "error",
          error: "AI provider returned empty response",
        };
        return;
      }

      if (aiResponse.content) {
        // If content is already available (non-streaming provider), yield it
        console.log("[ChatStreamService] Content available (non-streaming)");
        fullContent = aiResponse.content;

        // Yield content in chunks for better UX
        const chunkSize = 10;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          const chunk = fullContent.slice(i, i + chunkSize);
          yield {
            type: "content",
            content: chunk,
          };
        }
      }

      // Save assistant message
      const assistantMessage = await context.message.message.create({
        conversationId,
        role: MessageRole.ASSISTANT,
        content: fullContent,
        model: aiResponse.model,
        provider,
        tokens: aiResponse.tokensIn + aiResponse.tokensOut,
        cost: null,
      });

      // Record usage
      await this.usageService.recordUsageEvent({
        userId,
        model: aiResponse.model,
        provider,
        type: UsageType.CHAT,
        tokensIn: aiResponse.tokensIn,
        tokensOut: aiResponse.tokensOut,
        cost: 0,
        requestId,
        conversationId,
      });

      // Yield final metadata
      yield {
        type: "metadata",
        metadata: {
          model: aiResponse.model,
          provider,
          tokensIn: aiResponse.tokensIn,
          tokensOut: aiResponse.tokensOut,
        },
      };

      yield {
        type: "done",
        metadata: {
          conversationId,
          messageId: assistantMessage.id,
        },
      };
    } catch (error) {
      console.error("[ChatStreamService] Error in streamChat:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      yield {
        type: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
