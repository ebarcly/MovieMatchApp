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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { fetchDetailsById } from '../services/api';

/// --- USER DATA MANAGEMENT --- ///

export const fetchInteractedTitleIds = async (userId) => {
  if (!userId) {
    console.log('No user ID provided to fetchInteractedTitleIds');
    return []; // Return an empty set or array
  }
  try {
    const interactionsRef = collection(db, 'users', userId, 'interactedTitles');
    const q = query(interactionsRef);
    const querySnapshot = await getDocs(q);
    const ids = new Set();
    querySnapshot.forEach((doc) => {
      ids.add(doc.data().id);
    });
    console.log(`User ${userId} has interacted with ${ids.size} titles.`);
    return Array.from(ids);
  } catch (error) {
    console.error(
      'Error fetching interacted title IDs for user:',
      userId,
      error
    );
    return [];
  }
};

export const recordTitleInteraction = async (
  userId,
  titleId,
  titleType,
  action
) => {
  if (!userId || !titleId || !titleType) {
    console.error('Invalid data for recordTitleInteraction:', {
      userId,
      titleId,
      titleType,
      action,
    });
    throw error;
  }
  try {
    const interactionRef = doc(
      db,
      'users',
      userId,
      'interactedTitles',
      String(titleId)
    ); // REVIEW TYPE CASTING!!!
    await setDoc(interactionRef, {
      id: titleId,
      type: titleType,
      action: action,
      interactedAt: serverTimestamp(),
    });
    console.log(
      `Interaction recorded for user ${userId}, title ${titleId} (${titleType}), action ${action}`
    );
  } catch (error) {
    console.error('Error recording title interaction:', error);
    // possibly need to handle this diff
  }
};

// Function to add a title to the watchlist
export const addToWatchlist = async (userId, movieItem) => {
  if (!userId || !movieItem || !movieItem.id) {
    console.error('Invalid data for addToWatchlist:', { userId, movieItem });
    throw error;
    // return [];
  }

  const watchlistItemRef = doc(
    db,
    'users',
    userId,
    'watchlist',
    String(movieItem.id)
  );
  try {
    await setDoc(watchlistItemRef, movieItem);
    console.log(
      `Movie ${movieItem.id} (${movieItem.type}) added/updated in watchlist subcollection for user ${userId}`
    );
  } catch (error) {
    console.error('Error adding to watchlist subcollection:', error);
  }
};

// Function to fetch the user's watchlist
export const fetchUserWatchlist = async (userId) => {
  const userRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().watchlist || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
};

// Function to add a title to the watched list
export const addToWatched = async (userId, movieId) => {
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
export const fetchUserWatched = async (userId) => {
  const userRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().watched || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching watched:', error);
    return [];
  }
};
// Function to fetch the user's friends list
export const fetchFriendsList = async (userId) => {
  const userRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().friends || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching friends list:', error);
    return [];
  }
};

/// --- MATCHING LOGIC --- ///

// New function to fetch matches for a user
export const fetchUserMatches = async (userId) => {
  if (!userId) {
    console.error('User ID is undefined, cannot fetch matches.');
    return [];
  }
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('userIds', 'array-contains', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const matchesPromises = querySnapshot.docs.map(async (matchDoc) => {
      const matchData = matchDoc.data();
      const otherUserId = matchData.userIds.find((uid) => uid !== userId);

      if (!otherUserId) {
        console.log('Could not find other user in match:', matchData);
        return null;
      }

      // Fetch friend's data
      const userDocRef = doc(db, 'users', otherUserId);
      const userDocSnap = await getDoc(userDocRef);
      const friendData = userDocSnap.exists() ? userDocSnap.data() : {};

      // Fetch title details
      const titleDetails = await fetchDetailsById(
        matchData.titleId,
        matchData.titleType
      );

      return {
        id: matchDoc.id,
        ...matchData,
        friend: {
          id: otherUserId,
          name: friendData.profileName || 'Unknown User',
          profileImage: friendData.profileImage || null,
        },
        title: {
          ...titleDetails,
        },
      };
    });

    const resolvedMatches = await Promise.all(matchesPromises);
    // Filter out any null results from promises that failed
    return resolvedMatches.filter((match) => match !== null);
  } catch (error) {
    console.error('Error fetching user matches:', error);
    throw error;
  }
};

// Function to create a match document
export const createMatchDocument = async (userIds, titleId, titleType) => {
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
    where('titleId', '==', titleId)
  );

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // a match already exists
      console.log(
        'MATCH_PREVENTION: Match already exists for users',
        sortedUserIds,
        'and title',
        titleId,
        '- Not creating duplicate.'
      );
      querySnapshot.forEach((doc) => {
        console.log('Existing match doc ID:', doc.id, 'Data:', doc.data());
      });
      return;
    }

    const dataToWrite = {
      userIds: userIds,
      titleId: titleId,
      titleType: titleType,
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
