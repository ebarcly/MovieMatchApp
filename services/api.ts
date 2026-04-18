import axios from 'axios';
import Constants from 'expo-constants';

const API_KEY: string | undefined = Constants.expoConfig?.extra?.tmdbApiKey as
  | string
  | undefined;
const BASE_URL = 'https://api.themoviedb.org/3';

if (!API_KEY) {
  console.warn(
    '[services/api] TMDB API key missing. Set EXPO_PUBLIC_TMDB_API_KEY in .env.',
  );
}

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

// --- Types ------------------------------------------------------------

export type MediaType = 'movie' | 'tv';
export type TrendingMediaType = 'all' | 'movie' | 'tv' | 'person';
export type TimeWindow = 'day' | 'week';

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbRawMedia {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  first_air_date?: string;
  release_date?: string;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbMedia extends TmdbRawMedia {
  genre_names: string[];
  type: MediaType;
  release_date: string | undefined;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  logo_url?: string;
  popularity?: number;
}

export interface TmdbWatchProviders {
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string | null;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TitleDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  genres?: TmdbGenre[];
  providers: {
    flatrate: TmdbProvider[];
    rent: TmdbProvider[];
    buy: TmdbProvider[];
  };
  cast: TmdbCastMember[];
  certification: string;
  videos?: { results?: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[] };
}

// Helper function to format movie or TV show response
const formatResponse = (
  results: TmdbRawMedia[],
  genres: TmdbGenre[],
): TmdbMedia[] => {
  const genresMap = genres.reduce<Record<number, string>>((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});

  return results.map((item) => {
    const genreNames = (item.genre_ids || []).map(
      (genreId) => genresMap[genreId] || 'Unknown Genre',
    );
    return {
      ...item,
      genre_names: genreNames,
      type: item.first_air_date ? ('tv' as const) : ('movie' as const),
      release_date: item.release_date || item.first_air_date,
    };
  });
};

// This function maps service names to their IDs
export const mapServiceNamesToIds = async (
  serviceNames: string[],
): Promise<number[]> => {
  try {
    const allServices = await fetchStreamingServices();
    const serviceMap = allServices.reduce<Record<string, number>>(
      (map, service) => {
        map[service.provider_name] = service.provider_id;
        return map;
      },
      {},
    );

    return serviceNames
      .map((name) => serviceMap[name])
      .filter((id): id is number => typeof id === 'number');
  } catch (error) {
    console.error('Error mapping service names to IDs:', error);
    throw error;
  }
};

// Fetch trending content from TMDB
export const fetchTrendingContent = async (
  mediaType: TrendingMediaType = 'all',
  timeWindow: TimeWindow = 'day',
): Promise<TmdbMedia[]> => {
  try {
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      `/trending/${mediaType}/${timeWindow}`,
    );
    return formatResponse(response.data.results, await fetchGenres());
  } catch (error) {
    console.error(`Error fetching trending content:`, error);
    throw error;
  }
};

// Fetch genres from TMDB
export const fetchGenres = async (): Promise<TmdbGenre[]> => {
  try {
    const response = await tmdbApi.get<{ genres: TmdbGenre[] }>(
      '/genre/movie/list',
    );
    return response.data.genres;
  } catch (error) {
    console.error('Error fetching genres:', error);
    throw error;
  }
};

// Fetch popular movies from TMDB
export const fetchPopularMovies = async (
  page: number = 1,
): Promise<TmdbMedia[]> => {
  try {
    const genres = await fetchGenres();
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      '/movie/popular',
      { params: { page } },
    );
    return formatResponse(response.data.results, genres);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    throw error;
  }
};

// Fetch popular TV shows from TMDB
export const fetchPopularTVShows = async (
  page: number = 1,
): Promise<TmdbMedia[]> => {
  try {
    const genres = await fetchGenres();
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      '/tv/popular',
      { params: { page } },
    );
    return formatResponse(response.data.results, genres);
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    throw error;
  }
};

// Fetch movies by selected streaming services with a focus on popularity
export const fetchMoviesByServices = async (
  serviceIds: number[] | undefined | null,
  page: number = 1,
): Promise<TmdbMedia[]> => {
  try {
    if (!serviceIds || serviceIds.length === 0) {
      return fetchPopularMovies();
    }
    const genres = await fetchGenres();
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      '/discover/movie',
      {
        params: {
          with_watch_providers: serviceIds.join('|'),
          watch_region: 'US',
          sort_by: 'popularity.desc',
          page,
        },
      },
    );
    return formatResponse(response.data.results, genres);
  } catch (error) {
    console.error(`Error fetching movies for services ${serviceIds}:`, error);
    throw error;
  }
};

// Fetch TV shows by selected streaming services with a focus on new releases
export const fetchTVShowsByServices = async (
  serviceIds: number[] | undefined | null,
  page: number = 1,
): Promise<TmdbMedia[]> => {
  try {
    if (!serviceIds || serviceIds.length === 0) {
      return fetchPopularTVShows();
    }
    const genres = await fetchGenres();
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      '/discover/tv',
      {
        params: {
          with_watch_providers: serviceIds.join('|'),
          watch_region: 'US',
          sort_by: 'first_air_date.desc',
          'air_date.lte': new Date().toISOString().split('T')[0],
          page,
        },
      },
    );
    return formatResponse(response.data.results, genres);
  } catch (error) {
    console.error(`Error fetching TV shows for services ${serviceIds}:`, error);
    throw error;
  }
};

