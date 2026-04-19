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
 * dir. Returns the tmp-file URI. Does NOT open the Share sheet —
 * callers should then hide the capture-visible wrapper and invoke
 * `shareCapturedMatchCard(uri)` separately so the browse-the-share-sheet
 * time isn't counted against any capture timeout.
 *
 * Dimensions pinned to 1080x1920 for iMessage/Snap/IG-Story legibility.
 */
export async function captureMatchCardToFile(
  cardRef: MatchCardRefLike,
): Promise<string> {
  const uri = await captureRef(cardRef.current as RefObject<unknown>, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: 1080,
    height: 1920,
  });
  return uri;
}

/**
 * Open the native Share sheet with a previously-captured PNG URI. No
 * timeout — user can browse the sheet for as long as they want.
 */
export async function shareCapturedMatchCard(uri: string): Promise<void> {
  await Share.share({ url: uri, message: uri });
}

/**
 * Convenience wrapper — capture then share in one call. Preserved for
 * backwards compatibility; new callers should prefer the split form so
 * the capture-visible wrapper can be hidden before the share sheet
 * opens.
 */
export async function shareMatchCardFromRef(
  cardRef: MatchCardRefLike,
): Promise<void> {
  const uri = await captureMatchCardToFile(cardRef);
  await shareCapturedMatchCard(uri);
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
