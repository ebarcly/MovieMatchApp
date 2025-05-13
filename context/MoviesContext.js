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
  friends: [],
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
    case 'SET_FRIENDS_LIST':
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
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load configuration or genres.' });
      }
    };

    loadConfigAndGenres(); // load config/genres

    // --- 2. Set up the listener for authentication state ---
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in
        console.log('User is logged in:', user.uid);
        try {
          const watchlist = await fetchUserWatchlist(user.uid); // This seems to fetch from user doc field, not subcollection
          dispatch({ type: 'SET_WATCHLIST', payload: watchlist });
  
          const friendsList = await fetchFriendsList(user.uid);
          dispatch({ type: 'SET_FRIENDS_LIST', payload: friendsList });
  
          // Reset indices for a new session or fetch user-specific persisted indices
          dispatch({ type: 'UPDATE_LAST_MOVIE_INDEX', payload: 0 }); 
          dispatch({ type: 'UPDATE_LAST_TVSHOW_INDEX', payload: 0 });
  
        } catch (error) {
          console.error('Error fetching user data (watchlist/friends):', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data.' });
        }
      } else {
        // User is logged out
        console.log('User is logged out.')
        dispatch({ type: 'SET_WATCHLIST', payload: [] });
        dispatch({ type: 'SET_FRIENDS_LIST', payload: [] });
        // Reset indices on logout
        dispatch({ type: 'UPDATE_LAST_MOVIE_INDEX', payload: 0 });
        dispatch({ type: 'UPDATE_LAST_TVSHOW_INDEX', payload: 0 });
      }
    });

    // --- 5. Cleanup function ---
    return () => {
      console.log('Unsubscribing auth listener');
      unsubscribe();
    };
  }, []);

  return (
    <MoviesContext.Provider value={{ state, dispatch }}>
      {children}
    </MoviesContext.Provider>
  );
};

export default MoviesProvider;
