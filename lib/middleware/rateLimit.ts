import { NextRequest } from "next/server";
import { RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/infrastructure/logger";

export interface RateLimitConfig {
  requests: number;
  window: string; // e.g., "1m", "1h", "1d"
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Parse window string to milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid rate limit window: ${window}`);
  }
  
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  
  switch (unit) {
    case "s": return num * 1000;
    case "m": return num * 60 * 1000;
    case "h": return num * 60 * 60 * 1000;
    case "d": return num * 24 * 60 * 60 * 1000;
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(req: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = req.headers.get("x-forwarded-for");
  const real = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || real || "unknown";
  
  // Combine with path for granular rate limiting
  const path = new URL(req.url).pathname;
  return `${ip}:${path}`;
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<void> {
  const identifier = getClientIdentifier(req);
  const now = Date.now();
  const windowMs = parseWindow(config.window);
  const resetAt = now + windowMs;
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetAt < now) {
    // Create new entry
    entry = { count: 1, resetAt };
    rateLimitStore.set(identifier, entry);
    return;
  }
  
  // Check if limit exceeded
  if (entry.count >= config.requests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    logger.warn("Rate limit exceeded", {
      identifier,
      limit: config.requests,
      window: config.window,
      retryAfter,
    });
    
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds`,
      retryAfter
    );
  }
  
  // Increment counter
  entry.count++;
}

/**
 * Reset rate limit for a specific identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(identifier: string): RateLimitEntry | null {
  const entry = rateLimitStore.get(identifier);
  if (!entry || entry.resetAt < Date.now()) {
    return null;
  }
  return entry;
}
