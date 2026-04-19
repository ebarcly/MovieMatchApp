/**
 * Sprint 5a — contact normalization + SHA-256 hashing tests.
 *
 * Locales covered (contract floor):
 *   - Dominican Republic: +1 809 / +1 829 / +1 849 (NANP)
 *   - United States: +1
 *   - Spain: +34
 *   - Mexico: +52
 *   - United Kingdom: +44
 *
 * Hashing guarantees:
 *   - Deterministic — same input → same hex digest.
 *   - Email lowercased + trimmed before hashing.
 *   - Empty input rejected.
 */

import {
  normalizePhone,
  normalizeEmail,
  hashContact,
  batchContactHashes,
} from '../utils/contactHashing';

describe('contactHashing — normalizePhone (Sprint 5a)', () => {
  it('Dominican Republic: +1 809 variants normalize identically', () => {
    expect(normalizePhone('(809) 555-0142', 'DO')).toBe('+18095550142');
    expect(normalizePhone('+1 809 555 0142', 'DO')).toBe('+18095550142');
    expect(normalizePhone('+1-809-555-0142', 'DO')).toBe('+18095550142');
    // A US-typed number from a DR contact still collapses to the same
    // E.164 string because NANP shares the +1 prefix.
    expect(normalizePhone('8095550142', 'US')).toBe('+18095550142');
  });

  it('United States: +1 variants normalize identically', () => {
    expect(normalizePhone('(415) 555-0101', 'US')).toBe('+14155550101');
    expect(normalizePhone('+1 415 555 0101', 'US')).toBe('+14155550101');
    expect(normalizePhone('415.555.0101', 'US')).toBe('+14155550101');
  });

  it('Spain: +34 normalizes and dedupes the country prefix', () => {
    expect(normalizePhone('+34 600 000 000', 'ES')).toBe('+34600000000');
    expect(normalizePhone('600 000 000', 'ES')).toBe('+34600000000');
    // Already-prefixed number shouldn't get doubled.
    expect(normalizePhone('34600000000', 'ES')).toBe('+34600000000');
  });

  it('Mexico: +52 normalizes', () => {
    expect(normalizePhone('+52 55 1234 5678', 'MX')).toBe('+525512345678');
    expect(normalizePhone('55 1234 5678', 'MX')).toBe('+525512345678');
  });

  it('United Kingdom: +44 strips the leading trunk-zero', () => {
    // UK numbers are typed locally as 07700 900000; E.164 drops the 0.
    expect(normalizePhone('07700 900000', 'GB')).toBe('+447700900000');
    expect(normalizePhone('+44 7700 900000', 'GB')).toBe('+447700900000');
    expect(normalizePhone('44 7700 900000', 'GB')).toBe('+447700900000');
  });

  it('throws on empty or whitespace-only input', () => {
    expect(() => normalizePhone('', 'US')).toThrow(/empty input/);
    expect(() => normalizePhone('   ', 'US')).toThrow(/empty input/);
  });

  it('throws on unsupported country code', () => {
    expect(() => normalizePhone('555-1234', 'ZZ')).toThrow(
      /unsupported country/,
    );
  });

  it('throws when no digits present', () => {
    expect(() => normalizePhone('abc-def-ghij', 'US')).toThrow(/no digits/);
  });
});

describe('contactHashing — normalizeEmail (Sprint 5a)', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Maya@Example.com ')).toBe('maya@example.com');
    expect(normalizeEmail('USER@DOMAIN.IO')).toBe('user@domain.io');
  });

  it('rejects empty input', () => {
    expect(() => normalizeEmail('')).toThrow(/empty input/);
    expect(() => normalizeEmail('   ')).toThrow(/empty input/);
  });
});

describe('contactHashing — hashContact (Sprint 5a)', () => {
  it('produces a 64-char lowercase hex SHA-256 digest', async () => {
    const hash = await hashContact('+18095550142');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: same input → same digest', async () => {
    const a = await hashContact('+18095550142');
    const b = await hashContact('+18095550142');
    expect(a).toBe(b);
  });

  it('different inputs → different digests', async () => {
    const a = await hashContact('+18095550142');
    const b = await hashContact('+18095550143');
    expect(a).not.toBe(b);
  });

  it('matches the normalized-phone contract end-to-end', async () => {
    // Two users entering the same DO number via different formats should
    // produce the same hash — that's how contact matching works.
    const userAInput = normalizePhone('(809) 555-0142', 'DO');
    const userBInput = normalizePhone('+1-809-555-0142', 'DO');
    const hashA = await hashContact(userAInput);
    const hashB = await hashContact(userBInput);
    expect(hashA).toBe(hashB);
  });

  it('rejects empty input', async () => {
    await expect(hashContact('')).rejects.toThrow(/empty input/);
  });
});

describe('contactHashing — batchContactHashes (Sprint 5a)', () => {
  it('splits into length-10 chunks for Firestore array-contains-any', () => {
    const hashes = Array.from({ length: 25 }, (_, i) => `h${i}`);
    const batches = batchContactHashes(hashes);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(10);
    expect(batches[1]).toHaveLength(10);
    expect(batches[2]).toHaveLength(5);
  });

  it('returns an empty array for empty input', () => {
    expect(batchContactHashes([])).toEqual([]);
  });

  it('returns a single batch for <10 hashes', () => {
    expect(batchContactHashes(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']]);
  });
});
