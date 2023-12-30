import React, { createContext, useReducer, useEffect } from 'react';
import { fetchConfiguration, fetchGenres, fetchDetailsById } from '../services/api'; // Import the API calls

const initialState = {
    movies: [],
    tvShows: [],
    favorites: [],
    likedMovies: [],  // Store liked movies
    dislikedMovies: [],  // Store disliked movies
    configData: {},
    genres: [],  // Store genres
    error: null  // To handle errors
};

export const MoviesContext = createContext(initialState);

const moviesReducer = (state, action) => {
    switch (action.type) {
        case 'SET_MOVIES':
            return { ...state, movies: action.payload };
        case 'ADD_TO_FAVORITES':
            return { ...state, favorites: [...state.favorites, action.payload] };
        case 'LIKE_MOVIE':
            return { ...state, likedMovies: [...state.likedMovies, action.payload] };
        case 'DISLIKE_MOVIE':
            return { ...state, dislikedMovies: [...state.dislikedMovies, action.payload] };
        case 'SET_CONFIG':
            return { ...state, configData: action.payload };
        case 'SET_GENRES':
            return { ...state, genres: action.payload };
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
