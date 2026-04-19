/**
 * pseudoFriends.ts — curated-persona seed for solo-activation cold start.
 *
 * Sprint 4 social-product + dopamine brief discipline (Rules #4-5): a
 * newly-signed-up user has no real friends yet, but the app's match%
 * framing + stories-strip + activity-feed primitives need SOMETHING to
 * render so the user feels the shape of the product on first open. We
 * hand-author 3 transparent curated personas — each with:
 *
 *   - A `curated: true` flag that is NEVER hidden from the UI. We never
 *     impersonate a real user. The pseudo-friend card always displays
 *     "Curated profile" on its chip.
 *   - A baked `tasteProfile` on the same 8-axis shape the onboarding
 *     quiz writes. Axis values are picked at the persona's character
 *     extremes so Sprint 5 match% can compute a non-trivial dot product
 *     against any real user's quiz result.
 *   - Dual identity labels (common + rare) following optimal-
 *     distinctiveness theory per the briefs. One tribal belonging
 *     label, one rare distinctiveness label.
 *   - A color avatar: ink background + accent letter. No AI generation,
 *     no external images bundled.
 */

import { colors } from '../theme';
import type { TasteProfile } from './firebaseOperations';
// Shared taste-profile types live in firebaseOperations (backbone). We
// re-export here so existing `import { TasteAxis } from '../utils/pseudoFriends'`
// call sites keep compiling while the type lives in one place.
export type {
  TasteAxis,
  TasteLabels,
  TasteProfile,
} from './firebaseOperations';

export interface PseudoFriend {
  id: string;
  name: string;
  avatarInitial: string;
  avatarBackground: string;
  avatarForeground: string;
  tasteProfile: TasteProfile;
  /** Always true; UI must surface this to the user. */
  curated: true;
  /** One-line bio (persona voice). */
  bio: string;
}

/**
 * The three Sprint 4 curated personas. Each is opinionated on at least
 * one axis so its match% against a real user diverges clearly.
 */
export const pseudoFriends: readonly PseudoFriend[] = [
  {
    id: 'curated-criterion',
    name: 'The Criterion-pilled',
    avatarInitial: 'C',
    avatarBackground: colors.ink,
    avatarForeground: colors.accent,
    curated: true,
    bio: 'Subtitles on, phone face-down, three-hour runtime — you know.',
    tasteProfile: {
      axes: {
        pacing: -0.8, // slow
        era: -0.6, // pre-2000 weighted
        mood: -0.4, // melancholic
        stakes: -0.5, // interior / quiet
        tone: -0.7, // literary / serious
        genreFluency: 0.9, // deep cuts
        realism: 0.8, // naturalist
        runtime: 0.7, // long
      },
      labels: {
        common: 'slow cinema',
        rare: 'Tarkovsky apologist',
      },
    },
  },
  {
    id: 'curated-romcom',
    name: 'The Sunday rom-com',
    avatarInitial: 'S',
    avatarBackground: colors.ink,
    avatarForeground: colors.accentSecondary,
    curated: true,
    bio: 'Predictable in the best way. Meet-cute is a love language.',
    tasteProfile: {
      axes: {
        pacing: 0.3, // mid
        era: 0.4, // modern but nostalgic
        mood: 0.8, // warm / comforting
        stakes: -0.3, // low-stakes
        tone: 0.7, // light / hopeful
        genreFluency: 0.2, // curious, not completionist
        realism: -0.2, // lightly stylized
        runtime: -0.2, // 90-110 min sweet spot
      },
      labels: {
        common: 'comfort rewatch',
        rare: '90s meet-cute',
      },
    },
  },
  {
    id: 'curated-scifi',
    name: 'The 3am sci-fi',
    avatarInitial: '3',
    avatarBackground: colors.ink,
    avatarForeground: colors.accent,
    curated: true,
    bio: 'Time-loops, space-ghost cowboys, and whatever that Annihilation thing was.',
    tasteProfile: {
      axes: {
        pacing: 0.0, // measured
        era: 0.6, // modern-leaning
        mood: -0.2, // eerie
        stakes: 0.5, // cosmic
        tone: 0.0, // neutral / ambiguous
        genreFluency: 0.7, // genre-deep
        realism: -0.6, // speculative
        runtime: 0.3, // feature-length plus
      },
      labels: {
        common: 'late-night',
        rare: 'weird sci-fi',
      },
    },
  },
] as const;

/**
 * Helper — find a pseudo-friend by id. Returns undefined if the id is
 * not one of the curated three.
 */
export const getPseudoFriend = (id: string): PseudoFriend | undefined =>
  pseudoFriends.find((p) => p.id === id);
