/**
 * MovieMatchApp — motion primitives (Sprint 4).
 *
 * The entire app shares exactly two spring configs. Inline spring literals
 * anywhere outside this module are a contract violation (see Sprint 4
 * verify_command for the enforced ban). Using one config per interaction
 * class is the single biggest cohesion lever from the Sprint 4 mobile-UX
 * brief Rule #12 — "crisp, not bouncy."
 *
 *   - `snappy` — taps, toggles, button press-states, selection chrome.
 *     damping 18 / stiffness 220 / mass 0.9. Arrives quickly with almost
 *     no overshoot (Linear / Arc flavor, not Disney).
 *   - `gentle` — sheet and panel motion, keyboard avoidance, hero-card
 *     in/out transitions, post-quiz CTA fade-in. damping 20 / stiffness
 *     140 / mass 1. A slower settle with zero overshoot.
 *
 * The shape is a Reanimated `WithSpringConfig`-compatible literal so it
 * slots into `withSpring(target, springs.snappy)` directly. Moti's
 * `transition={{ type: 'spring', ...springs.snappy }}` also consumes it.
 */

export interface SpringConfig {
  readonly damping: number;
  readonly stiffness: number;
  readonly mass: number;
}

export const springs = {
  /** Taps, toggles, button press states. Quick arrive, ~0 overshoot. */
  snappy: {
    damping: 18,
    stiffness: 220,
    mass: 0.9,
  },
  /** Sheets, panels, keyboard avoidance. Slow settle, no overshoot. */
  gentle: {
    damping: 20,
    stiffness: 140,
    mass: 1,
  },
} as const satisfies Record<string, SpringConfig>;

export type SpringName = keyof typeof springs;
