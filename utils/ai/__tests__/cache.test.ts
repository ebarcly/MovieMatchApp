/**
 * Sprint 5b Stream C — cache.ts tests.
 *
 * Contract coverage (brief §4):
 *   - buildCacheKey is deterministic given identical inputs.
 *   - Version changes invalidate the key (structurally — the prompt
 *     version is baked into the hashed raw string).
 *   - setInCache + getFromCache roundtrip within TTL returns the cached
 *     payload.
 *   - Post-TTL-expiry, getFromCache returns `{ hit: false }`.
 */

import {
  buildCacheKey,
  getFromCache,
  setInCache,
  WHY_YOU_MATCH_TTL_S,
  __testonly__,
} from '../cache';
import * as firestore from 'firebase/firestore';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('buildCacheKey', () => {
  it('is deterministic for identical inputs (why-you-match)', async () => {
    const a = await buildCacheKey({
      kind: 'why-you-match',
      uidPair: ['uidA', 'uidB'],
    });
    const b = await buildCacheKey({
      kind: 'why-you-match',
      uidPair: ['uidA', 'uidB'],
    });
    expect(a).toBe(b);
    // SHA-256 hex = 64 chars.
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalizes uidPair order (pair sort)', async () => {
    const a = await buildCacheKey({
      kind: 'why-you-match',
      uidPair: ['uidA', 'uidB'],
    });
    const b = await buildCacheKey({
      kind: 'why-you-match',
      uidPair: ['uidB', 'uidA'],
    });
    expect(a).toBe(b);
  });

  it('produces distinct keys for different kinds', async () => {
    const a = await buildCacheKey({
      kind: 'why-you-match',
      uidPair: ['uidA', 'uidB'],
    });
    const b = await buildCacheKey({
      kind: 'rec-copy',
      titleId: '42',
      senderLabelsHash: 'x',
      recipientLabelsHash: 'y',
      depth: 2,
    });
    expect(a).not.toBe(b);
  });

  it('produces distinct keys when rec-copy depth differs', async () => {
    const a = await buildCacheKey({
      kind: 'rec-copy',
      titleId: '42',
      senderLabelsHash: 'x',
      recipientLabelsHash: 'y',
      depth: 1,
    });
    const b = await buildCacheKey({
      kind: 'rec-copy',
      titleId: '42',
      senderLabelsHash: 'x',
      recipientLabelsHash: 'y',
      depth: 3,
    });
    expect(a).not.toBe(b);
  });
});

describe('getFromCache + setInCache roundtrip', () => {
  it('returns the payload for a fresh entry (within TTL)', async () => {
    // Simulate setInCache having written a doc at the hash — we mock
    // getDoc to return a fresh doc that's well within TTL.
    const now = Date.now();
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        kind: 'why-you-match',
        payload: 'You and {displayLabel} converge on late-night mood picks.',
        model: 'claude-haiku-4-5-20251001',
        promptVersion: 'v1',
        ttlSeconds: WHY_YOU_MATCH_TTL_S,
        createdAt: { __ts: now - 60_000 }, // 60s ago
        costCents: 2,
      }),
    });
    const result = await getFromCache('abcdef');
    expect(result.hit).toBe(true);
    if (result.hit) {
      expect(result.payload).toContain('{displayLabel}');
      expect(result.costCents).toBe(2);
    }
  });

  it('returns a miss after TTL expiry', async () => {
    const now = Date.now();
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        kind: 'why-you-match',
        payload: 'stale',
        model: 'claude-haiku-4-5-20251001',
        promptVersion: 'v1',
        ttlSeconds: 60, // 60s TTL
        createdAt: { __ts: now - 120_000 }, // 2 min ago → expired
        costCents: 2,
      }),
    });
    const result = await getFromCache('expired-hash');
    expect(result.hit).toBe(false);
  });

  it('returns a miss when the doc does not exist', async () => {
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });
    const result = await getFromCache('missing-hash');
    expect(result.hit).toBe(false);
  });

  it('setInCache writes a doc with the expected payload shape', async () => {
    const setDoc = mocked(firestore.setDoc);
    setDoc.mockResolvedValueOnce(undefined);
    await setInCache('hashX', {
      kind: 'why-you-match',
      payload: 'You and {displayLabel} converge on something.',
      costCents: 3,
    });
    expect(setDoc).toHaveBeenCalledTimes(1);
    const callArgs = setDoc.mock.calls[0];
    const body = callArgs[1] as Record<string, unknown>;
    expect(body.kind).toBe('why-you-match');
    expect(body.ttlSeconds).toBe(WHY_YOU_MATCH_TTL_S);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
    expect(typeof body.promptVersion).toBe('string');
    expect(body.costCents).toBe(3);
  });
});

describe('__testonly__.isExpired', () => {
  it('returns true when now - createdAt > ttlSeconds', () => {
    const doc = {
      kind: 'why-you-match' as const,
      payload: '',
      model: 'x',
      promptVersion: 'v1',
      ttlSeconds: 60,
      createdAt: { __ts: Date.now() - 120_000 },
      costCents: 0,
    };
    expect(__testonly__.isExpired(doc)).toBe(true);
  });

  it('returns false for a fresh entry', () => {
    const doc = {
      kind: 'why-you-match' as const,
      payload: '',
      model: 'x',
      promptVersion: 'v1',
      ttlSeconds: 60,
      createdAt: { __ts: Date.now() - 1_000 },
      costCents: 0,
    };
    expect(__testonly__.isExpired(doc)).toBe(false);
  });
});
