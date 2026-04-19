/**
 * Sprint 5b / Stream D — queue ops tests.
 *
 * Coverage per contract §scope Stream D:
 *   - createQueue with 2..5 participants accepted; 1 + 6 rejected.
 *   - addTitleToQueue is idempotent — same titleId twice → no extra
 *     updateDoc call.
 *   - reactToQueueTitle upserts per (titleId, uid) — second call with a
 *     different emoji replaces the first via a dotted field path.
 *   - markTitleWatched rotates nextPickUid round-robin in the lex-sorted
 *     participants order.
 *   - listQueuesForUid returns [] for empty uid and parses snapshot rows.
 *
 * Uses the global firebase/firestore mock in jest.setup.ts; tests
 * override specific operations per case.
 */

import * as firestore from 'firebase/firestore';
import {
  createQueue,
  addTitleToQueue,
  reactToQueueTitle,
  markTitleWatched,
  listQueuesForUid,
  nextPickerAfter,
  queueReactionKey,
} from '../firebaseOperations';
import { auth } from '../../firebaseConfig';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

const setCurrentUser = (uid: string | null): void => {
  (auth as unknown as { currentUser: { uid: string } | null }).currentUser = uid
    ? { uid }
    : null;
};

beforeEach(() => {
  jest.clearAllMocks();
  setCurrentUser('alice');
});

describe('queueReactionKey', () => {
  it('returns `${titleId}_${uid}`', () => {
    expect(queueReactionKey(42, 'alice')).toBe('42_alice');
  });
  it('rejects empty uid', () => {
    expect(() => queueReactionKey(42, '')).toThrow(/empty uid/);
  });
  it('rejects non-finite titleId', () => {
    expect(() => queueReactionKey(Number.NaN, 'alice')).toThrow(
      /non-finite titleId/,
    );
  });
});

describe('nextPickerAfter — round-robin rotation', () => {
  it('advances to the next participant in the given order', () => {
    expect(nextPickerAfter(['alpha', 'bravo', 'charlie'], 'alpha')).toBe(
      'bravo',
    );
    expect(nextPickerAfter(['alpha', 'bravo', 'charlie'], 'bravo')).toBe(
      'charlie',
    );
  });
  it('wraps around from the last participant back to the first', () => {
    expect(nextPickerAfter(['alpha', 'bravo', 'charlie'], 'charlie')).toBe(
      'alpha',
    );
  });
  it('falls back to the first participant when the picker is unknown', () => {
    expect(nextPickerAfter(['alpha', 'bravo'], 'zeta')).toBe('alpha');
  });
});

describe('createQueue — participant range enforcement', () => {
  it('accepts a 2-participant queue and lex-sorts participants', async () => {
    mocked(firestore.addDoc).mockResolvedValueOnce({ id: 'q-new' });
    const doc1 = await createQueue(['bravo', 'alpha']);
    expect(doc1.id).toBe('q-new');
    expect(doc1.participants).toEqual(['alpha', 'bravo']);
    expect(doc1.orderedTitleIds).toEqual([]);
    expect(doc1.reactions).toEqual({});
    // First lex-sorted participant is the initial picker.
    expect(doc1.nextPickUid).toBe('alpha');
  });

  it('accepts a 5-participant queue', async () => {
    mocked(firestore.addDoc).mockResolvedValueOnce({ id: 'q-5' });
    const doc1 = await createQueue(['e', 'd', 'c', 'b', 'a']);
    expect(doc1.participants).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(doc1.nextPickUid).toBe('a');
  });

  it('rejects a 1-participant queue', async () => {
    await expect(createQueue(['solo'])).rejects.toThrow(/range 2-5/);
  });

  it('rejects a 6-participant queue', async () => {
    await expect(createQueue(['a', 'b', 'c', 'd', 'e', 'f'])).rejects.toThrow(
      /range 2-5/,
    );
  });

  it('rejects duplicate participant uids', async () => {
    await expect(createQueue(['alpha', 'alpha'])).rejects.toThrow(
      /duplicate participant/,
    );
  });

  it('rejects empty uid within the participants list', async () => {
    await expect(createQueue(['alpha', ''])).rejects.toThrow(
      /empty\/non-string participant uid/,
    );
  });

  it('passes an optional name through to the payload', async () => {
    mocked(firestore.addDoc).mockResolvedValueOnce({ id: 'q-named' });
    await createQueue(['alpha', 'bravo'], 'Friday-night');
    const payload = mocked(firestore.addDoc).mock.calls[0][1] as {
      name?: string;
    };
    expect(payload.name).toBe('Friday-night');
  });
});

describe('addTitleToQueue — idempotence', () => {
  it('appends a new title when not already present', async () => {
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        participants: ['alpha', 'bravo'],
        orderedTitleIds: [],
        reactions: {},
        nextPickUid: 'alpha',
        createdAt: 0,
      }),
    });
    await addTitleToQueue('q-1', 42);
    expect(mocked(firestore.updateDoc)).toHaveBeenCalledTimes(1);
    const payload = mocked(firestore.updateDoc).mock.calls[0][1] as {
      orderedTitleIds: number[];
    };
    expect(payload.orderedTitleIds).toEqual([42]);
  });

  it('is a no-op (no updateDoc) when the title is already in the queue', async () => {
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        participants: ['alpha', 'bravo'],
        orderedTitleIds: [42, 99],
        reactions: {},
        nextPickUid: 'alpha',
        createdAt: 0,
      }),
    });
    await addTitleToQueue('q-1', 42);
    expect(mocked(firestore.updateDoc)).not.toHaveBeenCalled();
  });

  it('throws on a missing queue', async () => {
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });
    await expect(addTitleToQueue('q-missing', 42)).rejects.toThrow(/not found/);
  });

  it('throws on non-finite titleId', async () => {
    await expect(addTitleToQueue('q-1', Number.NaN)).rejects.toThrow(
      /non-finite titleId/,
    );
  });
});

