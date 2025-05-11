import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';


/// --- USER DATA MANAGEMENT --- ///

// Function to add a title to the watchlist
export const addToWatchlist = async (userId, movie) => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      watchlist: arrayUnion(movie),
    });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
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
    console.error("User ID is undefined, cannot fetch matches.");
    throw error;
    // return [];
  }
  try {
    const matchesRef = collection(db, 'matches');
    // Create a query to find matches where the user's ID is in the 'userIds' array
    // and order them by timestamp in descending order (newest first)
    const q = query(
      matchesRef,
      where('userIds', 'array-contains', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const matches = [];
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() });
    });
    return matches;
  } catch (error) {
    console.error("Error fetching user matches:", error);
    throw error; 
    // return [];
  }
};

// Function to create a match document
export const createMatchDocument = async (userIds, titleId, titleType) => {
  const matchRef = collection(db, 'matches');
  try {
    await addDoc(matchRef, {
      userIds: userIds,
      titleId: titleId,
      titleType: titleType,
      timestamp: serverTimestamp(),
      status: 'new',
    });
  } catch (error) {
    console.error('Error creating match document:', error);
  }
};
