"use client";

import { useEffect, useRef, useState } from "react";

interface StreamOptions {
  query: Record<string, any>;
  onMessage?: (message: any) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

/**
 * @hook useChatStream
 * @description Custom hook for consuming SSE chat stream via fetch with ReadableStream
 */
export function useChatStream() {
  const [isConnected, setIsConnected] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const connect = (options: StreamOptions): (() => void) => {
    // Cleanup previous connection
    if (readerRef.current) {
      readerRef.current.cancel();
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const baseURL =
      process.env.NEXT_PUBLIC_IGNITER_API_URL || "http://localhost:3000";
    const basePATH = process.env.NEXT_PUBLIC_IGNITER_API_BASE_PATH || "/api/v1";
    const url = `${baseURL}${basePATH}/chat/stream?${queryParams.toString()}`;

    // Use fetch with ReadableStream for SSE
    fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
      credentials: "include", // Include cookies for auth
      signal: abortControllerRef.current.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        readerRef.current = reader;
        setIsConnected(true);

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              options.onDone?.();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim() === "") continue;

              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  options.onDone?.();
                  return;
                }

                try {
                  const message = JSON.parse(data);
                  options.onMessage?.(message);
                } catch (e) {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            options.onError?.(error as Error);
          }
        } finally {
          setIsConnected(false);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          options.onError?.(error);
        }
        setIsConnected(false);
      });

    // Return cleanup function
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsConnected(false);
    };
  };

  const disconnect = () => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
  };
}
