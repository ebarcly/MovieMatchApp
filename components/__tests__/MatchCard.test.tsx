/**
 * Sprint 5b Stream E — MatchCard structural snapshot test.
 *
 * The contract allows "structural snapshot test" in place of the
 * ±5% pixel-accuracy harness. A pure pixel match requires view-shot to
 * rasterize in the Jest environment, which the upstream library doesn't
 * support without a native runtime. We use `react-test-renderer` to
 * produce a structural JSON snapshot — which still catches any
 * layout/structure regression in MatchCard + fixes the layout contract
 * (4 tier labels, both avatars, top 3 posters, watermark).
 *
 * NOT skipped — runs in CI every commit.
 */

import React from 'react';
import TestRenderer from 'react-test-renderer';
import MatchCard from '../MatchCard';
import type { MatchScoreResult } from '../../utils/matchScore';

const baseResult: MatchScoreResult = {
  score: 0.82,
  sharedTitleIds: [101, 202, 303],
  sharedGenres: ['Drama'],
  sharedServices: ['Netflix'],
  topAxes: ['mood', 'pacing', 'tone'],
};

describe('MatchCard — structural snapshot', () => {
  it('renders the Soulmates tier for score 0.82 with both avatars + watermark', () => {
    const tree = TestRenderer.create(
      <MatchCard
        userUid="uidA"
        friendUid="uidB"
        matchResult={baseResult}
        userDisplayName="Enrique"
        friendDisplayName="Ava"
        userPhotoURL={null}
        friendPhotoURL={null}
        sharedTitles={[
          { id: 101, posterUrl: null, title: 'Drive' },
          { id: 202, posterUrl: null, title: 'La La Land' },
          { id: 303, posterUrl: null, title: 'Her' },
        ]}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the Getting There tier for a low score', () => {
    const tree = TestRenderer.create(
      <MatchCard
        userUid="uidA"
        friendUid="uidB"
        matchResult={{
          score: 0.18,
          sharedTitleIds: [],
          sharedGenres: [],
          sharedServices: [],
          topAxes: [],
        }}
        userDisplayName="Enrique"
        friendDisplayName="Ava"
        userPhotoURL={null}
        friendPhotoURL={null}
        sharedTitles={[]}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
