import { igniter } from "@/igniter";
import { AuthFeatureProcedure } from "@/@saas-boilerplate/features/auth/procedures/auth.procedure";
import { ConversationProcedure } from "@/features/conversation/procedures/conversation.procedure";
import { MessageProcedure } from "@/features/message/procedures/message.procedure";
import { ChatMessageSchema } from "@/features/message/message.interface";
import { ChatService } from "../services/chat.service";
import { ChatStreamService } from "../services/chat-stream.service";
import { AIRouter, type ProviderName } from "@/features/ai/ai-router";
import { AppError, AppErrorCode } from "@/utils/app-error";
import {
  createRateLimitProcedure,
  chatRateLimitConfig,
} from "@/middleware/rate-limit";
import { createSecurityProcedure } from "@/middleware/security";

/**
 * @controller ChatController
 * @description Controller for chat operations with AI
 */
export const ChatController = igniter.controller({
  name: "Chat",
  path: "/chat",
  description: "AI chat operations",
  actions: {
    /**
     * @action send
     * @description Send a chat message and get AI response
     */
    send: igniter.mutation({
      name: "Send",
      description: "Send a chat message",
      path: "/",
      method: "POST",
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(chatRateLimitConfig),
        createSecurityProcedure({
          sanitizeBody: true,
          sanitizeFields: ["content"],
        }),
        ConversationProcedure(),
        MessageProcedure(),
      ],
      body: ChatMessageSchema,
      handler: async ({ context, request, response }) => {
        const session = await context.auth.getSession({
          requirements: "authenticated",
        });

        if (!session?.user) {
          return response.unauthorized("Authentication required");
        }

        const userId = session.user.id;

        // Initialize AI Router (from env or config)
        const aiRouter = AIRouter.createFromEnv();
        const chatService = new ChatService(aiRouter);

        try {
          const chatResponse = await chatService.chat(userId, request.body, {
            conversation: context.conversation,
            message: context.message,
          });

          // Revalidate conversations list to update sidebar
          return response
            .revalidate(["conversation.list"])
            .success(chatResponse);
        } catch (error) {
          if (error instanceof AppError) {
            return response.status(error.status).json({
              error: {
                code: error.details.code,
                message: error.details.message,
                context: error.details.context,
              },
            });
          }

          return response.status(500).json({
            error: {
              code: AppErrorCode.INTERNAL_ERROR,
              message: "Internal server error",
            },
          });
        }
      },
    }),

    /**
     * @action stream
     * @description Stream chat response via SSE
     */
    stream: igniter.query({
      name: "Stream",
      description: "Stream chat response via Server-Sent Events",
      path: "/stream",
      stream: true, // Enable SSE streaming
      use: [
        AuthFeatureProcedure(),
        createRateLimitProcedure(chatRateLimitConfig),
        createSecurityProcedure({
          sanitizeBody: true,
          sanitizeFields: ["content"],
        }),
        ConversationProcedure(),
        MessageProcedure(),
      ],
      query: ChatMessageSchema,
      handler: async ({ context, request, response, realtime }) => {
        try {
          // Log incoming request for debugging
          console.log("[ChatController] Stream request:", {
            query: request.query,
            hasRealtime: !!realtime,
            hasContext: {
              conversation: !!context.conversation,
              message: !!context.message,
            },
          });

          console.log("[ChatController] Getting session...");
          const session = await context.auth.getSession({
            requirements: "authenticated",
          });
          console.log("[ChatController] Session obtained:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
          });

          if (!session?.user) {
            console.error("[ChatController] No session or user");
            return response.unauthorized("Authentication required");
          }

          const userId = session.user.id;
          console.log("[ChatController] Creating AI router...");
          let aiRouter: AIRouter;
          try {
            aiRouter = AIRouter.createFromEnv();
            console.log("[ChatController] AI router created:", {
              availableProviders: aiRouter.getAvailableProviders(),
            });
          } catch (routerError) {
            console.error(
              "[ChatController] Failed to create AI router:",
              routerError,
            );
            throw new Error(
              `Failed to initialize AI router: ${routerError instanceof Error ? routerError.message : String(routerError)}`,
            );
          }

          console.log("[ChatController] Creating stream service...");
          let streamService: ChatStreamService;
          try {
            streamService = new ChatStreamService(aiRouter);
            console.log("[ChatController] Stream service created successfully");
          } catch (serviceError) {
            console.error(
              "[ChatController] Failed to create stream service:",
              serviceError,
            );
            throw new Error(
              `Failed to initialize stream service: ${serviceError instanceof Error ? serviceError.message : String(serviceError)}`,
            );
          }

          // Parse query params - ensure stream is boolean and handle optional conversationId
          const chatQuery = {
            ...request.query,
            conversationId:
              request.query.conversationId &&
              request.query.conversationId !== ""
                ? request.query.conversationId
                : undefined,
            stream:
              request.query.stream === true || request.query.stream === "true",
          };

          console.log("[ChatController] Parsed chat query:", chatQuery);

          // Verify provider is available
          const requestedProvider = (chatQuery.provider ||
            "openai") as ProviderName;
          const availableProviders = aiRouter.getAvailableProviders();
          console.log("[ChatController] Provider check:", {
            requested: requestedProvider,
            available: availableProviders,
          });

          if (!availableProviders.includes(requestedProvider)) {
            const errorMsg = `Provider '${requestedProvider}' is not configured. Available providers: ${availableProviders.join(", ") || "none"}`;
            console.error("[ChatController]", errorMsg);
            return response.status(503).json({
              error: {
                code: AppErrorCode.AI_PROVIDER_UNAVAILABLE,
                message: errorMsg,
              },
            });
          }

          // Verify procedures are available
          if (!context.conversation || !context.conversation.conversation) {
            console.error(
              "[ChatController] ConversationProcedure not available",
            );
            throw new Error("ConversationProcedure not available in context");
          }
          if (!context.message || !context.message.message) {
            console.error("[ChatController] MessageProcedure not available");
            throw new Error("MessageProcedure not available in context");
          }

          console.log("[ChatController] Starting stream with:", {
            userId,
            chatQuery,
          });

          // Create ReadableStream for SSE
          const encoder = new TextEncoder();
          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                console.log("[ChatController] Creating stream generator...");
                const streamGenerator = streamService.streamChat(
                  userId,
                  chatQuery as any,
                  {
                    conversation: context.conversation,
                    message: context.message,
                  },
                );
                console.log(
                  "[ChatController] Stream generator created, starting iteration...",
                );

                let chunkCount = 0;
                for await (const chunk of streamGenerator) {
                  chunkCount++;
                  console.log(
                    `[ChatController] Received chunk ${chunkCount}, type: ${chunk.type}`,
                  );

                  let sseData: string;
                  if (chunk.type === "content" && chunk.content) {
                    sseData = JSON.stringify({
                      type: "content",
                      data: chunk.content,
                    });
                  } else if (chunk.type === "metadata" && chunk.metadata) {
                    sseData = JSON.stringify({
                      type: "metadata",
                      data: chunk.metadata,
                    });
                  } else if (chunk.type === "done") {
                    sseData = JSON.stringify({
                      type: "done",
                      data: chunk.metadata,
                    });
                    controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                    break;
                  } else if (chunk.type === "error") {
                    sseData = JSON.stringify({
                      type: "error",
                      data: { error: chunk.error },
                    });
                    controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                    break;
                  } else {
                    continue;
                  }

                  // Send SSE formatted chunk
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }

                // Send final [DONE] marker
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();

                // Revalidate conversations list
                response.revalidate(["conversation.list"]);

                console.log("[ChatController] Stream completed successfully");
              } catch (streamError) {
                console.error("[ChatController] Error in stream:", {
                  error:
                    streamError instanceof Error
                      ? streamError.message
                      : String(streamError),
                  stack:
                    streamError instanceof Error
                      ? streamError.stack
                      : undefined,
                });

                // Send error via SSE
                const errorData = JSON.stringify({
                  type: "error",
                  data: {
                    error:
                      streamError instanceof Error
                        ? streamError.message
                        : "Unknown error",
                  },
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                controller.close();
              }
            },
          });

          // Return SSE stream response
          return new Response(readableStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch (error) {
          console.error("[ChatController] Fatal error in handler:", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            errorName: error instanceof Error ? error.name : typeof error,
            errorType: error?.constructor?.name,
          });

          // Validation error
          if (
            error &&
            typeof error === "object" &&
            (error as any).name === "ZodError"
          ) {
            console.error("[ChatController] Zod validation error:", error);
            return response.status(400).json({
              error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request parameters",
                details: error,
              },
            });
          }

          // Error already handled in stream if it was started

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to stream chat response";

          console.error("[ChatController] Returning 500 error:", errorMessage);

          return response.status(500).json({
            error: {
              code: AppErrorCode.INTERNAL_ERROR,
              message: errorMessage,
            },
          });
        }
      },
    }),
  },
});
