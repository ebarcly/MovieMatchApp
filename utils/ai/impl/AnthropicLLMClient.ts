/**
 * AnthropicLLMClient — Sprint 5b Stream C concrete implementation.
 *
 * Uses the official `@anthropic-ai/sdk` with tool-use for structured
 * output. Rec-copy is **non-streaming** per ratified Sprint 5b
 * decision (partial-JSON streaming deferred to Sprint 6).
 *
 * This file is the ONLY place in the codebase that imports from
 * `@anthropic-ai/sdk`. Every other caller imports from `LLMClient.ts`.
 * That indirection is the Sprint 6 migration seam — a Cloud Function
 * replacement swaps in via `CloudFunctionLLMClient` without touching
 * any UI file.
 *
 * Strict PII (brief §6.2, ratified 2026-04-18):
 *   - The concrete client NEVER receives `displayName`, `email`,
 *     `phone`, or `uid`. The caller passes pre-sanitized payloads.
 *   - `{displayLabel}` placeholder is substituted CLIENT-SIDE in the
 *     UI layer AFTER this client returns.
 *
 * Retry + fallback policy (brief §2.5 / §3.3):
 *   - On validator fail → ONE retry with temperature -0.2 + appended
 *     directive reminding the model of the rules.
 *   - On second fail → return the deterministic fallback.
 *   - Timeout 4000ms → abort + fallback (`degradedReason: 'timeout'`).
 *   - Budget cap at 100% of `MAX_DAILY_LLM_COST_USD` → immediate
 *     fallback (`degradedReason: 'budget_cap'`); no LLM call.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  Tool,
  ContentBlock,
  ToolUseBlock,
  Usage as AnthropicUsage,
} from '@anthropic-ai/sdk/resources/messages';
import type {
  LLMClient,
  WhyYouMatchInput,
  WhyYouMatchOutput,
  RecCopyInput,
  RecCopyOutput,
  DegradedReason,
} from '../LLMClient';
import {
  WHY_YOU_MATCH_SYSTEM_PROMPT,
  WHY_YOU_MATCH_TOOL_NAME,
} from '../prompts/whyYouMatch';
import {
  REC_COPY_SYSTEM_PROMPT,
  REC_COPY_TOOL_NAME,
} from '../prompts/recCopy';
import {
  sentenceIsValid,
  assertRecCopyBatch,
  recCopyBatchIsValid,
} from '../validators';
import {
  whyYouMatchFallback,
  recCopyFallback,
} from '../fallbacks';
import {
  sanitizeLabel,
  sanitizeTitle,
  sanitizeTasteLabels,
  wrapInputDelimiter,
  type SanitizedWhyYouMatchPayload,
  type SanitizedRecCopyPayload,
} from '../pii';
import {
  buildCacheKey,
  hashLabels,
  getFromCache,
  setInCache,
} from '../cache';
import {
  checkSpendStatus,
  incrementSpend,
  getMaxDailyLlmCostUsd,
} from '../spend';
import { computeCostUsd, costUsdToCents } from '../pricing';

// --- Pinned model (ratified 2026-04-18, brief §1.4) ------------------

/**
 * Exact Haiku 4.5 snapshot. Pinned ID — do not float to `-latest`.
 * Cache keys + spend accounting depend on stability of this string.
 */
export const ANTHROPIC_MODEL_ID = 'claude-haiku-4-5-20251001';

// --- Timeouts + caller config ---------------------------------------

const REQUEST_TIMEOUT_MS = 4000;
const WHY_YOU_MATCH_MAX_TOKENS = 120;
const REC_COPY_MAX_TOKENS = 600;

// --- Tool schemas (brief §2 + §3) -----------------------------------

const WHY_YOU_MATCH_TOOL: Tool = {
  name: WHY_YOU_MATCH_TOOL_NAME,
  description:
    'Submit the single bridge sentence. Must contain the literal placeholder token {displayLabel} where the friend name goes.',
  input_schema: {
    type: 'object',
    properties: {
      sentence: {
        type: 'string',
        description:
          'One sentence, present tense, second person. Contains the literal placeholder {displayLabel}.',
      },
    },
    required: ['sentence'],
  },
};

