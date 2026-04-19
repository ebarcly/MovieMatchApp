/**
 * LLMClient — Sprint 5b Stream C
 *
 * Single interface the UI layer imports. Sprint 6 will introduce
 * `CloudFunctionLLMClient` that moves inference server-side without any
 * caller changes; the DI root is the only file that swaps. Every caller
 * MUST import from this file, never from `@anthropic-ai/sdk` directly —
 * that indirection is the migration seam per brief §8.
 *
 * Strict PII: these types never carry `displayName`, `email`, `phone`,
 * or `uid`. The UI layer substitutes `{displayLabel}` placeholder with
 * the friend's real first name AFTER the LLMClient returns. The concrete
 * implementation is forbidden from seeing real identity fields.
 */
import type { TasteAxis, TasteLabels } from '../firebaseOperations';

// --- shared ------------------------------------------------------------

export type SignalTier = 'full' | 'partial' | 'cold';

/** 3 = mutual match, 2 = friend, 1 = new contact. */
export type RelationshipDepth = 1 | 2 | 3;

// --- why-you-match -----------------------------------------------------

export interface WhyYouMatchProfile {
  /** Tribal/rare labels only — no displayName, no uid. */
  tasteLabels: TasteLabels;
  /** Top 2-3 taste axes in `[-1,1]` sorted by |value|. */
  topAxes: { axis: TasteAxis; value: number }[];
}

export interface WhyYouMatchOverlap {
  sharedGenres: string[];
  sharedEras: string[];
  sharedMoods: string[];
  sharedDirectors: string[];
  signalTier: SignalTier;
}

export interface WhyYouMatchInput {
  user: WhyYouMatchProfile;
  friend: WhyYouMatchProfile;
  overlap: WhyYouMatchOverlap;
}

export interface WhyYouMatchOutput {
  /**
   * The model's sentence BEFORE displayLabel substitution. Contains the
   * literal placeholder token `{displayLabel}`. The UI layer substitutes
   * the friend's real first name at render time.
   */
  text: string;
  degraded: boolean;
  costCents: number;
  degradedReason?: DegradedReason;
}

// --- rec-copy ----------------------------------------------------------

export interface RecCopyTitle {
  id: string;
  /** Title name — sanitized before going into prompt. */
  name: string;
  year: number;
  genres: string[];
  director?: string;
  runtime?: number;
  oneLineSynopsis?: string;
}

export interface RecCopyProfile {
  tasteLabels: TasteLabels;
}

export interface RecCopyInput {
  title: RecCopyTitle;
  sender: RecCopyProfile;
  recipient: RecCopyProfile;
  relationshipDepth: RelationshipDepth;
}

export interface RecCopyOutput {
  /** Exactly 3 strings, each 30-280 chars, distinct first words. */
  variants: string[];
  degraded: boolean;
  costCents: number;
  degradedReason?: DegradedReason;
}

// --- error taxonomy ----------------------------------------------------

export type DegradedReason =
  | 'timeout'
  | 'rate_limit'
  | 'budget_cap'
  | 'llm_error'
  | 'rejected'
  | 'offline';

// --- interface ---------------------------------------------------------

export interface LLMClient {
  whyYouMatch(input: WhyYouMatchInput): Promise<WhyYouMatchOutput>;
  recCopy(input: RecCopyInput): Promise<RecCopyOutput>;
}