// Fetch movies by genre
export const fetchMoviesByGenre = async (
  genreId: number,
): Promise<TmdbRawMedia[]> => {
  try {
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      '/discover/movie',
      { params: { with_genres: genreId } },
    );
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching movies for genre ${genreId}:`, error);
    throw error;
  }
};

// Fetch movie watch providers from TMDB
export const fetchMovieWatchProviders = async (
  movieId: number,
): Promise<Record<string, TmdbWatchProviders>> => {
  try {
    const response = await tmdbApi.get<{
      results: Record<string, TmdbWatchProviders>;
    }>(`/movie/${movieId}/watch/providers`);
    return response.data.results;
  } catch (error) {
    console.error(
      `Error fetching watch providers for movie ${movieId}:`,
      error,
    );
    throw error;
  }
};

// Fetch show watch providers from TMDB
export const fetchShowWatchProviders = async (
  showId: number,
): Promise<Record<string, TmdbWatchProviders>> => {
  try {
    const response = await tmdbApi.get<{
      results: Record<string, TmdbWatchProviders>;
    }>(`/tv/${showId}/watch/providers`);
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching watch providers for show ${showId}:`, error);
    throw error;
  }
};

// Fetch configuration data from TMDB
export interface TmdbConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    [key: string]: unknown;
  };
  change_keys?: string[];
}

export const fetchConfiguration = async (): Promise<TmdbConfiguration> => {
  try {
    const response = await tmdbApi.get<TmdbConfiguration>('/configuration');
    return response.data;
  } catch (error) {
    console.error('Error fetching configuration:', error);
    throw error;
  }
};

// Fetch Available Streaming Services
export const fetchStreamingServices = async (): Promise<TmdbProvider[]> => {
  try {
    const response = await tmdbApi.get<{ results: TmdbProvider[] }>(
      '/watch/providers/tv?watch_region=US',
    );
    const services = response.data.results;
    const filteredServices = services.filter(
      (service) => service.provider_id && service.logo_path,
    );

    const topServices = filteredServices
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 25);

    return topServices.map((service) => ({
      ...service,
      logo_url: `https://image.tmdb.org/t/p/w500${service.logo_path}`,
    }));
  } catch (error) {
    console.error('Error fetching streaming services:', error);
    throw error;
  }
};

// Search movies
export const searchMovies = async (q: string): Promise<TmdbRawMedia[]> => {
  try {
    const response = await tmdbApi.get<{ results: TmdbRawMedia[] }>(
      '/search/movie',
      { params: { query: q } },
    );
    return response.data.results;
  } catch (error) {
    console.error('Error searching for movies:', error);
    throw error;
  }
};

// Function to fetch certification for a movie or TV show
interface TvRatingsResult {
  iso_3166_1: string;
  rating: string;
}
interface MovieReleaseDatesResult {
  iso_3166_1: string;
  release_dates?: { certification?: string }[];
}

const fetchCertificationsById = async (
  id: number | string,
  type: MediaType,
): Promise<string> => {
  try {
    const endpoint =
      type === 'tv'
        ? `/tv/${id}/content_ratings`
        : `/movie/${id}/release_dates`;
    const response = await tmdbApi.get<{
      results: TvRatingsResult[] | MovieReleaseDatesResult[];
    }>(endpoint);
    let certification: string;

    if (type === 'tv') {
      const results = response.data.results as TvRatingsResult[];
      const usRating = results.find((r) => r.iso_3166_1 === 'US');
      certification = usRating ? usRating.rating : 'NR';
    } else {
      const results = response.data.results as MovieReleaseDatesResult[];
      const usRelease = results.find((release) => release.iso_3166_1 === 'US');
      certification = usRelease?.release_dates?.[0]?.certification || 'NR';
    }

    return certification;
  } catch (error) {
    console.error(`Error fetching certifications for ${type} ${id}:`, error);
    throw error;
  }
};

// Fetch details for a movie or TV show by ID from TMDB, including additional information like credits and watch providers
export const fetchDetailsById = async (
  id: number | string,
  type: MediaType,
): Promise<TitleDetails> => {
  try {
    const detailsResponse = await tmdbApi.get<
      Omit<TitleDetails, 'providers' | 'cast' | 'certification'> & {
        credits: { cast: TmdbCastMember[] };
        videos?: { results?: TmdbVideo[] };
      }
    >(`/${type}/${id}`, {
      params: { append_to_response: 'videos,credits' },
    });
    const providersResponse = await tmdbApi.get<{
      results: Record<string, TmdbWatchProviders>;
    }>(`/${type}/${id}/watch/providers`);

    const providersData: TmdbWatchProviders =
      providersResponse.data.results.US || {};

    const certification = await fetchCertificationsById(id, type);

    return {
      ...detailsResponse.data,
      providers: {
        flatrate: providersData.flatrate || [],
        rent: providersData.rent || [],
        buy: providersData.buy || [],
      },
      cast: detailsResponse.data.credits.cast.slice(0, 10),
      certification,
    };
  } catch (error) {
    console.error(`Error fetching details for ${type} ${id}:`, error);
    throw error;
  }
};
