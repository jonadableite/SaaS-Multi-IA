/**
 * @file chat-stream.service.spec.ts
 * @description Unit tests for ChatStreamService
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatStreamService } from "./chat-stream.service";
import { AIRouter } from "@/features/ai/ai-router";
import { UsageService } from "@/features/usage/services/usage.service";
import { CreditService } from "@/features/usage/services/credit.service";

// Mock dependencies
vi.mock("@/features/ai/ai-router");
vi.mock("@/features/usage/services/usage.service");
vi.mock("@/features/usage/services/credit.service");

describe("ChatStreamService", () => {
  let service: ChatStreamService;
  let mockAIRouter: any;
  let mockContext: any;

  beforeEach(() => {
    mockAIRouter = {
      chat: vi.fn(),
      getAvailableModels: vi.fn(() => ["gpt-4-turbo"]),
    };

    mockContext = {
      conversation: {
        conversation: {
          create: vi.fn().mockResolvedValue({ id: "conv-123" }),
          findUnique: vi.fn().mockResolvedValue({ id: "conv-123" }),
        },
      },
      message: {
        message: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: "msg-123" }),
        },
      },
    };

    service = new ChatStreamService(mockAIRouter as any);
  });

  describe("streamChat", () => {
    it("should stream chat response chunks", async () => {
      const mockAIResponse = {
        content: "Test response",
        model: "gpt-4-turbo",
        tokensIn: 10,
        tokensOut: 20,
      };

      mockAIRouter.chat.mockResolvedValue(mockAIResponse);

      const chunks: any[] = [];
      for await (const chunk of service.streamChat(
        "user-123",
        {
          content: "Hello",
          provider: "openai",
          model: "gpt-4-turbo",
        },
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some((c) => c.type === "content")).toBe(true);
      expect(chunks.some((c) => c.type === "done")).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      mockAIRouter.chat.mockRejectedValue(new Error("AI provider error"));

      const chunks: any[] = [];
      for await (const chunk of service.streamChat(
        "user-123",
        { content: "Hello" },
        mockContext,
      )) {
        chunks.push(chunk);
      }

      expect(chunks.some((c) => c.type === "error")).toBe(true);
    });

    it("should check credits before streaming", async () => {
      // Mock credit check to fail
      const creditService = new CreditService();
      vi.spyOn(creditService, "checkCredits").mockResolvedValue(false);

      const chunks: any[] = [];
      for await (const chunk of service.streamChat(
        "user-123",
        { content: "Hello" },
        mockContext,
      )) {
        chunks.push(chunk);
      }

      // Should have error chunk for insufficient credits
      expect(chunks.some((c) => c.type === "error")).toBe(true);
    });
  });
});
