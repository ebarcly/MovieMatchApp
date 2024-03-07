import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Function to add a title to the watchlist
export const addToWatchlist = async (userId, movie) => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      watchlist: arrayUnion(movie), // movie should be an object with id and other relevant details
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
      return docSnap.data().friends || []; // Assuming 'friends' is an array of friend user IDs
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching friends list:', error);
    return [];
  }
};

// Function to create a match document
export const createMatchDocument = async (userIds, titleId) => {
  const matchRef = collection(db, 'matches');
  try {
    await addDoc(matchRef, {
      userIds: userIds,
      titleId: titleId,
      timestamp: serverTimestamp(), // Use Firebase server timestamp
      status: 'new',
    });
  } catch (error) {
    console.error('Error creating match document:', error);
  }
};
