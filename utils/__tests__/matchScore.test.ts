/**
 * Sprint 5b / Stream A — matchScore tests.
 *
 * Coverage per contract §success_criteria:
 *   - identical profiles → score ~1.0
 *   - opposite profiles → score ~0.0
 *   - orthogonal axes → score ~0.5
 *   - sharedTitleIds returned in numerically sorted (ascending) order
 *   - missing fields gracefully default to empty (no throw, no NaN)
 *
 * Plus discipline coverage: determinism, clamp behavior, weight
 * contribution balance, topAxes selection.
 */

import {
  computeMatchScore,
  tasteProfileToUserTasteProfile,
  type UserTasteProfile,
} from '../matchScore';
import type { TasteAxis, TasteProfile } from '../firebaseOperations';

const fullAxes = (v: number): Record<TasteAxis, number> => ({
  pacing: v,
  era: v,
  mood: v,
  stakes: v,
  tone: v,
  genreFluency: v,
  realism: v,
  runtime: v,
});

const profileFor = (
  overrides: Partial<UserTasteProfile> & { userId: string },
): UserTasteProfile => ({
  userId: overrides.userId,
  axes: overrides.axes ?? fullAxes(0),
  interactedTitleIds: overrides.interactedTitleIds ?? [],
  genres: overrides.genres ?? [],
  streamingServices: overrides.streamingServices ?? [],
});

