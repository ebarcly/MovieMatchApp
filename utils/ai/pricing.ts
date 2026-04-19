/**
 * Anthropic model pricing — brief §1.1, fetched 2026-04-18.
 *
 * Single source of truth for per-token cost. Cost accounting in
 * `spend.ts` uses this map to compute `costCents` per call.
 *
 * Prices are in US $ per million tokens (MTok). Cache-read and
 * cache-write refer to Anthropic prompt-cache (5-min TTL per ratified
 * Sprint 5b decision).
 */

export interface ModelPricing {
  /** $/MTok input tokens (uncached). */
  input: number;
  /** $/MTok output tokens. */
  output: number;
  /** $/MTok read from prompt cache. */
  cacheRead: number;
  /** $/MTok written to prompt cache. */
  cacheWrite: number;
}

export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  // Haiku 4.5 — pinned model for Sprint 5b (brief §1.4).
  'claude-haiku-4-5-20251001': {
    input: 1.0,
    output: 5.0,
    cacheRead: 0.1,
    cacheWrite: 1.25,
  },
} as const;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Tokens read from the prompt cache (0 if no hit). */
  cacheReadTokens?: number;
  /** Tokens written to the prompt cache on this call. */
  cacheWriteTokens?: number;
}

/**
 * Compute dollar cost for a single LLM call given token usage + model.
 * Returns 0 when pricing for the model is unknown (fail-open on cost
 * so we never block a valid call, but log a warning in the caller).
 */
export function computeCostUsd(
  model: string,
  usage: TokenUsage,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return 0;
  }
  const perToken = (mtokPrice: number) => mtokPrice / 1_000_000;
  const input =
    (usage.inputTokens - (usage.cacheReadTokens ?? 0)) * perToken(pricing.input);
  const cacheRead = (usage.cacheReadTokens ?? 0) * perToken(pricing.cacheRead);
  const cacheWrite =
    (usage.cacheWriteTokens ?? 0) * perToken(pricing.cacheWrite);
  const output = usage.outputTokens * perToken(pricing.output);
  return Math.max(0, input + cacheRead + cacheWrite + output);
}

export function costUsdToCents(usd: number): number {
  return Math.ceil(usd * 100);
}
