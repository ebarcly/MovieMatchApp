/**
 * Sprint 5a — friend-graph backbone tests.
 *
 * Asserts:
 *   - friendshipId is deterministic: (uidA,uidB) === (uidB,uidA).
 *   - friendshipId rejects empty / self-pair.
 *   - sendFriendRequest writes a pending doc with initiatedBy = fromUid.
 *   - sendFriendRequest is a no-op if a doc already exists.
 *   - acceptFriendRequest transitions to 'accepted' with acceptedAt.
 *   - declineFriendRequest deletes the doc.
 *   - listFriends queries participants + status='accepted'.
 *   - listPendingRequests filters direction correctly.
 */

import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  listFriends,
  listPendingRequests,
  friendshipId,
} from '../utils/firebaseOperations';
import * as firestore from 'firebase/firestore';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

describe('friendshipId — deterministic pair hash (Sprint 5a)', () => {
  it('returns the same id regardless of argument order', () => {
    const uidA = 'alpha';
    const uidB = 'bravo';
    const forward = friendshipId(uidA, uidB);
    const reverse = friendshipId(uidB, uidA);
    expect(forward).toBe(reverse);
    // Lexicographically sorted: alpha < bravo → "alpha_bravo".
    expect(forward).toBe('alpha_bravo');
  });

  it('returns the same id for alphabetically-swapped uids', () => {
    const uid1 = 'user-z';
    const uid2 = 'user-a';
    expect(friendshipId(uid1, uid2)).toEqual(friendshipId(uid2, uid1));
    expect(friendshipId(uid1, uid2)).toBe('user-a_user-z');
  });

  it('rejects empty uid', () => {
    expect(() => friendshipId('', 'a')).toThrow(/empty uid/);
    expect(() => friendshipId('a', '')).toThrow(/empty uid/);
  });

  it('rejects self-pair (cannot befriend yourself)', () => {
    expect(() => friendshipId('a', 'a')).toThrow(/yourself/);
  });
});

describe('sendFriendRequest (Sprint 5a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a pending friendship at the deterministic doc id', async () => {
    // No existing doc.
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });

    const result = await sendFriendRequest('alpha', 'bravo');

    expect(result.id).toBe('alpha_bravo');
    expect(result.status).toBe('pending');
    expect(result.initiatedBy).toBe('alpha');

    // doc(db, 'friendships', 'alpha_bravo')
    expect(mocked(firestore.doc)).toHaveBeenCalledWith(
      expect.anything(),
      'friendships',
      'alpha_bravo',
    );

    expect(mocked(firestore.setDoc)).toHaveBeenCalledTimes(1);
    const payload = mocked(firestore.setDoc).mock.calls[0][1] as {
      participants: string[];
      status: string;
      initiatedBy: string;
    };
    expect(payload.participants).toEqual(['alpha', 'bravo']);
    expect(payload.status).toBe('pending');
    expect(payload.initiatedBy).toBe('alpha');
  });

  it('is a no-op if the friendship doc already exists', async () => {
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        participants: ['alpha', 'bravo'],
        status: 'pending',
        initiatedBy: 'bravo',
        createdAt: 0,
      }),
    });

    const result = await sendFriendRequest('alpha', 'bravo');

    expect(result.initiatedBy).toBe('bravo');
    expect(mocked(firestore.setDoc)).not.toHaveBeenCalled();
  });
});

describe('acceptFriendRequest (Sprint 5a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("transitions status to 'accepted' with acceptedAt stamp", async () => {
    await acceptFriendRequest('alpha_bravo');

    expect(mocked(firestore.updateDoc)).toHaveBeenCalledTimes(1);
    const payload = mocked(firestore.updateDoc).mock.calls[0][1] as {
      status: string;
      acceptedAt: unknown;
    };
    expect(payload.status).toBe('accepted');
    expect(payload.acceptedAt).toBeDefined();
  });

  it('throws on empty friendshipId', async () => {
    await expect(acceptFriendRequest('')).rejects.toThrow(/empty friendshipId/);
  });
});

describe('declineFriendRequest (Sprint 5a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the friendship document', async () => {
    await declineFriendRequest('alpha_bravo');
    expect(mocked(firestore.deleteDoc)).toHaveBeenCalledTimes(1);
    expect(mocked(firestore.doc)).toHaveBeenCalledWith(
      expect.anything(),
      'friendships',
      'alpha_bravo',
    );
  });

  it('throws on empty friendshipId', async () => {
    await expect(declineFriendRequest('')).rejects.toThrow(
      /empty friendshipId/,
    );
  });
});

describe('listFriends (Sprint 5a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns accepted friendships where uid is a participant', async () => {
    mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [],
      forEach: (cb: (d: { id: string; data: () => unknown }) => void) => {
        cb({
          id: 'alpha_bravo',
          data: () => ({
            participants: ['alpha', 'bravo'],
            status: 'accepted',
            initiatedBy: 'alpha',
            createdAt: 0,
            acceptedAt: 1,
          }),
        });
      },
    });

    const friends = await listFriends('alpha');
    expect(friends).toHaveLength(1);
    expect(friends[0].id).toBe('alpha_bravo');
    expect(friends[0].status).toBe('accepted');

    // Query filters: array-contains participants + status=accepted.
    expect(mocked(firestore.where)).toHaveBeenCalledWith(
      'participants',
      'array-contains',
      'alpha',
    );
    expect(mocked(firestore.where)).toHaveBeenCalledWith(
      'status',
      '==',
      'accepted',
    );
  });

  it('returns [] for empty uid', async () => {
    const friends = await listFriends('');
    expect(friends).toEqual([]);
    expect(mocked(firestore.getDocs)).not.toHaveBeenCalled();
  });
});

describe('listPendingRequests (Sprint 5a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("'incoming' excludes requests the user initiated", async () => {
    mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [],
      forEach: (cb: (d: { id: string; data: () => unknown }) => void) => {
        cb({
          id: 'alpha_bravo',
          data: () => ({
            participants: ['alpha', 'bravo'],
            status: 'pending',
            initiatedBy: 'bravo', // someone else → incoming for alpha
            createdAt: 0,
          }),
        });
        cb({
          id: 'alpha_charlie',
          data: () => ({
            participants: ['alpha', 'charlie'],
            status: 'pending',
            initiatedBy: 'alpha', // alpha initiated → outgoing, NOT incoming
            createdAt: 0,
          }),
        });
      },
    });

    const incoming = await listPendingRequests('alpha', 'incoming');
    expect(incoming).toHaveLength(1);
    expect(incoming[0].id).toBe('alpha_bravo');
    expect(incoming[0].initiatedBy).toBe('bravo');
  });

  it("'outgoing' excludes requests initiated by someone else", async () => {
    mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [],
      forEach: (cb: (d: { id: string; data: () => unknown }) => void) => {
        cb({
          id: 'alpha_bravo',
          data: () => ({
            participants: ['alpha', 'bravo'],
            status: 'pending',
            initiatedBy: 'bravo',
            createdAt: 0,
          }),
        });
        cb({
          id: 'alpha_charlie',
          data: () => ({
            participants: ['alpha', 'charlie'],
            status: 'pending',
            initiatedBy: 'alpha',
            createdAt: 0,
          }),
        });
      },
    });

    const outgoing = await listPendingRequests('alpha', 'outgoing');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].id).toBe('alpha_charlie');
    expect(outgoing[0].initiatedBy).toBe('alpha');
  });

  it('returns [] for empty uid', async () => {
    const pending = await listPendingRequests('', 'incoming');
    expect(pending).toEqual([]);
  });
});
