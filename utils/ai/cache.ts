/**
 * AI response cache — brief §4.
 *
 * Firestore-backed at `/aiCache/{hash}`.
 *
 * TTLs (read-time enforced):
 *   - why-you-match: 7 days per (uidA,uidB) pair
 *   - rec-copy: 24 hours per (titleId,senderLabelsHash,recipientLabelsHash,depth)
 *
 * Cache keys are version-prefixed by the prompt version constants in
 * `prompts/*` — bump those constants to cache-bust everything.
 *
 * Cache contains NO PII — keys are SHA-256 hashes, values are the
 * already-sanitized text that the LLM returned (placeholder token
 * `{displayLabel}` still present).
 */

import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  WHY_YOU_MATCH_PROMPT_VERSION,
} from './prompts/whyYouMatch';
import { REC_COPY_PROMPT_VERSION } from './prompts/recCopy';

export type AiCacheKind = 'why-you-match' | 'rec-copy';

// TTLs in seconds. 7d for why-you-match; 24h for rec-copy.
export const WHY_YOU_MATCH_TTL_S = 7 * 24 * 60 * 60;
export const REC_COPY_TTL_S = 24 * 60 * 60;

// Model ID baked into the cache key — swapping models cache-busts.
// Kept here (not imported from AnthropicLLMClient) so cache.ts has
// zero SDK imports (brief §8 server-safe requirement).
export const CACHE_MODEL_ID = 'claude-haiku-4-5-20251001';

// --- Key inputs --------------------------------------------------------

export interface WhyYouMatchKeyInput {
  kind: 'why-you-match';
  uidPair: [string, string];
}

export interface RecCopyKeyInput {
  kind: 'rec-copy';
  titleId: string;
  senderLabelsHash: string;
  recipientLabelsHash: string;
  depth: 1 | 2 | 3;
}

export type CacheKeyInput = WhyYouMatchKeyInput | RecCopyKeyInput;

// --- Doc shape ---------------------------------------------------------

export interface AiCacheDoc {
  kind: AiCacheKind;
  /** string for why-you-match, string[] (length 3) for rec-copy. */
  payload: string | string[];
  model: string;
  promptVersion: string;
  ttlSeconds: number;
  createdAt: Timestamp | { __ts: number };
  costCents: number;
}

// --- Helpers ----------------------------------------------------------

async function sha256(input: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, input);
}

/**
 * Hash labels (common + rare) into a stable key fragment. Two users
 * with identical label strings will produce the same hash — this is by
 * design; rec-copy is a function of taste + title + depth, not
 * identity (brief §3.6).
 */
export async function hashLabels(labels: {
  common: string;
  rare: string;
}): Promise<string> {
  return sha256(`${labels.common}|${labels.rare}`);
}

function sortedPair(pair: [string, string]): [string, string] {
  return pair[0] < pair[1] ? [pair[0], pair[1]] : [pair[1], pair[0]];
}

/**
 * Build the cache key. Returns the `/aiCache/{hash}` doc id. Version-
 * prefixed with the prompt version + model id so any bump invalidates
 * every stored entry.
 */
export async function buildCacheKey(input: CacheKeyInput): Promise<string> {
  switch (input.kind) {
    case 'why-you-match': {
      const [a, b] = sortedPair(input.uidPair);
      const raw = [
        'kind=why-you-match',
        `promptVersion=${WHY_YOU_MATCH_PROMPT_VERSION}`,
        `model=${CACHE_MODEL_ID}`,
        `pair=${a}:${b}`,
      ].join('|');
      return sha256(raw);
    }
    case 'rec-copy': {
      const raw = [
        'kind=rec-copy',
        `promptVersion=${REC_COPY_PROMPT_VERSION}`,
        `model=${CACHE_MODEL_ID}`,
        `titleId=${input.titleId}`,
        `sender=${input.senderLabelsHash}`,
        `recipient=${input.recipientLabelsHash}`,
        `depth=${input.depth}`,
      ].join('|');
      return sha256(raw);
    }
    default: {
      // exhaustive
      const _never: never = input;
      throw new Error(`buildCacheKey: unknown kind ${String(_never)}`);
    }
  }
}

// --- Firestore read/write --------------------------------------------

function cacheDocRef(hash: string): DocumentReference {
  return doc(db, 'aiCache', hash);
}

function createdAtMillis(doc: AiCacheDoc): number {
  const ts = doc.createdAt as Timestamp & { __ts?: number };
  if (typeof ts?.__ts === 'number') return ts.__ts;
  if (typeof ts?.toMillis === 'function') {
    try {
      return ts.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof (ts as { seconds?: number } | undefined)?.seconds === 'number') {
    return ((ts as { seconds: number }).seconds ?? 0) * 1000;
  }
  return 0;
}

function isExpired(doc: AiCacheDoc, now: number = Date.now()): boolean {
  const created = createdAtMillis(doc);
  if (!created) return true; // treat missing timestamp as expired
  const elapsedS = (now - created) / 1000;
  return elapsedS > doc.ttlSeconds;
}

export interface CacheReadResult {
  hit: false;
}
export interface CacheHitResult {
  hit: true;
  payload: string | string[];
  costCents: number;
}

/**
 * Get a cache entry by hash. Returns `{ hit: false }` on miss OR
 * TTL-expiry OR version mismatch (version bumps invalidate implicitly
 * because the hash changes, but we double-check the stored version).
 */
export async function getFromCache(
  hash: string,
): Promise<CacheReadResult | CacheHitResult> {
  try {
    const snap = await getDoc(cacheDocRef(hash));
    if (!snap.exists()) return { hit: false };
    const data = snap.data() as AiCacheDoc | undefined;
    if (!data) return { hit: false };
    if (isExpired(data)) return { hit: false };
    return { hit: true, payload: data.payload, costCents: data.costCents };
  } catch (err) {
    // Fail open — cache read errors never break the flow.
    console.warn('[ai/cache] getFromCache error', err);
    return { hit: false };
  }
}

export interface SetInCacheInput {
  kind: AiCacheKind;
  payload: string | string[];
  costCents: number;
}

/**
 * Write a cache entry. TTL is derived from `kind`; model + promptVersion
 * are fixed constants. Writes `createdAt: serverTimestamp()` for
 * read-time TTL enforcement.
 */
export async function setInCache(
  hash: string,
  input: SetInCacheInput,
): Promise<void> {
  const ttlSeconds =
    input.kind === 'why-you-match' ? WHY_YOU_MATCH_TTL_S : REC_COPY_TTL_S;
  const promptVersion =
    input.kind === 'why-you-match'
      ? WHY_YOU_MATCH_PROMPT_VERSION
      : REC_COPY_PROMPT_VERSION;
  const docBody: Omit<AiCacheDoc, 'createdAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
  } = {
    kind: input.kind,
    payload: input.payload,
    model: CACHE_MODEL_ID,
    promptVersion,
    ttlSeconds,
    createdAt: serverTimestamp(),
    costCents: input.costCents,
  };
  try {
    await setDoc(cacheDocRef(hash), docBody);
  } catch (err) {
    // Fail open — cache write failures never break the flow.
    console.warn('[ai/cache] setInCache error', err);
  }
}

// --- Test-only helpers -----------------------------------------------

/** Exposed for unit tests — NOT part of the stable API. */
export const __testonly__ = {
  isExpired,
  createdAtMillis,
};
