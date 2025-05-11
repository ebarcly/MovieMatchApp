import axios from 'axios';
import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig.extra.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: API_KEY,
    },
});

// Helper function to format movie or TV show response
const formatResponse = (results, genres) => {
    const genresMap = genres.reduce((acc, genre) => {
        acc[genre.id] = genre.name;
        return acc;
    }, {});

    return results.map((item) => {
        const genreNames = item.genre_ids.map(genreId => genresMap[genreId] || 'Unknown Genre');
        return {
            ...item,
            genre_names: genreNames,
            type: item.first_air_date ? 'tv' : 'movie', // IMPORTATN
            release_date: item.release_date || item.first_air_date,
        };
    });
};

// This function maps service names to their IDs
export const mapServiceNamesToIds = async (serviceNames) => {
    try {
        const allServices = await fetchStreamingServices(); // Fetch all services
        const serviceMap = allServices.reduce((map, service) => {
            map[service.provider_name] = service.provider_id;
            return map;
        }, {});

        return serviceNames.map(name => serviceMap[name]).filter(id => id);
    } catch (error) {
        console.error('Error mapping service names to IDs:', error);
        throw error;
    }
};

// Fetch trending content from TMDB
export const fetchTrendingContent = async (mediaType = 'all', timeWindow = 'day') => {
    try {
        const response = await tmdbApi.get(`/trending/${mediaType}/${timeWindow}`);
        return formatResponse(response.data.results, await fetchGenres());
    } catch (error) {
        console.error(`Error fetching trending content:`, error);
        throw error;
    }
};

// Fetch genres from TMDB
export const fetchGenres = async () => {
    try {
        const response = await tmdbApi.get('/genre/movie/list');
        return response.data.genres;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
};

// Fetch popular movies from TMDB
export const fetchPopularMovies = async (page = 1) => {
    try {
        const genres = await fetchGenres();
        const response = await tmdbApi.get('/movie/popular', { params: { page } });
        return formatResponse(response.data.results, genres);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        throw error;
    }
};

// Fetch popular TV shows from TMDB
export const fetchPopularTVShows = async (page = 1) => {
    try {
        const genres = await fetchGenres();
        const response = await tmdbApi.get('/tv/popular', { params: { page } });
        return formatResponse(response.data.results, genres);
    } catch (error) {
        console.error('Error fetching popular TV shows:', error);
        throw error;
    }
};

// Fetch movies by selected streaming services with a focus on popularity
export const fetchMoviesByServices = async (serviceIds, page = 1) => {
    try {
        if (!serviceIds || serviceIds.length === 0) {
            return fetchPopularMovies();
        }
        const genres = await fetchGenres();
        const response = await tmdbApi.get('/discover/movie', {
            params: {
                with_watch_providers: serviceIds.join('|'),
                watch_region: 'US',
                sort_by: 'popularity.desc', // Sorting by popularity
                page
            }
        });
        return formatResponse(response.data.results, genres);
    } catch (error) {
        console.error(`Error fetching movies for services ${serviceIds}:`, error);
        throw error;
    }
};

// Fetch TV shows by selected streaming services with a focus on new releases
export const fetchTVShowsByServices = async (serviceIds, page = 1) => {
    try {
        if (!serviceIds || serviceIds.length === 0) {
            return fetchPopularTVShows();
        }
        const genres = await fetchGenres();
        const response = await tmdbApi.get('/discover/tv', {
            params: {
                with_watch_providers: serviceIds.join('|'),
                watch_region: 'US',
                sort_by: 'first_air_date.desc', // Sorting by newest first
                'air_date.lte': new Date().toISOString().split('T')[0], // Only include shows that have aired
                page
            }
        });
        return formatResponse(response.data.results, genres);
    } catch (error) {
        console.error(`Error fetching TV shows for services ${serviceIds}:`, error);
        throw error;
    }
};

// Fetch movies by genre
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

// Fetch movie watch providers from TMDB
export const fetchMovieWatchProviders = async (movieId) => {
    try {
        const response = await tmdbApi.get(`/movie/${movieId}/watch/providers`);
        return response.data.results;
    } catch (error) {
        console.error(`Error fetching watch providers for movie ${movieId}:`, error);
        throw error;
    }
};

// Fetch show watch providers from TMDB
export const fetchShowWatchProviders = async (showId) => {
    try {
        const response = await tmdbApi.get(`/tv/${showId}/watch/providers`);
        return response.data.results;
    } catch (error) {
        console.error(`Error fetching watch providers for show ${showId}:`, error);
        throw error;
    }
};

// Fetch configuration data from TMDB
export const fetchConfiguration = async () => {
    try {
        const response = await tmdbApi.get('/configuration');
        return response.data;
    } catch (error) {
        console.error('Error fetching configuration:', error);
        throw error;
    }
};

// Fetch Available Streaming Services
export const fetchStreamingServices = async () => {
    try {
        const response = await tmdbApi.get('/watch/providers/tv?watch_region=US');
        const services = response.data.results;
        const filteredServices = services.filter(service => service.provider_id && service.logo_path); // Ensure service has an ID and logo

        // Sort services by popularity and take the top 25
        const topServices = filteredServices.sort((a, b) => b.popularity - a.popularity).slice(0, 25);

        // Update the logo URL for each streaming service
        return topServices.map(service => ({
            ...service,
            logo_url: `https://image.tmdb.org/t/p/w500${service.logo_path}`
        }));
    } catch (error) {
        console.error('Error fetching streaming services:', error);
        throw error;
    }
};

// Search movies
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

// Function to fetch certification for a movie or TV show
const fetchCertificationsById = async (id, type) => {
    try {
        const endpoint = type === 'tv' ? `/tv/${id}/content_ratings` : `/movie/${id}/release_dates`;
        const response = await tmdbApi.get(endpoint);
        let certification;

        if (type === 'tv') {
            const usRating = response.data.results.find(r => r.iso_3166_1 === 'US');
            certification = usRating ? usRating.rating : 'NR';
        } else {
            const usRelease = response.data.results.find(release => release.iso_3166_1 === 'US');
            certification = usRelease?.release_dates?.[0]?.certification || 'NR';
        }

        return certification;
    } catch (error) {
        console.error(`Error fetching certifications for ${type} ${id}:`, error);
        throw error;
    }
};

// Fetch details for a movie or TV show by ID from TMDB, including additional information like credits and watch providers
export const fetchDetailsById = async (id, type) => {
    try {
        const detailsResponse = await tmdbApi.get(`/${type}/${id}`, {
            params: { append_to_response: 'videos,credits' },
        });
        const providersResponse = await tmdbApi.get(`/${type}/${id}/watch/providers`);

        const providersData = providersResponse.data.results.US || {}; // Assuming US providers

        // Fetch certification
        const certification = await fetchCertificationsById(id, type);

        return {
            ...detailsResponse.data,
            providers: {
                flatrate: providersData.flatrate || [],
                rent: providersData.rent || [],
                buy: providersData.buy || [],
            },
            cast: detailsResponse.data.credits.cast.slice(0, 10), // Only take the top 10 cast members
            certification, // Include the fetched certification
        };
    } catch (error) {
        console.error(`Error fetching details for ${type} ${id}:`, error);
        throw error;
    }
};
