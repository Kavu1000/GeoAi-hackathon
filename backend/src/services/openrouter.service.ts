// Thin client for OpenRouter's chat-completions API, used to run
// deepseek/deepseek-r1 for the MODEL step's reasoning (see
// recommendationAi.service.ts). Kept provider-agnostic on purpose — swap
// OPENROUTER_MODEL to any other OpenRouter-hosted model without code changes.
import { env } from "../config/env";
import { logger } from "../config/logger";

const REQUEST_TIMEOUT_MS = 20_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** True once OPENROUTER_API_KEY is set — callers use this to skip AI calls entirely. */
export const aiEnabled = Boolean(env.OPENROUTER_API_KEY);

/**
 * Calls OpenRouter's chat-completions endpoint and returns the assistant's
 * text reply, or null if the API key is missing or the call fails for any
 * reason (network, timeout, non-2xx, malformed body). Callers should always
 * have a non-AI fallback — this is a "nice to have" reasoning layer, never
 * a hard dependency for the aggregation pipeline to complete.
 */
export async function chatComplete(messages: ChatMessage[]): Promise<string | null> {
  if (!env.OPENROUTER_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // OpenRouter asks for these on free/attributed usage; harmless if ignored.
        "HTTP-Referer": "https://github.com/lao-rural-connectivity-map",
        "X-Title": "Connect4All",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn({ status: res.status, body: await res.text() }, "openrouter request failed");
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    logger.warn({ err }, "openrouter request errored");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
