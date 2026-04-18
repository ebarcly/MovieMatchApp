/**
 * Sprint 3 test surface: core firebaseOperations.
 *
 * Asserts:
 * - recordTitleInteraction writes to /users/{uid}/interactedTitles/{titleId}
 * - addToWatchlist writes to /users/{uid}/watchlist/{titleId} (subcollection)
 * - fetchUserWatchlist READS the subcollection, not a doc field
 *   (regression guard for Sprint 2 BUG-4 split-brain)
 */

import {
  recordTitleInteraction,
  addToWatchlist,
  fetchUserWatchlist,
} from '../utils/firebaseOperations';
import * as firestore from 'firebase/firestore';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

describe('firebaseOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordTitleInteraction', () => {
    it('writes to users/{uid}/interactedTitles/{titleId}', async () => {
      await recordTitleInteraction('user-1', 42, 'movie', 'liked');

      expect(mocked(firestore.doc)).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'user-1',
        'interactedTitles',
        '42',
      );
      expect(mocked(firestore.setDoc)).toHaveBeenCalledTimes(1);
      const call = mocked(firestore.setDoc).mock.calls[0];
      expect(call[1]).toMatchObject({
        id: 42,
        type: 'movie',
        action: 'liked',
      });
    });

    it('throws when required arguments are missing', async () => {
      await expect(
        // Force invalid state through a double-cast; we specifically test the runtime guard.
        recordTitleInteraction(
          '',
          0 as unknown as number,
          'movie',
          'liked',
        ),
      ).rejects.toThrow(/Invalid data for recordTitleInteraction/);
    });
  });

  describe('addToWatchlist', () => {
    it('writes to the /users/{uid}/watchlist/{titleId} subcollection path', async () => {
      await addToWatchlist('user-2', { id: 77, type: 'tv' });

      expect(mocked(firestore.doc)).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'user-2',
        'watchlist',
        '77',
      );
      expect(mocked(firestore.setDoc)).toHaveBeenCalledTimes(1);
      expect(mocked(firestore.setDoc).mock.calls[0][1]).toEqual({
        id: 77,
        type: 'tv',
      });
    });

    it('throws when userId or movieItem.id is missing', async () => {
      // reason: intentionally pass an invalid empty userId to exercise the runtime guard.
      await expect(addToWatchlist('', { id: 1, type: 'movie' })).rejects.toThrow(
        /Invalid data for addToWatchlist/,
      );
    });
  });

  describe('fetchUserWatchlist (Sprint 2 BUG-4 regression guard)', () => {
    it('READS from the watchlist subcollection — not from a doc field', async () => {
      mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          { data: () => ({ id: 1, type: 'movie' }) },
          { data: () => ({ id: 2, type: 'tv' }) },
        ],
        forEach: () => {},
      });

      const result = await fetchUserWatchlist('user-3');

      // The function MUST have called collection() with the subcollection
      // path — this is the BUG-4 regression guard.
      expect(mocked(firestore.collection)).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'user-3',
        'watchlist',
      );
      // It MUST NOT have gone through getDoc (the old split-brain path that
      // dereffed a doc field).
      expect(mocked(firestore.getDoc)).not.toHaveBeenCalled();
      expect(mocked(firestore.getDocs)).toHaveBeenCalledTimes(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, type: 'movie' });
      expect(result[1]).toEqual({ id: 2, type: 'tv' });
    });

    it('returns [] for a missing userId without throwing', async () => {
      const result = await fetchUserWatchlist(undefined);
      expect(result).toEqual([]);
      expect(mocked(firestore.getDocs)).not.toHaveBeenCalled();
    });
  });
});
