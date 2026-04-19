import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { fetchDetailsById } from '../services/api';
import type { TitleDetails } from '../services/api';

/// --- Types ------------------------------------------------------------

export type TitleType = 'movie' | 'tv';
export type InteractionAction =
  | 'liked'
  | 'disliked_or_skipped'
  | 'watched'
  | 'unwatched';

export interface WatchlistItem {
  id: number;
  type: TitleType;
  title?: string;
  name?: string;
  poster_path?: string | null;
  [key: string]: unknown;
}

export interface MatchFriend {
  id: string;
  name: string;
  profileImage: string | null;
}

export interface UserMatch {
  id: string;
  userIds: string[];
  titleId: number;
  titleType: TitleType;
  timestamp: unknown;
  status: string;
  friend: MatchFriend;
  title: Partial<TitleDetails>;
}

// Sprint 4: onboarding taste quiz writes this shape to the user doc.
export type TasteAxis =
  | 'pacing'
  | 'era'
  | 'mood'
  | 'stakes'
  | 'tone'
  | 'genreFluency'
  | 'realism'
  | 'runtime';

export interface TasteLabels {
  /** Tribal-belonging label. */
  common: string;
  /** Optimal-distinctiveness label. */
  rare: string;
}

export interface TasteProfile {
  axes: Record<TasteAxis, number>;
  labels: TasteLabels;
}

// What we actually write to Firestore (serverTimestamp is a sentinel).
export interface TasteProfileDoc extends TasteProfile {
  completedAt: unknown;
}

/// --- USER DATA MANAGEMENT --- ///

export const fetchInteractedTitleIds = async (
  userId: string | null | undefined,
): Promise<number[]> => {
  if (!userId) {
    console.log('No user ID provided to fetchInteractedTitleIds');
    return [];
  }
  try {
    const interactionsRef = collection(db, 'users', userId, 'interactedTitles');
    const q = query(interactionsRef);
    const querySnapshot = await getDocs(q);
    const ids = new Set<number>();
    querySnapshot.forEach((d) => {
      const data = d.data() as { id?: number };
      if (typeof data.id === 'number') {
        ids.add(data.id);
      }
    });
    console.log(`User ${userId} has interacted with ${ids.size} titles.`);
    return Array.from(ids);
  } catch (error) {
    console.error(
      'Error fetching interacted title IDs for user:',
      userId,
      error,
    );
    return [];
  }
};

export const recordTitleInteraction = async (
  userId: string,
  titleId: number | string,
  titleType: TitleType,
  action: InteractionAction,
): Promise<void> => {
  if (!userId || !titleId || !titleType) {
    throw new Error(
      `Invalid data for recordTitleInteraction: userId=${userId} titleId=${titleId} titleType=${titleType} action=${action}`,
    );
  }
  try {
    const interactionRef = doc(
      db,
      'users',
      userId,
      'interactedTitles',
      String(titleId),
    );
    await setDoc(interactionRef, {
      id: titleId,
      type: titleType,
      action,
      interactedAt: serverTimestamp(),
    });
    console.log(
      `Interaction recorded for user ${userId}, title ${titleId} (${titleType}), action ${action}`,
    );
  } catch (error) {
    console.error('Error recording title interaction:', error);
  }
};

// Sprint 4: onboarding taste quiz persistence. Writes the 8-axis
// tasteProfile + dual identity labels + serverTimestamp-fed completedAt
// into the nested `tasteProfile` field on /users/{uid}. Merge-safe so a
// re-entry doesn't wipe other profile fields.
export const writeTasteProfile = async (
  userId: string,
  profile: TasteProfile,
): Promise<void> => {
  if (!userId) {
    throw new Error('Invalid data for writeTasteProfile: empty userId');
  }
  if (!profile?.axes || !profile?.labels) {
    throw new Error(
      'Invalid data for writeTasteProfile: axes or labels missing',
    );
  }
  try {
    const userRef = doc(db, 'users', userId);
    const docPayload: TasteProfileDoc = {
      ...profile,
      completedAt: serverTimestamp(),
    };
    await setDoc(userRef, { tasteProfile: docPayload }, { merge: true });
  } catch (error) {
    console.error('Error writing tasteProfile:', error);
    throw error;
  }
};