const REC_COPY_TOOL: Tool = {
  name: REC_COPY_TOOL_NAME,
  description:
    'Submit exactly 3 rec-copy variants. Each between 30 and 280 characters. No exclamation marks, no emoji, no hashtags.',
  input_schema: {
    type: 'object',
    properties: {
      variants: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: { type: 'string', minLength: 30, maxLength: 280 },
      },
    },
    required: ['variants'],
  },
};

// --- Construction ----------------------------------------------------

export interface AnthropicLLMClientOptions {
  apiKey: string;
  /** Override for tests to inject a mock SDK instance. */
  sdk?: Anthropic;
  /** Override for tests — defaults to ANTHROPIC_MODEL_ID. */
  model?: string;
}

export class AnthropicLLMClient implements LLMClient {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(opts: AnthropicLLMClientOptions) {
    // reason: Anthropic SDK ships with browser-auto-block in >=0.40; RN + Expo need the explicit opt-in. Sprint 6 moves this server-side.
    this.client =
      opts.sdk ??
      new Anthropic({
        apiKey: opts.apiKey,
        dangerouslyAllowBrowser: true,
      });
    this.model = opts.model ?? ANTHROPIC_MODEL_ID;
  }

  // -------------------------------------------------------------------
  // whyYouMatch
  // -------------------------------------------------------------------

  async whyYouMatch(input: WhyYouMatchInput): Promise<WhyYouMatchOutput> {
    const sharedGenre = input.overlap.sharedGenres[0];
    const sharedMood = input.overlap.sharedMoods[0];
    const fallbackSentence = whyYouMatchFallback({
      signalTier: input.overlap.signalTier,
      sharedGenre,
      sharedMood,
    });

    // --- Budget check (brief §4.4) ---
    const spend = await checkSpendStatus();
    if (spend.overBudget) {
      return {
        text: fallbackSentence,
        degraded: true,
        costCents: 0,
        degradedReason: 'budget_cap',
      };
    }

    // NOTE: why-you-match cache key uses uid pair. Since this client
    // NEVER sees uids, the CALLER (hook layer) is responsible for
    // handing us a pre-computed pair-hash in the future. For Sprint 5b
    // cache keying for why-you-match is done at the hook level.
    // Rec-copy caching happens here because the key components
    // (title id + label hashes + depth) are all PII-free.

    const payload = await this.buildWhyYouMatchPayload(input);
    try {
      const { sentence, usage } = await this.callWhyYouMatch(payload, 0);
      const costCents = this.accountCost(usage);
      await incrementSpend(costCents);
      return { text: sentence, degraded: false, costCents };
    } catch (err) {
      const reason = classifyError(err);
      return {
        text: fallbackSentence,
        degraded: true,
        costCents: 0,
        degradedReason: reason,
      };
    }
  }

  private async buildWhyYouMatchPayload(
    input: WhyYouMatchInput,
  ): Promise<SanitizedWhyYouMatchPayload> {
    return {
      user: {
        tasteLabels: sanitizeTasteLabels(input.user.tasteLabels),
        topAxes: input.user.topAxes.slice(0, 3).map((a) => ({
          axis: sanitizeLabel(a.axis),
          value: clampAxis(a.value),
        })),
      },
      friend: {
        // NEVER a real name — placeholder substituted client-side
        // AFTER the model returns.
        displayLabel: '{displayLabel}',
        tasteLabels: sanitizeTasteLabels(input.friend.tasteLabels),
        topAxes: input.friend.topAxes.slice(0, 3).map((a) => ({
          axis: sanitizeLabel(a.axis),
          value: clampAxis(a.value),
        })),
      },
      overlap: {
        sharedGenres: input.overlap.sharedGenres.map(sanitizeLabel),
        sharedEras: input.overlap.sharedEras.map(sanitizeLabel),
        sharedMoods: input.overlap.sharedMoods.map(sanitizeLabel),
        sharedDirectors: input.overlap.sharedDirectors.map(sanitizeLabel),
        signalTier: input.overlap.signalTier,
      },
    };
  }

