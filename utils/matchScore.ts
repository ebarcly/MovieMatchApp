/**
 * Sprint 5 target: taste-overlap scoring between two users.
 *
 * This module is a stub — the full algorithm (shared-likes / shared-genres /
 * shared-services weighted per the roadmap in
 * docs/harness/contracts/moviematch-sprint-5.md once drafted) is out of
 * scope for Sprint 3. The signature below is what Sprint 5's generator
 * fills in; the stub returns 0 so the whole app still type-checks.
 */

export interface UserTasteProfile {
  userId: string;
  interactedTitleIds: number[];
  genres: string[];
  streamingServices?: string[];
}

export interface MatchScoreResult {
  score: number; // 0..1
  sharedTitleIds: number[];
  sharedGenres: string[];
}

/**
 * Sprint 5 stub — always returns 0 / empty. Tests assert the signature is
 * present (not the algorithm, which is feature-work).
 */
export const computeMatchScore = (
  a: UserTasteProfile,
  b: UserTasteProfile,
): MatchScoreResult => {
  void a;
  void b;
  return {
    score: 0,
    sharedTitleIds: [],
    sharedGenres: [],
  };
};
