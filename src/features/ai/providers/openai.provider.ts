import type {
  AIProvider,
  AIProviderConfig,
  ChatOptions,
  ChatResponse,
} from "./ai-provider.interface";
import { AppError, AppErrorCode } from "@/utils/app-error";

/**
 * @class OpenAIProvider
 * @implements {AIProvider}
 * @description OpenAI provider implementation
 */
export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig;
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.baseURL = config.baseURL || "https://api.openai.com/v1";
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
          stream: options.stream ?? false,
        }),
        signal: AbortSignal.timeout(this.config.timeout ?? 30000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new AppError(
          {
            code: AppErrorCode.AI_PROVIDER_ERROR,
            message:
              error.error?.message ||
              `OpenAI API error: ${response.statusText}`,
            context: { status: response.status, error },
          },
          response.status,
        );
      }

      // When streaming is enabled, OpenAI returns a text stream, not JSON
      // For now, we'll disable streaming at the provider level and let ChatStreamService handle chunking
      // This is a temporary solution - proper streaming would require async iteration
      if (options.stream) {
        // Read the stream and accumulate content
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let model = options.model || "gpt-3.5-turbo";
        let tokensIn = 0;
        let tokensOut = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices?.[0]?.delta?.content) {
                    fullContent += parsed.choices[0].delta.content;
                  }
                  if (parsed.model) {
                    model = parsed.model;
                  }
                  if (parsed.usage) {
                    tokensIn = parsed.usage.prompt_tokens || tokensIn;
                    tokensOut = parsed.usage.completion_tokens || tokensOut;
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        }

        return {
          content: fullContent,
          tokensIn,
          tokensOut,
          model,
          raw: { streamed: true, content: fullContent },
        };
      }

      // Non-streaming response
      const data = await response.json();
      const choice = data.choices[0];

      return {
        content: choice.message.content,
        tokensIn: data.usage.prompt_tokens,
        tokensOut: data.usage.completion_tokens,
        model: data.model,
        raw: data,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(
          {
            code: AppErrorCode.AI_PROVIDER_TIMEOUT,
            message: "AI provider request timeout",
          },
          504,
        );
      }

      throw new AppError(
        {
          code: AppErrorCode.AI_PROVIDER_ERROR,
          message: `OpenAI provider error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        502,
      );
    }
  }

  getProviderName(): string {
    return "openai";
  }

  getAvailableModels(): string[] {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
      "o1-preview",
      "o1-mini",
    ];
  }
}
