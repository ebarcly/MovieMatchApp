import React, { createContext, useReducer, useEffect } from 'react';
import { fetchConfiguration, fetchGenres } from '../services/api';
import {
  fetchUserWatchlist,
  fetchFriendsList,
} from '../utils/firebaseOperations';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const initialState = {
  movies: [],
  tvShows: [],
  watchlist: [],
  favorites: [],
  dislikedMovies: [],
  watched: [],
  lastMovieIndex: 0,
  lastTVShowIndex: 0,
  configData: {},
  genres: [],
  error: null,
  friends: [], // Add this line
};

export const MoviesContext = createContext(initialState);

const moviesReducer = (state, action) => {
  switch (action.type) {
    case 'LIKE_MOVIE':
      return {
        ...state,
        favorites: state.favorites.some(
          (movie) => movie.id === action.payload.id
        )
          ? state.favorites
          : [...state.favorites, action.payload],
      };
    case 'DISLIKE_MOVIE':
      return {
        ...state,
        dislikedMovies: state.dislikedMovies.some(
          (movie) => movie.id === action.payload.id
        )
          ? state.dislikedMovies
          : [...state.dislikedMovies, action.payload],
      };
    case 'ADD_TO_WATCHLIST':
      return {
        ...state,
        watchlist: state.watchlist.some(
          (movie) => movie.id === action.payload.id
        )
          ? state.watchlist
          : [...state.watchlist, action.payload],
      };
    case 'MARK_AS_WATCHED':
      return {
        ...state,
        watched: state.watched.some((movie) => movie.id === action.payload.id)
          ? state.watched
          : [...state.watched, action.payload],
      };
    case 'REMOVE_FROM_WATCHLIST':
      const updatedWatchlist = state.watchlist.filter(
        (movie) => movie.id !== action.payload.id
      );
      return { ...state, watchlist: updatedWatchlist };
    case 'REMOVE_FROM_FAVORITES':
      return {
        ...state,
        favorites: state.favorites.filter(
          (movie) => movie.id !== action.payload.id
        ),
      };
    case 'REMOVE_FROM_WATCHED':
      return {
        ...state,
        watched: state.watched.filter(
          (movie) => movie.id !== action.payload.id
        ),
      };
    case 'UPDATE_LAST_MOVIE_INDEX':
      return { ...state, lastMovieIndex: action.payload };
    case 'UPDATE_LAST_TVSHOW_INDEX':
      return { ...state, lastTVShowIndex: action.payload };
    case 'SET_CONFIG':
      return { ...state, configData: action.payload };
    case 'SET_GENRES':
      return { ...state, genres: action.payload };
    case 'SET_WATCHLIST':
      return { ...state, watchlist: action.payload };
    case 'SET_WATCHLIST_DETAILS':
      return { ...state, watchlist: action.payload };
    case 'SET_WATCHED':
      return { ...state, watched: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FRIENDS_LIST': // Add this case
      return { ...state, friends: action.payload };
    default:
      return state;
  }
};

export const MoviesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(moviesReducer, initialState);

  useEffect(() => {
    // --- 1. Fetch non-user-specific data immediately ---
    const loadConfigAndGenres = async () => {
      try {
        const configData = await fetchConfiguration();
        dispatch({ type: 'SET_CONFIG', payload: configData });

        const genresArray = await fetchGenres();
        dispatch({ type: 'SET_GENRES', payload: genresArray });
      } catch (error) {
        console.error('Error fetching config/genres:', error);
        // Optionally dispatch an error specific to config/genres
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load configuration or genres.' });
      }
    };

    loadConfigAndGenres(); // Call the function to load config/genres

    // --- 2. Set up the listener for authentication state ---
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // --- 3. User is logged in, NOW fetch user-specific data ---
        try {
          console.log('User is logged in:', user.uid); // Good for debugging

          // Fetch watchlist using the user object from the listener
          const watchlist = await fetchUserWatchlist(user.uid);
          dispatch({ type: 'SET_WATCHLIST', payload: watchlist });

          // Fetch friends list using the user object from the listener
          const friendsList = await fetchFriendsList(user.uid);
          dispatch({ type: 'SET_FRIENDS_LIST', payload: friendsList });

          // Clear any previous general errors if data loading succeeds
          // dispatch({ type: 'SET_ERROR', payload: null }); // Optional: clear error on success

        } catch (error) {
          console.error('Error fetching user data (watchlist/friends):', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data.' });
        }
      } else {
        // --- 4. User is logged out ---
        console.log('User is logged out.');
        // Clear user-specific data from the state
        dispatch({ type: 'SET_WATCHLIST', payload: [] });
        dispatch({ type: 'SET_FRIENDS_LIST', payload: [] });
        // Potentially clear other user-specific state like favorites, watched etc.
        // dispatch({ type: 'SET_FAVORITES', payload: [] }); // Example if you add favorites loading
        // dispatch({ type: 'SET_WATCHED', payload: [] });
        // Clear any previous errors
        // dispatch({ type: 'SET_ERROR', payload: null }); // Optional: clear error on logout
      }
    });

    // --- 5. Cleanup function ---
    // Return the unsubscribe function to remove the listener when the component unmounts
    return () => {
      console.log('Unsubscribing auth listener');
      unsubscribe();
    }

  }, []); // Empty dependency array means this effect runs once on mount to set up the listener

  return (
    <MoviesContext.Provider value={{ state, dispatch }}>
      {children}
    </MoviesContext.Provider>
  );
};

export default MoviesProvider;
