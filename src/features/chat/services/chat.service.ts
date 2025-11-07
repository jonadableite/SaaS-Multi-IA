import { AIRouter } from "@/features/ai/ai-router";
import { UsageService } from "@/features/usage/services/usage.service";
import { CreditService } from "@/features/usage/services/credit.service";
import type {
  ChatMessageBody,
  ChatResponse,
} from "@/features/message/message.interface";
import { MessageRole } from "@/features/message/message.interface";
import { UsageType } from "@/features/usage/usage.interface";
import { AppError, AppErrorCode } from "@/utils/app-error";
import crypto from "node:crypto";

/**
 * @class ChatService
 * @description Service for handling chat operations with AI
 */
export class ChatService {
  private aiRouter: AIRouter;
  private usageService: UsageService;
  private creditService: CreditService;

  constructor(aiRouter: AIRouter) {
    this.aiRouter = aiRouter;
    this.usageService = new UsageService();
    this.creditService = new CreditService();
  }

  /**
   * @method chat
   * @description Process chat message and return AI response
   */
  async chat(
    userId: string,
    data: ChatMessageBody,
    context: {
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
    },
  ): Promise<ChatResponse> {
    // Generate request ID for idempotency
    const requestId = `req_${crypto.randomBytes(16).toString("hex")}`;

    // Check idempotency
    const existingUsage = await this.usageService.checkIdempotency(requestId);
    if (existingUsage) {
      throw new AppError(
        {
          code: AppErrorCode.CONFLICT,
          message: "Request already processed",
          context: { requestId },
        },
        409,
      );
    }

    // Get or create conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const initialTitle = (data.content || "").slice(0, 60)
      const conversation = await context.conversation.conversation.create(
        userId,
        {
          title: initialTitle ? initialTitle : null,
        },
      );
      conversationId = conversation.id;
    } else {
      // Verify conversation belongs to user
      const conversation = await context.conversation.conversation.findUnique(
        conversationId,
        userId,
      );
      if (!conversation) {
        throw AppError.createNotFoundError("Conversation");
      }
    }

    // Get conversation history
    const messages = await context.message.message.findMany(conversationId);
    const conversationHistory = messages.map((msg) => {
      // Map MessageRole enum to AI provider format
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

    // Add user message
    conversationHistory.push({
      role: "user",
      content: data.content,
    });

    // Determine provider
    const provider = data.provider || "openai"; // Default to OpenAI
    const model =
      data.model ||
      this.aiRouter.getAvailableModels(
        provider as "openai" | "anthropic" | "google",
      )[0];

    // Ensure user has initial credits (if they have 0 credits)
    await this.creditService.ensureInitialCredits(userId);

    // Check available credits (estimate)
    const estimatedCost = 100; // Estimate, will be calculated after
    const hasCredits = await this.creditService.checkCredits(
      userId,
      estimatedCost,
    );
    if (!hasCredits) {
      const currentCredits = await this.creditService.getCredits(userId);
      throw AppError.createInsufficientCreditsError(
        estimatedCost,
        currentCredits,
      );
    }

    try {
      // Call AI provider
      const aiResponse = await this.aiRouter.chat(
        provider as "openai" | "anthropic" | "google",
        {
          model,
          messages: conversationHistory,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          stream: data.stream ?? false,
        },
      );

      // Save user message
      await context.message.message.create({
        conversationId,
        role: MessageRole.USER,
        content: data.content,
        model: null,
        provider: null,
        tokens: null,
        cost: null,
      });

      // Save assistant message
      const assistantMessage = await context.message.message.create({
        conversationId,
        role: MessageRole.ASSISTANT,
        content: aiResponse.content,
        model: aiResponse.model,
        provider,
        tokens: aiResponse.tokensIn + aiResponse.tokensOut,
        cost: null, // Will be calculated in billing pipeline
      });

      // Record usage event (will trigger billing)
      await this.usageService.recordUsageEvent({
        userId,
        model: aiResponse.model,
        provider,
        type: UsageType.CHAT,
        tokensIn: aiResponse.tokensIn,
        tokensOut: aiResponse.tokensOut,
        cost: 0, // Will be calculated in billing pipeline
        requestId,
        conversationId,
      });

      return {
        content: aiResponse.content,
        model: aiResponse.model,
        provider,
        tokensIn: aiResponse.tokensIn,
        tokensOut: aiResponse.tokensOut,
        cost: 0, // Final cost calculated in billing
        conversationId,
        messageId: assistantMessage.id,
        raw: aiResponse.raw,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        {
          code: AppErrorCode.AI_PROVIDER_ERROR,
          message: `Failed to process chat: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        502,
      );
    }
  }
}