export const fetchTasteProfile = async (
  userId: string | null | undefined,
): Promise<TasteProfile | null> => {
  if (!userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data() as { tasteProfile?: TasteProfile } | undefined;
    return data?.tasteProfile ?? null;
  } catch (error) {
    console.error('Error fetching tasteProfile:', error);
    return null;
  }
};

// Function to add a title to the watchlist
export const addToWatchlist = async (
  userId: string,
  movieItem: WatchlistItem,
): Promise<void> => {
  if (!userId || !movieItem || !movieItem.id) {
    throw new Error(
      `Invalid data for addToWatchlist: userId=${userId} movieItemId=${movieItem?.id}`,
    );
  }

  const watchlistItemRef = doc(
    db,
    'users',
    userId,
    'watchlist',
    String(movieItem.id),
  );
  try {
    await setDoc(watchlistItemRef, movieItem);
    console.log(
      `Movie ${movieItem.id} (${movieItem.type}) added/updated in watchlist subcollection for user ${userId}`,
    );
  } catch (error) {
    console.error('Error adding to watchlist subcollection:', error);
  }
};

// Function to fetch the user's watchlist.
// Sprint 2 BUG-4: watchlist subcollection is the source of truth.
// addToWatchlist writes to /users/{uid}/watchlist/{titleId}; the old
// reader dereffed a `watchlist` field on the parent user doc, which
// never contained anything after the subcollection switch (split-brain).
// Now reads from the subcollection so MoviesContext + MyCave see what
// SwipeableCard actually wrote.
export const fetchUserWatchlist = async (
  userId: string | null | undefined,
): Promise<WatchlistItem[]> => {
  if (!userId) {
    return [];
  }
  try {
    const watchlistRef = collection(db, 'users', userId, 'watchlist');
    const querySnapshot = await getDocs(watchlistRef);
    return querySnapshot.docs.map((d) => d.data() as WatchlistItem);
  } catch (error) {
    console.error('Error fetching watchlist subcollection:', error);
    return [];
  }
};

// Function to add a title to the watched list
export const addToWatched = async (
  userId: string,
  movieId: number | string,
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      watched: arrayUnion(movieId),
    });
  } catch (error) {
    console.error('Error adding to watched:', error);
  }
};

// Function to fetch the user's watched list
export const fetchUserWatched = async (
  userId: string,
): Promise<(number | string)[]> => {
  const userRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as { watched?: (number | string)[] };
      return data.watched || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching watched:', error);
    return [];
  }
};

// Function to fetch the user's friends list
export const fetchFriendsList = async (userId: string): Promise<string[]> => {
  const userRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as { friends?: string[] };
      return data.friends || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching friends list:', error);
    return [];
  }
};

/// --- MATCHING LOGIC --- ///

// New function to fetch matches for a user
export const fetchUserMatches = async (
  userId: string | null | undefined,
): Promise<UserMatch[]> => {
  if (!userId) {
    console.error('User ID is undefined, cannot fetch matches.');
    return [];
  }
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('userIds', 'array-contains', userId),
      orderBy('timestamp', 'desc'),
    );

    const querySnapshot = await getDocs(q);
    const matchesPromises = querySnapshot.docs.map(async (matchDoc) => {
      const matchData = matchDoc.data() as {
        userIds: string[];
        titleId: number;
        titleType: TitleType;
        timestamp: unknown;
        status: string;
      };
      const otherUserId = matchData.userIds.find((uid) => uid !== userId);

      if (!otherUserId) {
        console.log('Could not find other user in match:', matchData);
        return null;
      }

      // Fetch friend's data
      const userDocRef = doc(db, 'users', otherUserId);
      const userDocSnap = await getDoc(userDocRef);
      const friendData = userDocSnap.exists()
        ? (userDocSnap.data() as {
            profileName?: string;
            profileImage?: string | null;
          })
        : {};

      // Fetch title details
      const titleDetails = await fetchDetailsById(
        matchData.titleId,
        matchData.titleType,
      );

      const match: UserMatch = {
        id: matchDoc.id,
        userIds: matchData.userIds,
        titleId: matchData.titleId,
        titleType: matchData.titleType,
        timestamp: matchData.timestamp,
        status: matchData.status,
        friend: {
          id: otherUserId,
          name: friendData.profileName || 'Unknown User',
          profileImage: friendData.profileImage ?? null,
        },
        title: { ...titleDetails },
      };
      return match;
    });

    const resolvedMatches = await Promise.all(matchesPromises);
    return resolvedMatches.filter(
      (match): match is UserMatch => match !== null,
    );
  } catch (error) {
    console.error('Error fetching user matches:', error);
    throw error;
  }
};

