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
import { db } from '../firebaseConfig';
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
    await updateDoc(ref, { status: 'blocked', initiatedBy: fromUid });
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
