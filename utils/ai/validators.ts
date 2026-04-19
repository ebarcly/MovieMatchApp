/**
 * Runtime validators — brief §2.5 + §3.3.
 *
 * On validator fail, the caller retries ONCE with temperature -0.2 and
 * an appended directive. On second fail, return the deterministic
 * fallback (see fallbacks.ts).
 *
 * These validators are exported for test + for the caller to use. Keep
 * them pure (no Firestore, no SDK imports).
 */

// --- why-you-match -----------------------------------------------------

const WHY_YOU_MATCH_BAD_PATTERNS: readonly RegExp[] = [
  /!/, // no exclamation
  /\?/, // no question marks
  /\bcompatib/i, // compatibility language
  /\btop\b/i, // ranking
  /\bmore than\b/i, // comparison
  /\d+\s?%/, // any "X%" in the sentence
  /\brank/i,
  /\bscore/i,
  /\bmost\b/i,
  /love movies|are into movies|both like films/i, // platitudes
] as const;

/** Word count for a whitespace-separated sentence. */
export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Returns true iff the sentence passes all why-you-match guard rails.
 * Target range 10-22 words; hard ceiling 30 per brief §2.5 (caller may
 * tighten to 22 via retry).
 */
export function sentenceIsValid(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  const wc = wordCount(trimmed);
  if (wc < 10 || wc > 30) return false;
  for (const pat of WHY_YOU_MATCH_BAD_PATTERNS) {
    if (pat.test(trimmed)) return false;
  }
  return true;
}

// --- rec-copy ----------------------------------------------------------

// Character classes banned in variants (brief §3.3):
//   !            — no hype
//   emoji/symbols (U+1F300-U+1FAFF, U+2600-U+27BF)
//   #            — no hashtags
const REC_COPY_BAD_CHARS_RE = /[!#\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export const REC_COPY_MIN_LEN = 30;
export const REC_COPY_MAX_LEN = 280;

/** Individual variant passes length + banned-char rules. */
export function variantIsValid(v: string): boolean {
  if (typeof v !== 'string') return false;
  if (v.length < REC_COPY_MIN_LEN) return false;
  if (v.length > REC_COPY_MAX_LEN) return false;
  if (REC_COPY_BAD_CHARS_RE.test(v)) return false;
  return true;
}

function firstWord(s: string): string {
  return (
    s
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') ?? ''
  );
}

/**
 * Batch validator — exactly 3 variants, all pass individual check, no
 * two start with the same first word. Throws a descriptive Error on
 * failure so tests can assert on the message.
 */
export function assertRecCopyBatch(variants: string[]): void {
  if (!Array.isArray(variants) || variants.length !== 3) {
    throw new Error(
      `rec-copy: expected exactly 3 variants, got ${variants?.length ?? 'none'}`,
    );
  }
  const firstWords = new Set<string>();
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (!variantIsValid(v)) {
      throw new Error(
        `rec-copy: variant ${i} failed validation (length=${v?.length ?? 0})`,
      );
    }
    const fw = firstWord(v);
    if (firstWords.has(fw)) {
      throw new Error(`rec-copy: duplicate first word "${fw}"`);
    }
    firstWords.add(fw);
  }
}

/** Non-throwing variant of `assertRecCopyBatch` for policy decisions. */
export function recCopyBatchIsValid(variants: string[]): boolean {
  try {
    assertRecCopyBatch(variants);
    return true;
  } catch {
    return false;
  }
}

// --- export bundle ----------------------------------------------------

export const WHY_YOU_MATCH_BAD_PATTERNS_EXPORT = WHY_YOU_MATCH_BAD_PATTERNS;
export const REC_COPY_BAD_CHARS_RE_EXPORT = REC_COPY_BAD_CHARS_RE;