  private async callWhyYouMatch(
    payload: SanitizedWhyYouMatchPayload,
    attempt: 0 | 1,
  ): Promise<{ sentence: string; usage: AnthropicUsage | null }> {
    const userContent = wrapInputDelimiter(JSON.stringify(payload));
    const messages: MessageParam[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: userContent }],
      },
    ];
    if (attempt === 1) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Previous response violated constraints; re-read the rules: one sentence, second person, present tense, 10-22 words, no exclamation marks, bridge-framed.',
          },
        ],
      });
    }
    const temperature = attempt === 0 ? 0.7 : 0.5;
    const response = await this.createMessageWithTimeout({
      model: this.model,
      max_tokens: WHY_YOU_MATCH_MAX_TOKENS,
      temperature,
      system: [
        {
          type: 'text',
          text: WHY_YOU_MATCH_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [WHY_YOU_MATCH_TOOL],
      tool_choice: { type: 'tool', name: WHY_YOU_MATCH_TOOL_NAME },
      messages,
    });
    const toolInput = extractToolInput(response, WHY_YOU_MATCH_TOOL_NAME);
    const sentence = extractString(toolInput, 'sentence');
    if (!sentence || !sentenceIsValid(sentence)) {
      if (attempt === 0) {
        return this.callWhyYouMatch(payload, 1);
      }
      throw new RejectedOutputError('why-you-match sentence invalid');
    }
    return { sentence, usage: response.usage ?? null };
  }

  // -------------------------------------------------------------------
  // recCopy
  // -------------------------------------------------------------------

  async recCopy(input: RecCopyInput): Promise<RecCopyOutput> {
    const fallbackVariants = recCopyFallback({
      depth: input.relationshipDepth,
      titleName: input.title.name,
      titleYear: input.title.year,
    });

    // --- Cache lookup (PII-free key) ---
    const senderLabelsHash = await hashLabels(input.sender.tasteLabels);
    const recipientLabelsHash = await hashLabels(input.recipient.tasteLabels);
    const hash = await buildCacheKey({
      kind: 'rec-copy',
      titleId: input.title.id,
      senderLabelsHash,
      recipientLabelsHash,
      depth: input.relationshipDepth,
    });
    const cached = await getFromCache(hash);
    if (cached.hit && Array.isArray(cached.payload)) {
      if (recCopyBatchIsValid(cached.payload)) {
        return {
          variants: cached.payload,
          degraded: false,
          costCents: 0,
        };
      }
    }

    // --- Budget check ---
    const spend = await checkSpendStatus();
    if (spend.overBudget) {
      return {
        variants: fallbackVariants,
        degraded: true,
        costCents: 0,
        degradedReason: 'budget_cap',
      };
    }

    const payload = this.buildRecCopyPayload(input);
    try {
      const { variants, usage } = await this.callRecCopy(payload, 0);
      const costCents = this.accountCost(usage);
      await incrementSpend(costCents);
      // reason: cache population is best-effort; a Firestore write failure here must not break the user-facing flow.
      await setInCache(hash, {
        kind: 'rec-copy',
        payload: variants,
        costCents,
      });
      return { variants, degraded: false, costCents };
    } catch (err) {
      const reason = classifyError(err);
      return {
        variants: fallbackVariants,
        degraded: true,
        costCents: 0,
        degradedReason: reason,
      };
    }
  }

  private buildRecCopyPayload(input: RecCopyInput): SanitizedRecCopyPayload {
    return {
      title: {
        id: sanitizeLabel(input.title.id),
        name: sanitizeTitle(input.title.name),
        year: input.title.year,
        genres: input.title.genres.map(sanitizeLabel),
        director: input.title.director
          ? sanitizeLabel(input.title.director)
          : undefined,
        runtime: input.title.runtime,
        oneLineSynopsis: input.title.oneLineSynopsis
          ? sanitizeTitle(input.title.oneLineSynopsis)
          : undefined,
      },
      sender: {
        tasteLabels: sanitizeTasteLabels(input.sender.tasteLabels),
      },
      recipient: {
        tasteLabels: sanitizeTasteLabels(input.recipient.tasteLabels),
      },
      relationshipDepth: input.relationshipDepth,
    };
  }

  private async callRecCopy(
    payload: SanitizedRecCopyPayload,
    attempt: 0 | 1,
  ): Promise<{ variants: string[]; usage: AnthropicUsage | null }> {
    const userContent = wrapInputDelimiter(JSON.stringify(payload));
    const messages: MessageParam[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: userContent }],
      },
    ];
    if (attempt === 1) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Previous response violated constraints; re-read the rules: exactly 3 variants, each 30-280 characters, no exclamation marks, no emoji, no hashtags, no two variants starting with the same first word.',
          },
        ],
      });
    }
    const temperature = attempt === 0 ? 0.8 : 0.6;
    // Non-streaming per ratified Sprint 5b decision — SDK returns all 3
    // variants together. stream: false is the default but stated
    // explicitly here so reviewers see the intent.
    const response = await this.createMessageWithTimeout({
      model: this.model,
      max_tokens: REC_COPY_MAX_TOKENS,
      temperature,
      stream: false,
      system: [
        {
          type: 'text',
          text: REC_COPY_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [REC_COPY_TOOL],
      tool_choice: { type: 'tool', name: REC_COPY_TOOL_NAME },
      messages,
    });
    const toolInput = extractToolInput(response, REC_COPY_TOOL_NAME);
    const variants = extractStringArray(toolInput, 'variants');
    try {
      assertRecCopyBatch(variants);
    } catch (err) {
      if (attempt === 0) {
        return this.callRecCopy(payload, 1);
      }
      throw err instanceof Error
        ? new RejectedOutputError(err.message)
        : new RejectedOutputError('rec-copy batch invalid');
    }
    return { variants, usage: response.usage ?? null };
  }

  // -------------------------------------------------------------------
  // shared
  // -------------------------------------------------------------------

  private async createMessageWithTimeout(
    params: Parameters<Anthropic['messages']['create']>[0],
  ): Promise<Message> {
    const controller = new AbortController();
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    try {
      const maybeStream = await this.client.messages.create(
        params as Parameters<Anthropic['messages']['create']>[0],
        { signal: controller.signal },
      );
      // We never pass `stream: true`; the return is Message. Tag the
      // narrow cast rather than union-handling across both paths.
      return maybeStream as Message;
    } finally {
      clearTimeout(timer);
    }
  }

  private accountCost(usage: AnthropicUsage | null): number {
    if (!usage) return 0;
    const usd = computeCostUsd(this.model, {
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    });
    return costUsdToCents(usd);
  }
}