// Function to create a match document
export const createMatchDocument = async (
  userIds: string[],
  titleId: number | string,
  titleType: TitleType,
): Promise<void> => {
  console.log('CREATE_MATCH_DOCUMENT: Called with (initial params):', {
    userIds,
    titleId,
    titleType,
  });
  const matchRef = collection(db, 'matches');
  const sortedUserIds = [...userIds].sort();

  // Query to check for an existing match with the same two users and same title
  const q = query(
    matchRef,
    where('userIds', '==', sortedUserIds),
    where('titleId', '==', titleId),
  );

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.log(
        'MATCH_PREVENTION: Match already exists for users',
        sortedUserIds,
        'and title',
        titleId,
        '- Not creating duplicate.',
      );
      querySnapshot.forEach((d) => {
        console.log('Existing match doc ID:', d.id, 'Data:', d.data());
      });
      return;
    }

    const dataToWrite = {
      userIds,
      titleId,
      titleType,
      timestamp: serverTimestamp(),
      status: 'new',
    };
    console.log('CREATE_MATCH_DOCUMENT: Data being written:', dataToWrite);
    const docRef = await addDoc(matchRef, dataToWrite);
    console.log('CREATE_MATCH_DOCUMENT: Success! Doc ID:', docRef.id);
  } catch (error) {
    console.error('CREATE_MATCH_DOCUMENT: Error:', error);
  }
};

/// --- FRIEND GRAPH (Sprint 5a) ---------------------------------------

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendshipDoc {
  id: string;
  participants: [string, string];
  status: FriendshipStatus;
  initiatedBy: string;
  createdAt: unknown;
  acceptedAt?: unknown;
}

/**
 * Deterministic friendship document ID: `${min(uidA,uidB)}_${max(uidA,uidB)}`.
 *
 * Using the lexicographic pair as the document ID enforces uniqueness at
 * the Firestore layer (one friendship per pair, regardless of who
 * initiated) — no extra query needed to dedupe. `friendshipId('a','b')`
 * and `friendshipId('b','a')` return the same string.
 */
