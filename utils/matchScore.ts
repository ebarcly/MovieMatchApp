/**
 * Sprint 5b / Stream A — taste-overlap scoring between two users.
 *
 * Algorithm (deterministic; zero randomness; zero hidden state):
 *
 *   score =  0.5 * axesDot(axesA, axesB)         // 8-axis dot product in [-1..1] → mapped to [0..1]
 *         +  0.3 * jaccard(titlesA, titlesB)     // shared interactedTitles
 *         +  0.15 * jaccard(genresA, genresB)    // shared genres
 *         +  0.05 * jaccard(servicesA, servicesB) // shared streaming services
 *
 * Weight choices (see Sprint 5b contract §scope Stream A):
 *   - 0.5 on axes: the 8-axis tasteProfile is the strongest signal we have
 *     because it's consent-captured via the quiz (not inferred). Two users
 *     with identical axes feel "wired the same" even if they haven't
 *     watched anything in common yet.
 *   - 0.3 on shared titles: the single clearest "you loved the same thing"
 *     proof point — but strictly a positive-overlap signal; non-overlap
 *     says nothing about fit (brief §3).
 *   - 0.15 on genres: softer overlap; lots of users match here so the
 *     marginal signal is small.
 *   - 0.05 on streaming services: near-cosmetic; it moves the needle only
 *     to break ties between two otherwise-identical matches.
 *
 * The 8 TasteProfile axes live at `tasteProfile.axes` in [-1, 1]. Their
 * cosine similarity is mapped from [-1, 1] to [0, 1] via (1 + sim) / 2 so
 * opposite profiles return ~0 and identical profiles return ~1.
 *
 * Contract invariants:
 *   - Deterministic: same inputs always yield the same output.
 *   - Normalized: score ∈ [0, 1].
 *   - Missing fields default to empty arrays / empty object (see
 *     `toAxesVec` + defaulted fields on `UserTasteProfile`).
 *   - Zero `any`.
 *   - sharedTitleIds are returned numerically sorted (ascending).
 *   - sharedGenres / sharedServices returned alphabetically sorted for
 *     snapshot stability.
 *   - topAxes returns the 3 axes with the highest per-axis agreement
 *     (1 - |a-b|/2), ranked descending; ties broken by axis-name order so
 *     output is deterministic.
 */

import type { TasteAxis, TasteProfile } from './firebaseOperations';

/** Canonical ordering for the 8 tasteProfile axes. */
const AXIS_ORDER: readonly TasteAxis[] = [
  'pacing',
  'era',
  'mood',
  'stakes',
  'tone',
  'genreFluency',
  'realism',
  'runtime',
] as const;

export interface UserTasteProfile {
  userId: string;
  /** 8-axis taste vector in [-1, 1]. Optional — absent = zero-vector. */
  axes?: Partial<Record<TasteAxis, number>> | null;
  interactedTitleIds: number[];
  genres: string[];
  /** Optional; absent treated as empty. */
  streamingServices?: string[];
}

export interface MatchScoreResult {
  /** Composite score in [0, 1]. */
  score: number;
  /** Titles both users interacted with, ascending numeric sort. */
  sharedTitleIds: number[];
  /** Genres both users have, ascending alpha sort. */
  sharedGenres: string[];
  /** Streaming services both users have, ascending alpha sort. */
  sharedServices: string[];
  /**
   * Top 3 most-aligned axes (highest 1 - |a-b|/2 per axis), ranked
   * descending. Shorter if fewer than 3 axes are comparable.
   */
  topAxes: TasteAxis[];
}

// --- Primitive helpers ------------------------------------------------

/** Turn a partial axes map into an ordered 8-vector, defaulting missing to 0. */
function toAxesVec(
  axes: Partial<Record<TasteAxis, number>> | null | undefined,
): number[] {
  const vec: number[] = new Array(AXIS_ORDER.length).fill(0);
  if (!axes) return vec;
  for (let i = 0; i < AXIS_ORDER.length; i++) {
    const v = axes[AXIS_ORDER[i]];
    if (typeof v === 'number' && Number.isFinite(v)) {
      // Clamp into [-1, 1] defensively — downstream sim assumes it.
      vec[i] = Math.max(-1, Math.min(1, v));
    }
  }
  return vec;
}

/**
 * Cosine similarity over the 8-axis vector, mapped from [-1, 1] → [0, 1]
 * so `identical → 1`, `orthogonal → 0.5`, `opposite → 0`. Zero vectors
 * (no quiz data on either side) return 0.5 (neutral — neither match nor
 * mismatch), per brief §3.
 */
function axesSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) {
    return 0.5;
  }
  const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  // Clamp for floating-point drift outside [-1, 1].
  const clamped = Math.max(-1, Math.min(1, cos));
  return (1 + clamped) / 2;
}

