import React, { createContext, useReducer, useEffect } from 'react';
import { fetchConfiguration, fetchGenres } from '../services/api';
import {
  fetchUserWatchlist,
  fetchFriendsList,
} from '../utils/firebaseOperations';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

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
          (movie) => movie.id === action.payload.id,
        )
          ? state.favorites
          : [...state.favorites, action.payload],
      };
    case 'DISLIKE_MOVIE':
      return {
        ...state,
        dislikedMovies: state.dislikedMovies.some(
          (movie) => movie.id === action.payload.id,
        )
          ? state.dislikedMovies
          : [...state.dislikedMovies, action.payload],
      };
    case 'ADD_TO_WATCHLIST':
      return {
        ...state,
        watchlist: state.watchlist.some(
          (movie) => movie.id === action.payload.id,
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
        (movie) => movie.id !== action.payload.id,
      );
      return { ...state, watchlist: updatedWatchlist };
    case 'REMOVE_FROM_FAVORITES':
      return {
        ...state,
        favorites: state.favorites.filter(
          (movie) => movie.id !== action.payload.id,
        ),
      };
    case 'REMOVE_FROM_WATCHED':
      return {
        ...state,
        watched: state.watched.filter(
          (movie) => movie.id !== action.payload.id,
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
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to load configuration or genres.',
        });
      }
    };

    loadConfigAndGenres();

    // --- 2. Gate user-specific fetches behind the /users/{uid} doc
    // actually existing. Sprint 2 BUG-7: onAuthStateChanged used to
    // fire user-doc fetches unconditionally, which raced the
    // /users/{uid} create during fresh register and dispatched empty
    // arrays before the doc existed. Now we subscribe with onSnapshot
    // and only dispatch once snapshot.exists() is true. This
    // simultaneously closes the Sprint 1 "profile-complete signal
    // gap" that motivated the AppNavigator onSnapshot.
    let userDocUnsubscribe = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Tear down any previous user's listener first — critical on
      // sign-out and on A -> B account switches.
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (!user) {
        console.log('User is logged out.');
        dispatch({ type: 'SET_WATCHLIST', payload: [] });
        dispatch({ type: 'SET_FRIENDS_LIST', payload: [] });
        dispatch({ type: 'UPDATE_LAST_MOVIE_INDEX', payload: 0 });
        dispatch({ type: 'UPDATE_LAST_TVSHOW_INDEX', payload: 0 });
        return;
      }

      console.log('User is logged in:', user.uid);
      const userDocRef = doc(db, 'users', user.uid);

      // onSnapshot fires once immediately with the current doc state
      // and then on every subsequent change. We only act once the
      // doc exists (it may not on the first snapshot during fresh
      // register, before RegisterScreen's setDoc lands).
      let hasLoadedSnapshot = false;
      userDocUnsubscribe = onSnapshot(
        userDocRef,
        async (snapshot) => {
          if (!snapshot.exists()) {
            // Fresh register: keep waiting. Don't dispatch [].
            return;
          }
          if (hasLoadedSnapshot) {
            // Subsequent change — re-sync friends from the doc field
            // so friend-accept flows reflect immediately. Watchlist is
            // a subcollection and has its own read path per screen.
            const data = snapshot.data();
            dispatch({
              type: 'SET_FRIENDS_LIST',
              payload: data.friends || [],
            });
            return;
          }
          hasLoadedSnapshot = true;

          try {
            const [watchlist, friendsList] = await Promise.all([
              fetchUserWatchlist(user.uid),
              fetchFriendsList(user.uid),
            ]);
            dispatch({ type: 'SET_WATCHLIST', payload: watchlist });
            dispatch({ type: 'SET_FRIENDS_LIST', payload: friendsList });
            dispatch({ type: 'UPDATE_LAST_MOVIE_INDEX', payload: 0 });
            dispatch({ type: 'UPDATE_LAST_TVSHOW_INDEX', payload: 0 });
          } catch (error) {
            console.error(
              'Error fetching user data (watchlist/friends):',
              error,
            );
            dispatch({
              type: 'SET_ERROR',
              payload: 'Failed to load user data.',
            });
          }
        },
        (error) => {
          console.error('MoviesContext user-doc snapshot error:', error);
        },
      );
    });

    // --- 3. Cleanup function ---
    return () => {
      console.log('Unsubscribing auth + user-doc listeners');
      if (userDocUnsubscribe) userDocUnsubscribe();
      unsubscribeAuth();
    };
  }, []);

  return (
    <MoviesContext.Provider value={{ state, dispatch }}>
      {children}
    </MoviesContext.Provider>
  );
};

export default MoviesProvider;
