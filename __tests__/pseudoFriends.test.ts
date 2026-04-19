/**
 * Sprint 4 test surface: pseudoFriends shape.
 *
 * Asserts:
 *   - At least 3 personas (the Sprint 4 spec minimum)
 *   - Each persona carries `curated: true` (must always be visible;
 *     we never impersonate a real user)
 *   - Each persona exposes a populated 8-axis tasteProfile + dual
 *     identity labels (common + rare)
 *   - Axis values are numeric and within -1..1 range
 */

import {
  pseudoFriends,
  getPseudoFriend,
  type TasteAxis,
} from '../utils/pseudoFriends';

const EXPECTED_AXES: readonly TasteAxis[] = [
  'pacing',
  'era',
  'mood',
  'stakes',
  'tone',
  'genreFluency',
  'realism',
  'runtime',
];

describe('pseudoFriends', () => {
  it('exports at least 3 personas', () => {
    expect(pseudoFriends.length).toBeGreaterThanOrEqual(3);
  });

  it('every persona carries curated: true', () => {
    for (const p of pseudoFriends) {
      expect(p.curated).toBe(true);
    }
  });

  it('every persona has all 8 taste axes as numbers in [-1, 1]', () => {
    for (const p of pseudoFriends) {
      for (const axis of EXPECTED_AXES) {
        const v = p.tasteProfile.axes[axis];
        expect(typeof v).toBe('number');
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('every persona has dual identity labels (common + rare)', () => {
    for (const p of pseudoFriends) {
      expect(p.tasteProfile.labels.common).toBeTruthy();
      expect(p.tasteProfile.labels.rare).toBeTruthy();
      expect(p.tasteProfile.labels.common).not.toEqual(
        p.tasteProfile.labels.rare,
      );
    }
  });

  it('persona avatars are ink backgrounds with accent foregrounds (no bundled images)', () => {
    for (const p of pseudoFriends) {
      expect(p.avatarInitial.length).toBeGreaterThan(0);
      expect(p.avatarBackground).toMatch(/^#/);
      expect(p.avatarForeground).toMatch(/^#/);
    }
  });

  it('getPseudoFriend finds a curated persona by id', () => {
    const first = pseudoFriends[0];
    expect(getPseudoFriend(first.id)).toEqual(first);
    expect(getPseudoFriend('not-a-real-id')).toBeUndefined();
  });
});
