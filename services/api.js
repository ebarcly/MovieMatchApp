import axios from 'axios';

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: API_KEY,
    },
});

export const fetchPopularMovies = async (page = 1) => {
    try {
        const response = await tmdbApi.get('/movie/popular', {
            params: { page },
        });
        return {
            results: response.data.results,
            totalResults: response.data.total_results,
            totalPages: response.data.total_pages,
        };
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        throw error;
    }
};

export const searchMovies = async (query) => {
    try {
        const response = await tmdbApi.get('/search/movie', {
            params: { query },
        });
        return response.data.results;
    } catch (error) {
        console.error('Error searching for movies:', error);
        throw error;
    }
};

export const fetchGenres = async () => {
    try {
        const response = await tmdbApi.get('/genre/movie/list');
        return response.data.genres;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
};

export const fetchMoviesByGenre = async (genreId) => {
    try {
        const response = await tmdbApi.get('/discover/movie', {
            params: { with_genres: genreId },
        });
        return response.data.results;
    } catch (error) {
        console.error(`Error fetching movies for genre ${genreId}:`, error);
        throw error;
    }
};

export default {
    fetchPopularMovies,
    searchMovies,
    fetchGenres,
    fetchMoviesByGenre,
};