describe('reactToQueueTitle — upsert per (title, user)', () => {
  it('writes a dotted-field reaction under reactions.<titleId>_<uid>', async () => {
    setCurrentUser('alice');
    await reactToQueueTitle('q-1', 42, '🔥');
    expect(mocked(firestore.updateDoc)).toHaveBeenCalledTimes(1);
    const payload = mocked(firestore.updateDoc).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(payload['reactions.42_alice']).toBe('🔥');
  });

  it('upserts — a second call from the same user replaces the first', async () => {
    setCurrentUser('alice');
    await reactToQueueTitle('q-1', 42, '👍');
    await reactToQueueTitle('q-1', 42, '😴');
    const first = mocked(firestore.updateDoc).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    const second = mocked(firestore.updateDoc).mock.calls[1][1] as Record<
      string,
      unknown
    >;
    expect(first['reactions.42_alice']).toBe('👍');
    expect(second['reactions.42_alice']).toBe('😴');
  });

  it('rejects an invalid emoji', async () => {
    setCurrentUser('alice');
    await expect(
      reactToQueueTitle('q-1', 42, '💯' as unknown as '👍'),
    ).rejects.toThrow(/invalid reaction/);
  });

  it('throws when not signed in', async () => {
    setCurrentUser(null);
    await expect(reactToQueueTitle('q-1', 42, '👍')).rejects.toThrow(
      /not signed in/,
    );
  });
});

describe('markTitleWatched — round-robin rotation', () => {
  it('advances nextPickUid from alice → bravo when alice is the picker', async () => {
    setCurrentUser('alice');
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        participants: ['alice', 'bravo', 'charlie'],
        orderedTitleIds: [42],
        reactions: {},
        nextPickUid: 'alice',
        createdAt: 0,
      }),
    });
    await markTitleWatched('q-1', 42);
    const payload = mocked(firestore.updateDoc).mock.calls[0][1] as {
      nextPickUid: string;
    };
    expect(payload.nextPickUid).toBe('bravo');
  });

  it('wraps from the last participant back to the first', async () => {
    setCurrentUser('charlie');
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        participants: ['alice', 'bravo', 'charlie'],
        orderedTitleIds: [42],
        reactions: {},
        nextPickUid: 'charlie',
        createdAt: 0,
      }),
    });
    await markTitleWatched('q-1', 42);
    const payload = mocked(firestore.updateDoc).mock.calls[0][1] as {
      nextPickUid: string;
    };
    expect(payload.nextPickUid).toBe('alice');
  });

  it('rejects a non-picker caller (rule + op layer agree)', async () => {
    setCurrentUser('bravo'); // alice is the picker
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        participants: ['alice', 'bravo'],
        orderedTitleIds: [42],
        reactions: {},
        nextPickUid: 'alice',
        createdAt: 0,
      }),
    });
    await expect(markTitleWatched('q-1', 42)).rejects.toThrow(
      /not the current picker/,
    );
    expect(mocked(firestore.updateDoc)).not.toHaveBeenCalled();
  });

  it('rotates across a full round through a 3-participant queue', async () => {
    const participants = ['a', 'b', 'c'];
    // Simulate 3 successive markWatched calls, each picker advancing.
    const run = async (picker: string): Promise<string> => {
      setCurrentUser(picker);
      mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          participants,
          orderedTitleIds: [1],
          reactions: {},
          nextPickUid: picker,
          createdAt: 0,
        }),
      });
      await markTitleWatched('q-1', 1);
      const last = mocked(firestore.updateDoc).mock.calls.pop();
      const payload = (last?.[1] ?? {}) as { nextPickUid: string };
      return payload.nextPickUid;
    };
    expect(await run('a')).toBe('b');
    expect(await run('b')).toBe('c');
    expect(await run('c')).toBe('a');
  });

  it('throws on a missing queue', async () => {
    setCurrentUser('alice');
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });
    await expect(markTitleWatched('q-gone', 1)).rejects.toThrow(/not found/);
  });

  it('throws when not signed in', async () => {
    setCurrentUser(null);
    await expect(markTitleWatched('q-1', 1)).rejects.toThrow(/not signed in/);
  });
});

describe('listQueuesForUid', () => {
  it('returns [] for empty uid without querying', async () => {
    const out = await listQueuesForUid('');
    expect(out).toEqual([]);
    expect(mocked(firestore.getDocs)).not.toHaveBeenCalled();
  });

  it('parses a snapshot into QueueDoc rows', async () => {
    mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [],
      forEach: (cb: (d: { id: string; data: () => unknown }) => void) => {
        cb({
          id: 'q-1',
          data: () => ({
            participants: ['alice', 'bravo'],
            orderedTitleIds: [42],
            reactions: { '42_alice': '👍' },
            nextPickUid: 'alice',
            createdAt: 0,
            name: 'Friday',
          }),
        });
      },
    });
    const out = await listQueuesForUid('alice');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('q-1');
    expect(out[0].nextPickUid).toBe('alice');
    expect(out[0].reactions['42_alice']).toBe('👍');
    // Query filter: array-contains participants = alice.
    expect(mocked(firestore.where)).toHaveBeenCalledWith(
      'participants',
      'array-contains',
      'alice',
    );
  });
});
