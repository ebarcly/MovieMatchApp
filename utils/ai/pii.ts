/**
 * PII sanitizer for LLM inputs — brief §6.
 *
 * Strict-PII per ratified decision: the prompt NEVER sees `displayName`,
 * `email`, `phone`, `uid`, avatar URL, contact book. This module strips
 * characters that could be used for prompt injection and wraps the
 * payload in a `<input>...</input>` delimiter so the system prompt can
 * treat everything inside as DATA, never INSTRUCTION.
 *
 * The caller (AnthropicLLMClient) first builds a PII-free payload, then
 * passes it through `sanitizeLLMInput` before embedding it in the user
 * message. The UI layer substitutes `{displayLabel}` with the friend's
 * real first name AFTER the model returns.
 *
 * This file NEVER imports `displayName`, `email`, `phone`, or `uid`
 * from anywhere — defense-in-depth.
 */

const BANNED_CHARS_RE = /[{}<>`\u0000-\u001F]/g;
const MAX_LABEL_LEN = 80;
const MAX_TITLE_LEN = 200;

/**
 * Strip prompt-injection-risky characters. Does NOT touch quotes or
 * apostrophes — those are legitimate in taste labels and titles.
 */
export function stripBannedChars(raw: string): string {
  return raw.replace(BANNED_CHARS_RE, '');
}

/** Cap a string to at most `max` chars. Truncates on grapheme boundary-ish (JS string length is UTF-16 code units, close enough for our Latin-heavy content). */
export function capLength(raw: string, max: number): string {
  if (raw.length <= max) return raw;
  return raw.slice(0, max);
}

export function sanitizeLabel(raw: string): string {
  return capLength(stripBannedChars(raw), MAX_LABEL_LEN).trim();
}

export function sanitizeTitle(raw: string): string {
  return capLength(stripBannedChars(raw), MAX_TITLE_LEN).trim();
}

/**
 * Wrap a pre-serialized JSON string in `<input>...</input>` so the
 * system prompt can instruct the model to treat the inside as data.
 *
 * CALLER RESPONSIBILITY: the string passed in must NOT contain
 * displayName / email / phone / uid. This function only enforces
 * character + length limits; PII exclusion is a property of the caller.
 */
export function wrapInputDelimiter(jsonLike: string): string {
  // Defensive: strip any literal </input> a hostile payload may have
  // slipped in, to prevent early-close of our delimiter.
  const sanitized = jsonLike.replace(/<\/?input>/gi, '');
  return `<input>${sanitized}</input>`;
}

/**
 * One-shot sanitizer: strip banned chars + cap length (label rules) +
 * wrap in `<input>` delimiter. Used when the caller has a plain string
 * to embed; structured payloads use the per-field helpers above and
 * then call `wrapInputDelimiter` on the serialized JSON.
 */
export function sanitizeLLMInput(raw: string): string {
  return wrapInputDelimiter(sanitizeLabel(raw));
}

/**
 * Narrow type for the fields we intentionally pass to the model.
 * Mirrors `WhyYouMatchInput` / `RecCopyInput` shape but lives here so
 * `pii.ts` has zero deps on `LLMClient.ts` (and therefore zero chance
 * of accidentally importing a PII-carrying type).
 */
export interface SanitizedWhyYouMatchPayload {
  user: {
    tasteLabels: { common: string; rare: string };
    topAxes: { axis: string; value: number }[];
  };
  friend: {
    /** Literal placeholder — never a real name. */
    displayLabel: '{displayLabel}';
    tasteLabels: { common: string; rare: string };
    topAxes: { axis: string; value: number }[];
  };
  overlap: {
    sharedGenres: string[];
    sharedEras: string[];
    sharedMoods: string[];
    sharedDirectors: string[];
    signalTier: 'full' | 'partial' | 'cold';
  };
}

export interface SanitizedRecCopyPayload {
  title: {
    id: string;
    name: string;
    year: number;
    genres: string[];
    director?: string;
    runtime?: number;
    oneLineSynopsis?: string;
  };
  sender: { tasteLabels: { common: string; rare: string } };
  recipient: { tasteLabels: { common: string; rare: string } };
  relationshipDepth: 1 | 2 | 3;
}

/** Helper: sanitize a full tasteLabels block. */
export function sanitizeTasteLabels(labels: {
  common: string;
  rare: string;
}): { common: string; rare: string } {
  return {
    common: sanitizeLabel(labels.common),
    rare: sanitizeLabel(labels.rare),
  };
}
