/**
 * Sprint 3 test surface: match% stub.
 *
 * Placeholder for Sprint 5 match% algorithm. Documents the expected
 * signature so downstream code can import + call the function without
 * the actual algorithm landing this sprint.
 */

import {
  computeMatchScore,
  type UserTasteProfile,
  type MatchScoreResult,
} from '../utils/matchScore';

describe('matchScore stub (Sprint 5 placeholder)', () => {
  it('computeMatchScore is callable with two UserTasteProfiles', () => {
    const a: UserTasteProfile = {
      userId: 'a',
      interactedTitleIds: [1, 2, 3],
      genres: ['Drama'],
    };
    const b: UserTasteProfile = {
      userId: 'b',
      interactedTitleIds: [2, 3, 4],
      genres: ['Drama', 'Comedy'],
    };
    const result: MatchScoreResult = computeMatchScore(a, b);

    // Stub guarantees: return-shape is honored; score is a number in [0, 1];
    // arrays are arrays (Sprint 5 fills them in for real).
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.sharedTitleIds)).toBe(true);
    expect(Array.isArray(result.sharedGenres)).toBe(true);
  });

  it.skip('computes overlap of interactedTitles between two users — Sprint 5', () => {
    // This is the Sprint 5 spec. Un-skip + implement in computeMatchScore
    // when Sprint 5's contract lands.
    const a: UserTasteProfile = {
      userId: 'a',
      interactedTitleIds: [1, 2, 3],
      genres: ['Drama'],
    };
    const b: UserTasteProfile = {
      userId: 'b',
      interactedTitleIds: [2, 3, 4],
      genres: ['Drama'],
    };
    const result = computeMatchScore(a, b);
    expect(result.sharedTitleIds.sort()).toEqual([2, 3]);
    expect(result.sharedGenres).toEqual(['Drama']);
    expect(result.score).toBeGreaterThan(0);
  });
});
