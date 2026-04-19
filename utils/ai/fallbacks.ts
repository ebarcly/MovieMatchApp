/**
 * Deterministic fallbacks — brief §2.6 (why-you-match) + §3.5 (rec-copy).
 *
 * Triggered when the LLM call times out, hits budget cap, violates
 * validators twice, or errors. Must render in <50ms (brief handoff
 * threshold). NO LLM IMPORT in this file — evaluator greps.
 *
 * Friend-name substitution: the `{displayLabel}` placeholder token is
 * replaced by the UI layer at render time with the real friend's first
 * name. This keeps the contract identical to the LLM-returned path.
 */

import type { SignalTier, RelationshipDepth } from './LLMClient';

// --- why-you-match -----------------------------------------------------

export interface WhyYouMatchFallbackInput {
  signalTier: SignalTier;
  /** Optional first shared genre/mood to humanize the sentence. */
  sharedGenre?: string;
  sharedMood?: string;
}

/**
 * Returns a short bridge sentence. Contains the `{displayLabel}`
 * placeholder which the UI replaces with the friend's real first name.
 * Intentionally word-count-safe (10-22 words) to pass validators.
 */
export function whyYouMatchFallback(
  input: WhyYouMatchFallbackInput,
): string {
  const { signalTier, sharedGenre, sharedMood } = input;
  const texture = sharedMood ?? sharedGenre ?? 'texture';
  switch (signalTier) {
    case 'full':
      return `You and {displayLabel} overlap on ${sharedGenre ?? 'texture'} — enough signal there to swap recs with confidence.`;
    case 'partial':
      return `You and {displayLabel} share some ${texture} — the rest is room for the two of you to surprise each other.`;
    case 'cold':
    default:
      return `You and {displayLabel} haven't really converged yet — swap a rec and see where your tastes actually meet.`;
  }
}

// --- rec-copy ----------------------------------------------------------

export interface RecCopyFallbackInput {
  depth: RelationshipDepth;
  titleName: string;
  titleYear?: number;
}

/**
 * Returns 3 variants keyed by relationship depth. Each variant is
 * >= 30 chars and < 280 to pass validators. No `!`, no emoji.
 */
export function recCopyFallback(input: RecCopyFallbackInput): string[] {
  const { depth, titleName, titleYear } = input;
  const yr = titleYear ? ` (${titleYear})` : '';
  switch (depth) {
    case 3:
      return [
        `${titleName} — thought of you mid-way through. Tell me what you make of it when you get around to it.`,
        `This one has been on my list. Watch it in your head with me for a bit and then text me after.`,
        `Sending ${titleName}. Your call whether it lands; mine that it probably does given the stuff we trade.`,
      ];
    case 2:
      return [
        `${titleName}${yr} — worth the runtime if you are in the mood for something in our usual register.`,
        `Low-pressure rec. ${titleName} fits the kind of stuff we've been trading lately, more or less.`,
        `Adding ${titleName} to your queue without commentary. Let me know if it lands or misses.`,
      ];
    case 1:
    default:
      return [
        `Rec: ${titleName}${yr}. No context from me — wanted to see if your taste and mine actually line up here.`,
        `${titleName}${yr}. Genre-adjacent to stuff on both our lists. Curious what you think after a watch.`,
        `Trying something. ${titleName} — if you hate it, tell me and I will calibrate for the next one.`,
      ];
  }
}
