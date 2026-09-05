/**
 * Provider-isolated LLM access.
 *
 * Everything vendor-specific lives in this file so the provider can be swapped
 * without touching agent logic. Calls only ever happen on the server; the API
 * key is read inside the function, never at module scope.
 */
import type { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callProvider(messages: ChatMessageInput[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured on this server.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new AiError("DealMate is handling a lot of deals right now. Try again in a moment.", 429);
    }
    if (response.status === 402) {
      throw new AiError("AI credits are exhausted for this workspace.", 402);
    }
    throw new AiError(`AI request failed (${response.status}): ${body.slice(0, 200)}`, response.status);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiError("Empty response from the model.");
  return content;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new AiError("Model did not return JSON.");
  return JSON.parse(trimmed.slice(start, end + 1));
}

/**
 * Calls the model and validates the reply against a Zod schema.
 * Malformed output is retried exactly once with a corrective instruction.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  messages: ChatMessageInput[],
): Promise<T> {
  let lastIssue = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptMessages =
      attempt === 0
        ? messages
        : [
            ...messages,
            {
              role: "system" as const,
              content: `Your previous reply was rejected: ${lastIssue}. Reply with valid JSON matching the schema and nothing else.`,
            },
          ];

    const raw = await callProvider(attemptMessages);
    try {
      return schema.parse(extractJson(raw));
    } catch (error) {
      lastIssue = error instanceof Error ? error.message.slice(0, 300) : "invalid JSON";
    }
  }

  throw new AiError("The assistant returned an unusable response. Please rephrase and try again.");
}
