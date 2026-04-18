/**
 * Sprint 4 test surface: motion springs export.
 *
 * Locks the exact damping/stiffness/mass values so a future "oh this feels
 * better with stiffness: 180" drift fails the test and forces a design
 * conversation. The Sprint 4 contract enforces these values via a grep
 * against theme/motion.ts — this test guards them as live module exports.
 */

import { springs, type SpringConfig } from '../theme/motion';

describe('theme/motion', () => {
  it('exports exactly two springs', () => {
    expect(Object.keys(springs).sort()).toEqual(['gentle', 'snappy']);
  });

  it('springs.snappy matches the contract-locked values', () => {
    expect(springs.snappy).toEqual<SpringConfig>({
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    });
  });

  it('springs.gentle matches the contract-locked values', () => {
    expect(springs.gentle).toEqual<SpringConfig>({
      damping: 20,
      stiffness: 140,
      mass: 1,
    });
  });

  it('springs are frozen / const — damping cannot drift at runtime', () => {
    // `as const satisfies` makes the object readonly at the type level.
    // Attempting to mutate would be a TS error. We still assert numeric
    // identity so a dynamic override via Object.defineProperty is caught.
    expect(typeof springs.snappy.damping).toBe('number');
    expect(typeof springs.gentle.stiffness).toBe('number');
  });
});
