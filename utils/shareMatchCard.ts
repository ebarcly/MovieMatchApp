/**
 * shareMatchCard — Sprint 5b Stream E.
 *
 * Captures `<MatchCard />` at 9:16 (1080x1920) via `react-native-view-shot`,
 * writes a PNG to the app's cache dir, and opens the native Share sheet.
 *
 * The caller provides a ref to the mounted card view (see FriendDetailScreen
 * for the canonical hidden-off-screen-render + capture pattern).
 */

import { Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';

export interface MatchCardRefLike {
  // `captureRef` accepts any React Native view ref; keep the type loose
  // here so callers aren't locked into a specific ref shape.
  current: unknown;
}

/**
 * Capture the currently-mounted MatchCard ref into a PNG in the cache
 * dir and open the system Share sheet.
 *
 * Dimensions pinned to 1080x1920 for iMessage/Snap/IG-Story legibility.
 */
export async function shareMatchCardFromRef(
  cardRef: MatchCardRefLike,
): Promise<void> {
  const uri = await captureRef(cardRef.current as RefObject<unknown>, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: 1080,
    height: 1920,
  });
  await Share.share({ url: uri, message: uri });
}

/**
 * Convenience entry point — opens a Share sheet with a match-preview
 * deep-link URL. Used by FriendDetailScreen when a mounted card ref
 * isn't available (the screen composes its own ref for the rich path
 * and falls back to this deep-link for a degraded share).
 */
export async function shareMatchCard(
  userUid: string,
  friendUid: string,
): Promise<void> {
  const url = `https://moviematch-6367e.web.app/match/${userUid}-${friendUid}`;
  await Share.share({ url, message: url });
}
