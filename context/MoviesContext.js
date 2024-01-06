import React, { createContext, useReducer, useEffect } from 'react';
import { fetchConfiguration, fetchGenres, fetchDetailsById } from '../services/api'; // Import the API calls
import { fetchUserWatchlist } from '../utils/firebaseOperations';
import { auth} from '../firebaseConfig';


const initialState = {
    movies: [],
    tvShows: [],
    watchlist: [], // Array for the watchlist
    favorites: [], // Store liked movies (rename likedMovies to favorites if needed)
    dislikedMovies: [], // Store disliked movies
    watched: [], // Array for watched movies
    configData: {},
    genres: [],
    error: null
};

export const MoviesContext = createContext(initialState);

const moviesReducer = (state, action) => {
    switch (action.type) {
        case 'LIKE_MOVIE':
            // Add to favorites, prevent duplicates
            if (!state.favorites.some(movie => movie.id === action.payload.id)) {
                return { ...state, favorites: [...state.favorites, action.payload] };
            }
            return state;
        case 'DISLIKE_MOVIE':
            // Add to dislikedMovies, prevent duplicates
            if (!state.dislikedMovies.some(movie => movie.id === action.payload.id)) {
                return { ...state, dislikedMovies: [...state.dislikedMovies, action.payload] };
            }
            return state;
        case 'ADD_TO_WATCHLIST':
            // Add to watchlist, prevent duplicates
            if (!state.watchlist.some(movie => movie.id === action.payload.id)) {
                return { ...state, watchlist: [...state.watchlist, action.payload] };
            }
            return state;
        case 'MARK_AS_WATCHED':
            // Add to watched, prevent duplicates
            if (!state.watched.some(movie => movie.id === action.payload.id)) {
                return { ...state, watched: [...state.watched, action.payload] };
            }
            return state;
        case 'REMOVE_FROM_WATCHLIST':
            // Remove from watchlist
            return { ...state, watchlist: state.watchlist.filter(movie => movie.id !== action.payload.id) };
        case 'REMOVE_FROM_FAVORITES':
            // Remove from favorites
            return { ...state, favorites: state.favorites.filter(movie => movie.id !== action.payload.id) };
        case 'REMOVE_FROM_WATCHED':
            // Remove from watched
            return { ...state, watched: state.watched.filter(movie => movie.id !== action.payload.id) };
        case 'SET_CONFIG':
            return { ...state, configData: action.payload };
        case 'SET_GENRES':
            return { ...state, genres: action.payload };
        case 'SET_WATCHLIST':
            return { ...state, watchlist: action.payload };
        case 'SET_WATCHED':
            return { ...state, watched: action.payload };
        case 'SET_WATCHLIST_DETAILS':
            return { ...state, watchlist: action.payload };
        case 'SET_WATCHED_DETAILS':
            return { ...state, watched: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        default:
            return state;
    }
};

export const MoviesProvider = ({ children }) => {
    const [state, dispatch] = useReducer(moviesReducer, initialState);

    useEffect(() => {
        const loadData = async () => {
            try {
                const configData = await fetchConfiguration();
                dispatch({ type: 'SET_CONFIG', payload: configData });

                const genresArray = await fetchGenres();
                dispatch({ type: 'SET_GENRES', payload: genresArray });

                // Fetch the watchlist
                const watchlist = await fetchUserWatchlist(auth.currentUser.uid);
                dispatch({ type: 'SET_WATCHLIST', payload: watchlist });

            } catch (error) {
                console.error('Error fetching data:', error);
                dispatch({ type: 'SET_ERROR', payload: error.message });
            }
        };

        loadData();
    }, []);

    return (
        <MoviesContext.Provider value={{ state, dispatch }}>
            {children}
        </MoviesContext.Provider>
    );
};
