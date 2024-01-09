import React, { createContext, useReducer, useEffect } from 'react';
import { fetchConfiguration, fetchGenres } from '../services/api';
import { fetchUserWatchlist } from '../utils/firebaseOperations';
import { auth } from '../firebaseConfig';

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
};

export const MoviesContext = createContext(initialState);

const moviesReducer = (state, action) => {
    switch (action.type) {
        case 'LIKE_MOVIE':
            return { ...state, favorites: state.favorites.some(movie => movie.id === action.payload.id) ? state.favorites : [...state.favorites, action.payload] };
        case 'DISLIKE_MOVIE':
            return { ...state, dislikedMovies: state.dislikedMovies.some(movie => movie.id === action.payload.id) ? state.dislikedMovies : [...state.dislikedMovies, action.payload] };
        case 'ADD_TO_WATCHLIST':
            return { ...state, watchlist: state.watchlist.some(movie => movie.id === action.payload.id) ? state.watchlist : [...state.watchlist, action.payload] };
        case 'MARK_AS_WATCHED':
            return { ...state, watched: state.watched.some(movie => movie.id === action.payload.id) ? state.watched : [...state.watched, action.payload] };
        case 'REMOVE_FROM_WATCHLIST':
            return { ...state, watchlist: state.watchlist.filter(movie => movie.id !== action.payload.id) };
        case 'REMOVE_FROM_FAVORITES':
            return { ...state, favorites: state.favorites.filter(movie => movie.id !== action.payload.id) };
        case 'REMOVE_FROM_WATCHED':
            return { ...state, watched: state.watched.filter(movie => movie.id !== action.payload.id) };
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

export default MoviesProvider;
