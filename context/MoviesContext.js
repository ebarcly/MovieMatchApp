import React, { createContext, useReducer, useEffect } from 'react';
import { fetchConfiguration } from '../services/api'; // Import the API call for configuration

const initialState = {
    movies: [],
    favorites: [],
    likedMovies: [],  // Store liked movies
    dislikedMovies: [],  // Store disliked movies
    configData: {}
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
        default:
            return state;
    }
};

export const MoviesProvider = ({ children }) => {
    const [state, dispatch] = useReducer(moviesReducer, initialState);

    useEffect(() => {
        // Fetch configuration on initial load
        const loadConfig = async () => {
            try {
                const configData = await fetchConfiguration();
                console.log('Config Data:', configData); // Debug line to verify config data
                dispatch({ type: 'SET_CONFIG', payload: configData });
            } catch (error) {
                console.error('Error fetching config data:', error);
            }
        };

        loadConfig();
    }, []);

    return (
        <MoviesContext.Provider value={{ state, dispatch }}>
            {children}
        </MoviesContext.Provider>
    );
};
