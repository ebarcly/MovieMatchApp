/**
 * RecCardShareSheet — Sprint 5b Stream B.
 *
 * Tiny helper that wraps the native `Share` API. Exposes
 * `openRecShare(shareUrl, friendName)` for the compose screen to call
 * on "Send" success. Kept small on purpose — the design-rich share path
 * is the Stream E match-card image; this is the default-sheet rec path.
 */

import { Share, type ShareContent, type ShareOptions } from 'react-native';

export interface OpenRecShareResult {
  /** True iff the system reported the user completed the share. */
  shared: boolean;
}

/**
 * Open the native share sheet with a rec-card preview URL. Returns
 * `{ shared: true }` on user-action dismissal (`'sharedAction'` on iOS),
 * `{ shared: false }` otherwise. Errors propagate to the caller.
 */
export async function openRecShare(
  shareUrl: string,
  friendName: string,
): Promise<OpenRecShareResult> {
  const content: ShareContent = {
    message: `Sending you a rec: ${shareUrl}`,
    url: shareUrl,
    title: `Rec for ${friendName}`,
  };
  const options: ShareOptions = {
    dialogTitle: `Send rec to ${friendName}`,
    subject: `Rec for ${friendName}`,
  };
  const result = await Share.share(content, options);
  if (result.action === Share.sharedAction) {
    return { shared: true };
  }
  return { shared: false };
}
