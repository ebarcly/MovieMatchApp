import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Function to add a title to the watchlist
export const addToWatchlist = async (userId, movieId) => {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      watchlist: arrayUnion(movieId)
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
      watched: arrayUnion(movieId)
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
