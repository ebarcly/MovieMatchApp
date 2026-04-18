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
): Promise<Array<number | string>> => {
  const userRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as { watched?: Array<number | string> };
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