/**
 * Jaccard overlap for two sets: |A ∩ B| / |A ∪ B|. Returns 0 on both-empty
 * (no signal in either direction). Deduplicates inputs defensively.
 */
function jaccardNumber(a: number[], b: number[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function jaccardString(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sharedNumbersSorted(a: number[], b: number[]): number[] {
  const setB = new Set(b);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const x of a) {
    if (setB.has(x) && !seen.has(x)) {
      out.push(x);
      seen.add(x);
    }
  }
  return out.sort((x, y) => x - y);
}

function sharedStringsSorted(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of a) {
    if (setB.has(x) && !seen.has(x)) {
      out.push(x);
      seen.add(x);
    }
  }
  return out.sort();
}

/**
 * Per-axis agreement score. For two values in [-1, 1], returns
 * 1 - |a - b| / 2 ∈ [0, 1]. 1 = identical; 0 = opposite extremes.
 */
function axisAgreement(a: number, b: number): number {
  return 1 - Math.abs(a - b) / 2;
}

function computeTopAxes(
  axesA: Partial<Record<TasteAxis, number>> | null | undefined,
  axesB: Partial<Record<TasteAxis, number>> | null | undefined,
  limit: number,
): TasteAxis[] {
  if (!axesA || !axesB) return [];
  const rows: { axis: TasteAxis; agreement: number }[] = [];
  for (const axis of AXIS_ORDER) {
    const a = axesA[axis];
    const b = axesB[axis];
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    rows.push({
      axis,
      agreement: axisAgreement(
        Math.max(-1, Math.min(1, a)),
        Math.max(-1, Math.min(1, b)),
      ),
    });
  }
  // Descending by agreement; ties broken by canonical axis order (stable).
  rows.sort((x, y) => {
    if (y.agreement !== x.agreement) return y.agreement - x.agreement;
    return AXIS_ORDER.indexOf(x.axis) - AXIS_ORDER.indexOf(y.axis);
  });
  return rows.slice(0, limit).map((r) => r.axis);
}

// --- Public API -------------------------------------------------------

/**
 * Compute a deterministic match score between two users.
 *
 * Weighted composite: 0.5 * axes similarity + 0.3 * title Jaccard
 * + 0.15 * genre Jaccard + 0.05 * service Jaccard. Clamped to [0, 1].
 *
 * Zero-knowledge about either user's identity beyond their TasteProfile
 * shape — the signed-in user can compute this client-side in <200ms
 * over a few dozen friends (per Sprint 5b success criteria).
 */
export const computeMatchScore = (
  a: UserTasteProfile,
  b: UserTasteProfile,
): MatchScoreResult => {
  const vecA = toAxesVec(a.axes ?? null);
  const vecB = toAxesVec(b.axes ?? null);

  const sim = axesSimilarity(vecA, vecB);

  const titlesA = Array.isArray(a.interactedTitleIds)
    ? a.interactedTitleIds
    : [];
  const titlesB = Array.isArray(b.interactedTitleIds)
    ? b.interactedTitleIds
    : [];
  const genresA = Array.isArray(a.genres) ? a.genres : [];
  const genresB = Array.isArray(b.genres) ? b.genres : [];
  const servicesA = Array.isArray(a.streamingServices)
    ? a.streamingServices
    : [];
  const servicesB = Array.isArray(b.streamingServices)
    ? b.streamingServices
    : [];

  const titlesOverlap = jaccardNumber(titlesA, titlesB);
  const genresOverlap = jaccardString(genresA, genresB);
  const servicesOverlap = jaccardString(servicesA, servicesB);

  const raw =
    0.5 * sim +
    0.3 * titlesOverlap +
    0.15 * genresOverlap +
    0.05 * servicesOverlap;

  // Defensive clamp — floats can drift.
  const score = Math.max(0, Math.min(1, raw));

  return {
    score,
    sharedTitleIds: sharedNumbersSorted(titlesA, titlesB),
    sharedGenres: sharedStringsSorted(genresA, genresB),
    sharedServices: sharedStringsSorted(servicesA, servicesB),
    topAxes: computeTopAxes(a.axes ?? null, b.axes ?? null, 3),
  };
};

/**
 * Convert a TasteProfile (as stored on the private user doc) into the
 * shape `computeMatchScore` expects. Convenience for call sites that
 * already have the full TasteProfile in hand.
 */
export function tasteProfileToUserTasteProfile(
  userId: string,
  profile: TasteProfile | null | undefined,
  extras: {
    interactedTitleIds: number[];
    genres: string[];
    streamingServices?: string[];
  },
): UserTasteProfile {
  return {
    userId,
    axes: profile?.axes ?? null,
    interactedTitleIds: extras.interactedTitleIds,
    genres: extras.genres,
    streamingServices: extras.streamingServices,
  };
}

export { AXIS_ORDER };