export function friendshipId(uidA: string, uidB: string): string {
  if (!uidA || !uidB) {
    throw new Error('friendshipId: empty uid');
  }
  if (uidA === uidB) {
    throw new Error('friendshipId: cannot befriend yourself');
  }
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

/**
 * Send a friend request from the currently signed-in user (`fromUid`)
 * to another user (`toUid`). Creates a `pending` friendship document
 * at `/friendships/{friendshipId}` with `initiatedBy = fromUid`.
 *
 * If a document already exists at that ID (e.g. the other user already
 * sent a request), the call is a no-op and returns the existing doc —
 * the UI layer decides whether to auto-accept or prompt.
 */
export async function sendFriendRequest(
  fromUid: string,
  toUid: string,
): Promise<FriendshipDoc> {
  const id = friendshipId(fromUid, toUid);
  const ref = doc(db, 'friendships', id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data() as Omit<FriendshipDoc, 'id'>;
    return { id, ...data };
  }
  const participants: [string, string] =
    fromUid < toUid ? [fromUid, toUid] : [toUid, fromUid];
  const payload = {
    participants,
    status: 'pending' as const,
    initiatedBy: fromUid,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return { id, ...payload };
}

/**
 * Accept a pending friend request by transitioning its status from
 * 'pending' → 'accepted' and stamping acceptedAt. Idempotent — calling
 * accept on an already-accepted friendship is safe (rules allow it).
 *
 * Sprint 4 rule: the caller is responsible for rolling back optimistic
 * local state if this write rejects (inline banner; no modal).
 */
export async function acceptFriendRequest(
  friendshipDocId: string,
): Promise<void> {
  if (!friendshipDocId) {
    throw new Error('acceptFriendRequest: empty friendshipId');
  }
  const ref = doc(db, 'friendships', friendshipDocId);
  await updateDoc(ref, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  });
}

/**
 * Decline a pending friend request by deleting the document. The
 * requester will see a fresh "send request" CTA; no permanent block.
 * For blocking, use `blockUser` instead.
 */
export async function declineFriendRequest(
  friendshipDocId: string,
): Promise<void> {
  if (!friendshipDocId) {
    throw new Error('declineFriendRequest: empty friendshipId');
  }
  const ref = doc(db, 'friendships', friendshipDocId);
  await deleteDoc(ref);
}

/**
 * Block a user. Creates or transitions the friendship to status='blocked',
 * with initiatedBy = the blocking user. Once blocked, neither user can
 * send a new request to the other until the blocking user lifts it.
 */
export async function blockUser(fromUid: string, toUid: string): Promise<void> {
  const id = friendshipId(fromUid, toUid);
  const ref = doc(db, 'friendships', id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    // initiatedBy is immutable per firestore.rules; only transition status.
    await updateDoc(ref, { status: 'blocked' });
    return;
  }
  const participants: [string, string] =
    fromUid < toUid ? [fromUid, toUid] : [toUid, fromUid];
  await setDoc(ref, {
    participants,
    status: 'blocked' as const,
    initiatedBy: fromUid,
    createdAt: serverTimestamp(),
  });
}

/**
 * List the signed-in user's accepted friends. Returns FriendshipDoc
 * records where status='accepted' and `participants` contains `uid`.
 */
export async function listFriends(uid: string): Promise<FriendshipDoc[]> {
  if (!uid) return [];
  const ref = collection(db, 'friendships');
  const q = query(
    ref,
    where('participants', 'array-contains', uid),
    where('status', '==', 'accepted'),
  );
  const snap = await getDocs(q);
  const out: FriendshipDoc[] = [];
  snap.forEach((d) => {
    const data = d.data() as Omit<FriendshipDoc, 'id'>;
    out.push({ id: d.id, ...data });
  });
  return out;
}

/**
 * List pending friend requests for a user, in a specific direction:
 *   - 'incoming': requests where someone else initiated and this user
 *     needs to accept/decline.
 *   - 'outgoing': requests this user sent that are still pending.
 */
export async function listPendingRequests(
  uid: string,
  direction: 'incoming' | 'outgoing',
): Promise<FriendshipDoc[]> {
  if (!uid) return [];
  const ref = collection(db, 'friendships');
  const q = query(
    ref,
    where('participants', 'array-contains', uid),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  const out: FriendshipDoc[] = [];
  snap.forEach((d) => {
    const data = d.data() as Omit<FriendshipDoc, 'id'>;
    if (direction === 'incoming' && data.initiatedBy !== uid) {
      out.push({ id: d.id, ...data });
    } else if (direction === 'outgoing' && data.initiatedBy === uid) {
      out.push({ id: d.id, ...data });
    }
  });
  return out;
}

// --- Stream D: queues ------------------------------------------------
//
// Sprint 5b Stream D — shared watch queues. 2-5 participants co-author
// an ordered list of title ids with 1-tap reactions and a round-robin
// "your turn to pick" rotation. Activity writes live in a subcollection
// at /queues/{queueId}/activity and are optional (best-effort logging —
// a failed activity write never blocks the primary op).
//
// The rule file at firestore.rules enforces participant-only reads/writes
// and the `nextPickUid == auth.uid` gate on markTitleWatched. The op
// layer enforces the same invariants client-side so a misuse surfaces as
// a clear thrown error, not a cryptic PERMISSION_DENIED.

/** The 4 allowed one-tap reactions per (title, user). */
export type QueueReaction = '👍' | '🔥' | '😴' | '⏭️';

const ALLOWED_QUEUE_REACTIONS: readonly QueueReaction[] = [
  '👍',
  '🔥',
  '😴',
  '⏭️',
];

/** Verb tags used in /queues/{queueId}/activity. */
export type QueueActivityVerb =
  | 'created'
  | 'addedTitle'
  | 'reacted'
  | 'markedWatched';

export interface QueueDoc {
  id: string;
  participants: string[];
  orderedTitleIds: number[];
  reactions: Record<string, QueueReaction>;
  nextPickUid: string;
  createdAt: unknown;
  name?: string;
}

export interface QueueActivityDoc {
  id: string;
  actor: string;
  verb: QueueActivityVerb;
  titleId?: number;
  at: unknown;
}

/** Composite reaction-map key: `${titleId}_${uid}`. Exported for tests. */
export function queueReactionKey(titleId: number, uid: string): string {
  if (!uid) {
    throw new Error('queueReactionKey: empty uid');
  }
  if (!Number.isFinite(titleId)) {
    throw new Error('queueReactionKey: non-finite titleId');
  }
  return `${titleId}_${uid}`;
}

function sortParticipants(participants: readonly string[]): string[] {
  // Lexicographic sort — matches the /friendships deterministic-pair
  // convention. Stable across locales because all uids are ASCII.
  return [...participants].sort();
}

function assertValidParticipantRange(participants: readonly string[]): void {
  if (!Array.isArray(participants)) {
    throw new Error('createQueue: participants must be an array');
  }
  if (participants.length < 2 || participants.length > 5) {
    throw new Error(
      `createQueue: participants range 2-5 (got ${participants.length})`,
    );
  }
  const uniq = new Set(participants);
  if (uniq.size !== participants.length) {
    throw new Error('createQueue: duplicate participant uids');
  }
  for (const uid of participants) {
    if (!uid || typeof uid !== 'string') {
      throw new Error('createQueue: empty/non-string participant uid');
    }
  }
}

/**
 * Rotate `nextPickUid` to the participant after `currentPicker` in the
 * lex-sorted participants list. If `currentPicker` is not in the list
 * (shouldn't happen — rules reject it), return the first participant as
 * a safe fallback.
 */
export function nextPickerAfter(
  participants: readonly string[],
  currentPicker: string,
): string {
  if (participants.length === 0) {
    throw new Error('nextPickerAfter: empty participants');
  }
  const idx = participants.indexOf(currentPicker);
  if (idx === -1) {
    return participants[0];
  }
  return participants[(idx + 1) % participants.length];
}

/**
 * Create a new queue with 2-5 participants. The creator (first
 * participant after lex-sort, which is unconditionally set as the
 * initial `nextPickUid`) need not be one of the participants at the
 * op-layer check — the rule enforces that. Returns the new queueId +
 * the normalized participants list.
 *
 * Auto-ID (not deterministic) — two friend groups with identical
 * participants can have multiple queues.
 */
export async function createQueue(
  participants: readonly string[],
  name?: string,
): Promise<QueueDoc> {
  assertValidParticipantRange(participants);
  const sorted = sortParticipants(participants);
  const payload: Omit<QueueDoc, 'id'> & { name?: string } = {
    participants: sorted,
    orderedTitleIds: [],
    reactions: {},
    // Round-robin starts with the first participant in lex order; the
    // very first `markTitleWatched` call will rotate to the second.
    nextPickUid: sorted[0],
    createdAt: serverTimestamp(),
  };
  if (name !== undefined) {
    payload.name = name;
  }
  const ref = await addDoc(collection(db, 'queues'), payload);
  // Best-effort activity log — never fails the primary create path.
  try {
    await addDoc(collection(db, 'queues', ref.id, 'activity'), {
      actor: sorted[0],
      verb: 'created' satisfies QueueActivityVerb,
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('createQueue: activity log failed (non-fatal):', err);
  }
  return { id: ref.id, ...payload };
}

/**
 * Append a titleId to the queue's orderedTitleIds. Idempotent — if the
 * same titleId is already in the queue, this is a no-op (no extra write,
 * no activity row, no thrown error).
 *
 * The rule layer allows any participant to add. The auth uid is read
 * off `auth.currentUser` for the activity log actor.
 */
export async function addTitleToQueue(
  queueId: string,
  titleId: number,
): Promise<void> {
  if (!queueId) {
    throw new Error('addTitleToQueue: empty queueId');
  }
  if (!Number.isFinite(titleId)) {
    throw new Error('addTitleToQueue: non-finite titleId');
  }
  const ref = doc(db, 'queues', queueId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`addTitleToQueue: queue ${queueId} not found`);
  }
  const data = snap.data() as Omit<QueueDoc, 'id'>;
  if (data.orderedTitleIds.includes(titleId)) {
    // Idempotent — same title twice is a no-op.
    return;
  }
  await updateDoc(ref, {
    orderedTitleIds: [...data.orderedTitleIds, titleId],
  });
  // Best-effort activity log.
  try {
    const actor = auth.currentUser?.uid ?? 'unknown';
    await addDoc(collection(db, 'queues', queueId, 'activity'), {
      actor,
      verb: 'addedTitle' satisfies QueueActivityVerb,
      titleId,
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('addTitleToQueue: activity log failed (non-fatal):', err);
  }
}

/**
 * Upsert a reaction for (titleId, uid) in the queue's reactions map.
 * If the user already reacted to this title, the new reaction replaces
 * the old one (same `${titleId}_${uid}` key). Any of the 4 allowed
 * emoji are accepted.
 */
export async function reactToQueueTitle(
  queueId: string,
  titleId: number,
  reaction: QueueReaction,
): Promise<void> {
  if (!queueId) {
    throw new Error('reactToQueueTitle: empty queueId');
  }
  if (!Number.isFinite(titleId)) {
    throw new Error('reactToQueueTitle: non-finite titleId');
  }
  if (!ALLOWED_QUEUE_REACTIONS.includes(reaction)) {
    throw new Error(`reactToQueueTitle: invalid reaction "${reaction}"`);
  }
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('reactToQueueTitle: not signed in');
  }
  const ref = doc(db, 'queues', queueId);
  const key = queueReactionKey(titleId, uid);
  await updateDoc(ref, {
    [`reactions.${key}`]: reaction,
  });
  try {
    await addDoc(collection(db, 'queues', queueId, 'activity'), {
      actor: uid,
      verb: 'reacted' satisfies QueueActivityVerb,
      titleId,
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('reactToQueueTitle: activity log failed (non-fatal):', err);
  }
}

/**
 * Mark the given title as watched by the current `nextPickUid` (the
 * rule layer enforces this). Advances `nextPickUid` round-robin to the
 * next participant in lex order. The watched title stays in
 * orderedTitleIds (so the queue is an ordered history).
 *
 * Throws a clear error client-side if the caller is not currently the
 * picker, so a Firestore PERMISSION_DENIED is never surfaced as an
 * ambiguous "something went wrong."
 */
export async function markTitleWatched(
  queueId: string,
  titleId: number,
): Promise<void> {
  if (!queueId) {
    throw new Error('markTitleWatched: empty queueId');
  }
  if (!Number.isFinite(titleId)) {
    throw new Error('markTitleWatched: non-finite titleId');
  }
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('markTitleWatched: not signed in');
  }
  const ref = doc(db, 'queues', queueId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`markTitleWatched: queue ${queueId} not found`);
  }
  const data = snap.data() as Omit<QueueDoc, 'id'>;
  if (data.nextPickUid !== uid) {
    throw new Error(
      `markTitleWatched: caller ${uid} is not the current picker ${data.nextPickUid}`,
    );
  }
  const nextPickUid = nextPickerAfter(data.participants, uid);
  await updateDoc(ref, { nextPickUid });
  try {
    await addDoc(collection(db, 'queues', queueId, 'activity'), {
      actor: uid,
      verb: 'markedWatched' satisfies QueueActivityVerb,
      titleId,
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('markTitleWatched: activity log failed (non-fatal):', err);
  }
}

/**
 * List queues the user participates in. Query uses
 * `array-contains auth.uid` which satisfies both get + list per the
 * participant-gated rule.
 */
export async function listQueuesForUid(uid: string): Promise<QueueDoc[]> {
  if (!uid) return [];
  const ref = collection(db, 'queues');
  const q = query(ref, where('participants', 'array-contains', uid));
  const snap = await getDocs(q);
  const out: QueueDoc[] = [];
  snap.forEach((d) => {
    const data = d.data() as Omit<QueueDoc, 'id'>;
    out.push({ id: d.id, ...data });
  });
  return out;
}
