import OpenAI from "openai";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/infrastructure/logger";
import { ExternalServiceError } from "@/lib/errors";

// Initialize OpenAI client if API key is available
const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    })
  : null;

export interface ChatCompletionParams {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a chat completion request to OpenAI
 */
export async function getChatCompletion({
  messages,
  model = "gpt-3.5-turbo",
  temperature = 0.7,
  maxTokens = 500,
}: ChatCompletionParams): Promise<string | null> {
  if (!openai) {
    logger.warn("OpenAI not configured");
    return null;
  }

  try {
    logger.debug("Sending OpenAI request", { model, messageCount: messages.length });
    
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const response = completion.choices[0]?.message?.content || null;
    
    logger.info("OpenAI request completed", {
      model,
      tokensUsed: completion.usage?.total_tokens,
    });
    
    return response;
  } catch (error) {
    logger.error("OpenAI request failed", error);
    throw new ExternalServiceError("OpenAI", "Failed to get AI response");
  }
}

/**
 * Generate embeddings for text
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!openai) {
    logger.warn("OpenAI not configured");
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error("Failed to generate embedding", error);
    throw new ExternalServiceError("OpenAI", "Failed to generate embedding");
  }
}

/**
 * Moderate content for safety
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean | null>;
} | null> {
  if (!openai) {
    logger.warn("OpenAI not configured");
    return null;
  }

  try {
    const response = await openai.moderations.create({
      input: text,
    });

    const result = response.results[0];
    return {
      flagged: result.flagged,
      categories: { ...result.categories },
    };
  } catch (error) {
    logger.error("Failed to moderate content", error);
    return null;
  }
}
