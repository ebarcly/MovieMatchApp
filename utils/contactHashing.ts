import * as Crypto from 'expo-crypto';

/**
 * Sprint 5a — on-device contact normalization + SHA-256 hashing.
 *
 * Privacy contract (see docs/research/sprint-4-social-product.md):
 *
 *   - Raw phone numbers and email strings NEVER leave the device.
 *   - We normalize to E.164 (phone) or lowercase-trim (email), compute
 *     SHA-256, and upload only the hex digest.
 *   - Other users' public profiles hold the same hashes on their
 *     `contactHashes[]` array (written by the owner at contact-onboarding
 *     time); Firestore `array-contains-any` joins up to 10 candidate
 *     hashes per query.
 *
 * Locale support (tested):
 *
 *   - Dominican Republic: +1 809 / +1 829 / +1 849 — shares NANP so the
 *     same 10-digit body as US numbers. The test suite asserts a raw
 *     10-digit US-style string normalizes identically regardless of
 *     whether the caller supplied a DO country code or defaulted to US.
 *   - United States: +1.
 *   - International: +34 (Spain), +52 (Mexico), +44 (United Kingdom).
 *
 * Design choices:
 *
 *   - Hashes are DETERMINISTIC — SHA-256 with no salt so two users who
 *     hash the same phone number arrive at the same digest. Salting
 *     would kill the lookup. The privacy tradeoff is intentional: the
 *     preimage space is small (~10^10 phone numbers), so anyone who
 *     reads a raw contactHashes array can reverse-match a known number.
 *     This is acceptable because contactHashes is gated behind
 *     Firestore rules (authenticated read only) AND the alternative —
 *     transmitting raw phones — is strictly worse.
 *   - We strip all non-digits, then prefix a "+" so the resulting
 *     string is a valid E.164 prefix. We do NOT attempt full E.164
 *     compliance with libphonenumber-like length validation — that's
 *     a Sprint 6 scope if real-world noise demands it.
 */

/** Map of ISO-3166 2-letter country code → dialing prefix. */
const COUNTRY_PREFIX: Readonly<Record<string, string>> = {
  DO: '1', // Dominican Republic
  US: '1',
  CA: '1',
  ES: '34',
  MX: '52',
  GB: '44',
  UK: '44',
};

/**
 * Normalize a phone number to E.164 form.
 *
 *   normalizePhone('(809) 555-0142', 'DO')  → '+18095550142'
 *   normalizePhone('+1-809-555-0142', 'DO') → '+18095550142'
 *   normalizePhone('555-0142', 'US')        → '+15550142'  // short; still accepted
 *   normalizePhone('+34 600 000 000', 'ES') → '+34600000000'
 *   normalizePhone('52 55 1234 5678', 'MX') → '+525512345678'
 *   normalizePhone('07700 900000', 'GB')    → '+447700900000' (drops leading 0)
 *
 * Rules:
 *   1. If the raw string starts with `+`, trust the user-supplied
 *      country code — strip all non-digits and prefix `+`.
 *   2. Otherwise, strip non-digits. If the resulting digits already
 *      begin with the country's dialing prefix, do not double it.
 *      If the resulting digits begin with '0' (trunk prefix for UK,
 *      ES, etc.), strip the leading zero and prepend the country
 *      prefix.
 *   3. Throws on empty / whitespace-only input.
 */
export function normalizePhone(raw: string, defaultCountry: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('normalizePhone: empty input');
  }
  const country = defaultCountry.toUpperCase();
  const prefix = COUNTRY_PREFIX[country];
  if (!prefix) {
    throw new Error(`normalizePhone: unsupported country "${defaultCountry}"`);
  }

  const trimmed = raw.trim();
  const startedWithPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D+/g, '');

  if (digits.length === 0) {
    throw new Error('normalizePhone: no digits');
  }

  if (startedWithPlus) {
    // Trust the user-supplied country code.
    return `+${digits}`;
  }

  // Strip the national trunk-prefix '0' if present (UK: 07..., ES: 9...,
  // but ES doesn't use leading zero; the UK case is the main one).
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  // If the digits already start with the country prefix, don't double it.
  if (digits.startsWith(prefix)) {
    return `+${digits}`;
  }

  return `+${prefix}${digits}`;
}

/**
 * Normalize an email address to lowercase-trimmed form.
 *
 *   normalizeEmail('  Maya@Example.com ') → 'maya@example.com'
 */
export function normalizeEmail(raw: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('normalizeEmail: empty input');
  }
  return raw.trim().toLowerCase();
}

/**
 * SHA-256 hash a normalized contact identifier.
 *
 * Returns the hex digest (64 chars) via `expo-crypto`'s
 * `digestStringAsync`. Deterministic + no salt so two users who hash
 * the same phone number arrive at the same digest (required for
 * `array-contains-any` matching).
 *
 * Throws on empty input to prevent accidentally hashing the empty
 * string (which would produce the well-known
 * `e3b0c4...` digest and match every empty-hash on the platform).
 */
export async function hashContact(normalized: string): Promise<string> {
  if (typeof normalized !== 'string' || normalized.length === 0) {
    throw new Error('hashContact: empty input');
  }
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
  );
}

/**
 * Batch helper: Firestore's `array-contains-any` operator supports a
 * maximum of 10 comparison values per query. Split an arbitrarily
 * long hash array into length-10 chunks the caller issues in parallel.
 */
export function batchContactHashes<T>(hashes: readonly T[]): T[][] {
  const CHUNK = 10;
  const out: T[][] = [];
  for (let i = 0; i < hashes.length; i += CHUNK) {
    out.push(hashes.slice(i, i + CHUNK));
  }
  return out;
}
