import React, { createContext, useReducer } from 'react';

const initialState = {
    movies: [],
    favorites: [],
    likedMovies: [],  // Store liked movies
    dislikedMovies: [],  // Store disliked movies
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
        default:
            return state;
    }
};

export const MoviesProvider = ({ children }) => {
    const [state, dispatch] = useReducer(moviesReducer, initialState);

    return (
        <MoviesContext.Provider value={{ state, dispatch }}>
            {children}
        </MoviesContext.Provider>
    );
};