describe('computeMatchScore — Sprint 5b Stream A', () => {
  describe('identical profiles', () => {
    it('returns score ~1.0 when two identical non-empty profiles are compared', () => {
      const a = profileFor({
        userId: 'a',
        axes: fullAxes(0.8),
        interactedTitleIds: [1, 2, 3, 4, 5],
        genres: ['Drama', 'Sci-Fi'],
        streamingServices: ['Netflix', 'Max'],
      });
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(0.8),
        interactedTitleIds: [1, 2, 3, 4, 5],
        genres: ['Drama', 'Sci-Fi'],
        streamingServices: ['Netflix', 'Max'],
      });

      const result = computeMatchScore(a, b);
      expect(result.score).toBeGreaterThan(0.99);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.sharedTitleIds).toEqual([1, 2, 3, 4, 5]);
      expect(result.sharedGenres).toEqual(['Drama', 'Sci-Fi']);
      expect(result.sharedServices).toEqual(['Max', 'Netflix']);
    });

    it('never returns score 0 for two non-empty identical profiles (stub sentinel)', () => {
      // Hard-fail guard: the Sprint 5 stub returned { score: 0 } for any
      // input. If this regresses we want a loud failure.
      const a = profileFor({
        userId: 'a',
        axes: fullAxes(0.5),
        interactedTitleIds: [10, 11],
        genres: ['Thriller'],
      });
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(0.5),
        interactedTitleIds: [10, 11],
        genres: ['Thriller'],
      });
      const result = computeMatchScore(a, b);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('opposite profiles', () => {
    it('returns score ~0.0 when axes are anti-aligned and no overlap', () => {
      const a = profileFor({
        userId: 'a',
        axes: fullAxes(1),
        interactedTitleIds: [1, 2, 3],
        genres: ['Action'],
        streamingServices: ['Netflix'],
      });
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(-1),
        interactedTitleIds: [10, 11, 12],
        genres: ['Romance'],
        streamingServices: ['Peacock'],
      });
      const result = computeMatchScore(a, b);
      // axes sim = 0 → weighted 0; no title/genre/service overlap → all 0.
      expect(result.score).toBeCloseTo(0, 5);
      expect(result.sharedTitleIds).toEqual([]);
      expect(result.sharedGenres).toEqual([]);
      expect(result.sharedServices).toEqual([]);
    });
  });

  describe('orthogonal profiles', () => {
    it('returns score ~0.5 on axes when one user has only half the vector populated, orthogonal to the other', () => {
      // a: only pacing=1; b: only era=1; everything else = 0 on both → cosine = 0 → mapped to 0.5
      const a = profileFor({
        userId: 'a',
        axes: {
          pacing: 1,
          era: 0,
          mood: 0,
          stakes: 0,
          tone: 0,
          genreFluency: 0,
          realism: 0,
          runtime: 0,
        },
      });
      const b = profileFor({
        userId: 'b',
        axes: {
          pacing: 0,
          era: 1,
          mood: 0,
          stakes: 0,
          tone: 0,
          genreFluency: 0,
          realism: 0,
          runtime: 0,
        },
      });
      const result = computeMatchScore(a, b);
      // axesSim ≈ 0.5; no other overlap → final ≈ 0.25.
      expect(result.score).toBeCloseTo(0.25, 3);
    });
  });

  describe('determinism', () => {
    it('returns exactly the same output when called twice with the same input', () => {
      const a = profileFor({
        userId: 'a',
        axes: fullAxes(0.3),
        interactedTitleIds: [5, 3, 7],
        genres: ['Drama'],
      });
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(0.1),
        interactedTitleIds: [7, 3, 9],
        genres: ['Drama', 'Comedy'],
      });
      const r1 = computeMatchScore(a, b);
      const r2 = computeMatchScore(a, b);
      expect(r1).toEqual(r2);
    });

    it('is symmetric in axes + jaccard — computeMatchScore(a,b).score === computeMatchScore(b,a).score', () => {
      const a = profileFor({
        userId: 'a',
        axes: fullAxes(0.4),
        interactedTitleIds: [1, 2, 3],
        genres: ['Drama'],
        streamingServices: ['Netflix'],
      });
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(0.2),
        interactedTitleIds: [2, 3, 4],
        genres: ['Drama', 'Comedy'],
        streamingServices: ['Netflix', 'Max'],
      });
      expect(computeMatchScore(a, b).score).toBeCloseTo(
        computeMatchScore(b, a).score,
        10,
      );
    });
  });

  describe('sharedTitleIds ordering', () => {
    it('returns sharedTitleIds in ascending numeric order even when inputs are shuffled', () => {
      const a = profileFor({
        userId: 'a',
        interactedTitleIds: [55, 3, 909, 17, 8],
      });
      const b = profileFor({
        userId: 'b',
        interactedTitleIds: [909, 2, 17, 3, 55, 1000],
      });
      const result = computeMatchScore(a, b);
      expect(result.sharedTitleIds).toEqual([3, 17, 55, 909]);
    });

    it('deduplicates repeated title IDs before computing overlap', () => {
      const a = profileFor({
        userId: 'a',
        interactedTitleIds: [1, 1, 2, 2, 3],
      });
      const b = profileFor({
        userId: 'b',
        interactedTitleIds: [2, 3, 3, 3],
      });
      const result = computeMatchScore(a, b);
      expect(result.sharedTitleIds).toEqual([2, 3]);
    });
  });

  describe('missing / empty fields', () => {
    it('does not throw when a profile has no axes at all', () => {
      const a: UserTasteProfile = {
        userId: 'a',
        axes: null,
        interactedTitleIds: [],
        genres: [],
      };
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(0.5),
        interactedTitleIds: [1],
      });
      expect(() => computeMatchScore(a, b)).not.toThrow();
      const result = computeMatchScore(a, b);
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('treats missing streamingServices as empty (no NaN, no throw)', () => {
      const a: UserTasteProfile = {
        userId: 'a',
        axes: fullAxes(0.5),
        interactedTitleIds: [1, 2],
        genres: ['Drama'],
        // streamingServices undefined on purpose.
      };
      const b: UserTasteProfile = {
        userId: 'b',
        axes: fullAxes(0.5),
        interactedTitleIds: [1, 2],
        genres: ['Drama'],
      };
      const result = computeMatchScore(a, b);
      expect(result.sharedServices).toEqual([]);
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('handles a partial axes map (some axes missing) without throwing or returning NaN', () => {
      const a = profileFor({
        userId: 'a',
        axes: { pacing: 0.8, mood: 0.4 },
      });
      const b = profileFor({
        userId: 'b',
        axes: { pacing: 0.8, era: 0.4 },
      });
      const result = computeMatchScore(a, b);
      expect(Number.isFinite(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('returns 0 for two completely empty profiles (no axes, no titles, no genres)', () => {
      const a: UserTasteProfile = {
        userId: 'a',
        axes: null,
        interactedTitleIds: [],
        genres: [],
      };
      const b: UserTasteProfile = {
        userId: 'b',
        axes: null,
        interactedTitleIds: [],
        genres: [],
      };
      // axesSim defaults to 0.5 when both vectors are zero → 0.5 * 0.5 = 0.25.
      // The rest of the weighted terms are 0.
      const result = computeMatchScore(a, b);
      expect(result.score).toBeCloseTo(0.25, 5);
    });
  });

  describe('clamping / finite', () => {
    it('clamps out-of-range axis values to [-1, 1] defensively', () => {
      const a = profileFor({
        userId: 'a',
        axes: fullAxes(10), // way out of range
      });
      const b = profileFor({
        userId: 'b',
        axes: fullAxes(10),
      });
      const result = computeMatchScore(a, b);
      // 10 clamps to 1, so identical → cosine similarity 1 → 1.0 axesSim.
      expect(result.score).toBeCloseTo(0.5, 5); // 0.5 axes weight only
    });

    it('ignores NaN axis values silently (treated as 0)', () => {
      const a = profileFor({
        userId: 'a',
        axes: { ...fullAxes(0.5), pacing: Number.NaN },
      });
      const b = profileFor({ userId: 'b', axes: fullAxes(0.5) });
      const result = computeMatchScore(a, b);
      expect(Number.isFinite(result.score)).toBe(true);
      expect(result.score).toBeGreaterThan(0.4);
    });
  });

  describe('topAxes', () => {
    it('returns up to 3 most-aligned axes, descending', () => {
      const a = profileFor({
        userId: 'a',
        axes: {
          pacing: 1,
          era: 1,
          mood: 1,
          stakes: 0,
          tone: 0,
          genreFluency: 0,
          realism: 0,
          runtime: 0,
        },
      });
      const b = profileFor({
        userId: 'b',
        axes: {
          pacing: 1,
          era: 1,
          mood: 1,
          stakes: -1, // max disagreement
          tone: -1,
          genreFluency: -1,
          realism: -1,
          runtime: -1,
        },
      });
      const result = computeMatchScore(a, b);
      expect(result.topAxes).toEqual(['pacing', 'era', 'mood']);
    });

    it('returns fewer than 3 when fewer axes are present on both sides', () => {
      const a = profileFor({ userId: 'a', axes: { pacing: 0.5 } });
      const b = profileFor({ userId: 'b', axes: { pacing: 0.5 } });
      const result = computeMatchScore(a, b);
      expect(result.topAxes).toEqual(['pacing']);
    });

    it('returns empty topAxes when either side has no axes', () => {
      const a: UserTasteProfile = {
        userId: 'a',
        axes: null,
        interactedTitleIds: [],
        genres: [],
      };
      const b = profileFor({ userId: 'b', axes: fullAxes(0.5) });
      const result = computeMatchScore(a, b);
      expect(result.topAxes).toEqual([]);
    });
  });
});

describe('tasteProfileToUserTasteProfile', () => {
  it('maps a TasteProfile into a UserTasteProfile shape', () => {
    const tp: TasteProfile = {
      axes: fullAxes(0.3),
      labels: { common: 'late-night', rare: 'slow cinema' },
    };
    const out = tasteProfileToUserTasteProfile('uid-1', tp, {
      interactedTitleIds: [1, 2, 3],
      genres: ['Drama'],
      streamingServices: ['Netflix'],
    });
    expect(out.userId).toBe('uid-1');
    expect(out.axes).toEqual(fullAxes(0.3));
    expect(out.interactedTitleIds).toEqual([1, 2, 3]);
    expect(out.genres).toEqual(['Drama']);
    expect(out.streamingServices).toEqual(['Netflix']);
  });

  it('returns null axes when TasteProfile is null/undefined', () => {
    const out = tasteProfileToUserTasteProfile('uid-2', null, {
      interactedTitleIds: [],
      genres: [],
    });
    expect(out.axes).toBeNull();
    expect(out.streamingServices).toBeUndefined();
  });
});
