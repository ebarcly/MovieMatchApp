/**
 * Sprint 5b Stream B — createRec op tests.
 *
 * Contract invariants verified:
 *   - note.length < 30 → throws a typed error BEFORE any Firestore call.
 *   - note.length === 30 passes.
 *   - note.length === 280 passes.
 *   - note.length > 280 → throws a typed error BEFORE any Firestore call.
 *   - Returns `{ recId, shareUrl }` where shareUrl contains the recId.
 *
 * Firestore transport is mocked per jest.setup.ts — `addDoc` returns a
 * stable fake ID. Tests assert on the rejection messages + on addDoc
 * being called / not-called as appropriate.
 */

import { createRec, RecNoteLengthError } from '../firebaseOperations';
import * as firestore from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

// jest.setup.ts mocks firebase/firestore; we override addDoc here.
beforeEach(() => {
  jest.clearAllMocks();
  // createRec reads auth.currentUser.uid; sign us in for happy-path cases.
  (auth as unknown as { currentUser: { uid: string } }).currentUser = {
    uid: 'sender-uid',
  };
});

const buildNote = (len: number): string => 'x'.repeat(len);

describe('createRec — length guard', () => {
  it('rejects a 28-char note before calling Firestore', async () => {
    const addDoc = mocked(firestore.addDoc);
    await expect(createRec('friend-uid', 42, buildNote(28))).rejects.toThrow(
      RecNoteLengthError,
    );
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('accepts a 30-char note (floor inclusive)', async () => {
    const addDoc = mocked(firestore.addDoc);
    addDoc.mockResolvedValueOnce({ id: 'rec-30' });
    const result = await createRec('friend-uid', 42, buildNote(30));
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(result.recId).toBe('rec-30');
    expect(result.shareUrl).toContain('rec-30');
  });

  it('accepts a 280-char note (ceiling inclusive)', async () => {
    const addDoc = mocked(firestore.addDoc);
    addDoc.mockResolvedValueOnce({ id: 'rec-280' });
    const result = await createRec('friend-uid', 42, buildNote(280));
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(result.recId).toBe('rec-280');
    expect(result.shareUrl).toContain('rec-280');
  });

  it('rejects a 281-char note before calling Firestore', async () => {
    const addDoc = mocked(firestore.addDoc);
    await expect(createRec('friend-uid', 42, buildNote(281))).rejects.toThrow(
      RecNoteLengthError,
    );
    expect(addDoc).not.toHaveBeenCalled();
  });
});

describe('createRec — return shape', () => {
  it('returns a share URL with the web domain + recId', async () => {
    const addDoc = mocked(firestore.addDoc);
    addDoc.mockResolvedValueOnce({ id: 'abc123' });
    const result = await createRec('friend-uid', 7, buildNote(50));
    expect(result.shareUrl).toMatch(/^https?:\/\/.+\/rec\/abc123$/);
  });
});