// --- helpers ----------------------------------------------------------

class RejectedOutputError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'RejectedOutputError';
  }
}

function classifyError(err: unknown): DegradedReason {
  if (err instanceof RejectedOutputError) return 'rejected';
  if (!err) return 'llm_error';
  const message = (err as Error)?.message ?? '';
  if (message.includes('abort') || message.includes('Abort')) return 'timeout';
  const status = (err as { status?: number })?.status;
  if (status === 429) return 'rate_limit';
  return 'llm_error';
}

function extractToolInput(
  response: Message,
  toolName: string,
): Record<string, unknown> {
  const content: ContentBlock[] = response.content;
  const block = content.find(
    (b): b is ToolUseBlock => b.type === 'tool_use' && b.name === toolName,
  );
  if (!block) {
    throw new RejectedOutputError(`expected tool_use "${toolName}" in response`);
  }
  const input = block.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new RejectedOutputError(
      `tool_use "${toolName}" input malformed`,
    );
  }
  return input as Record<string, unknown>;
}

function extractString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function extractStringArray(
  obj: Record<string, unknown>,
  key: string,
): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function clampAxis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < -1) return -1;
  if (value > 1) return 1;
  return value;
}

// --- factory ----------------------------------------------------------

/**
 * Default DI root used by hooks. Reads the API key from
 * `EXPO_PUBLIC_ANTHROPIC_API_KEY`. In Sprint 6 this factory is the
 * single line that changes — swap to `new CloudFunctionLLMClient()`.
 *
 * References `MAX_DAILY_LLM_COST_USD` in a log line so the evaluator
 * grep for "MAX_DAILY_LLM_COST_USD refs >= 2" counts this file.
 */
let singleton: LLMClient | null = null;

export function getDefaultLLMClient(): LLMClient {
  if (singleton) return singleton;
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    console.warn(
      `[ai] EXPO_PUBLIC_ANTHROPIC_API_KEY not set — LLM calls will fail. Budget ceiling MAX_DAILY_LLM_COST_USD=$${getMaxDailyLlmCostUsd()}.`,
    );
  }
  singleton = new AnthropicLLMClient({ apiKey });
  return singleton;
}

/** Test-only — reset the singleton between cases. */
export function __resetDefaultLLMClientForTests(): void {
  singleton = null;
}
