/**
 * Sprint 3 test surface: MoviesContext reducer.
 *
 * Asserts each action type produces the expected state transition. This is
 * the most load-bearing type surface in the app — if the reducer types
 * drift (extra string keys on action.type, missing payload fields), every
 * dispatch in every screen breaks.
 */

import {
  moviesReducer,
  type MoviesState,
  type MoviesAction,
} from '../context/MoviesContext';

const base: MoviesState = {
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

describe('moviesReducer', () => {
  it('LIKE_MOVIE appends a new movie to favorites', () => {
    const action: MoviesAction = {
      type: 'LIKE_MOVIE',
      payload: { id: 1, type: 'movie' },
    };
    const next = moviesReducer(base, action);
    expect(next.favorites).toHaveLength(1);
    expect(next.favorites[0]).toEqual({ id: 1, type: 'movie' });
  });

  it('LIKE_MOVIE is idempotent for repeated ids', () => {
    const state: MoviesState = {
      ...base,
      favorites: [{ id: 1, type: 'movie' }],
    };
    const action: MoviesAction = {
      type: 'LIKE_MOVIE',
      payload: { id: 1, type: 'movie' },
    };
    const next = moviesReducer(state, action);
    expect(next.favorites).toHaveLength(1);
    expect(next.favorites).toBe(state.favorites); // same reference
  });

  it('ADD_TO_WATCHLIST appends a new watchlist item', () => {
    const action: MoviesAction = {
      type: 'ADD_TO_WATCHLIST',
      payload: { id: 10, type: 'tv' },
    };
    const next = moviesReducer(base, action);
    expect(next.watchlist).toEqual([{ id: 10, type: 'tv' }]);
  });

  it('ADD_TO_WATCHLIST is idempotent for duplicate ids', () => {
    const state: MoviesState = {
      ...base,
      watchlist: [{ id: 10, type: 'tv' }],
    };
    const action: MoviesAction = {
      type: 'ADD_TO_WATCHLIST',
      payload: { id: 10, type: 'tv' },
    };
    const next = moviesReducer(state, action);
    expect(next.watchlist).toHaveLength(1);
  });

  it('SET_WATCHLIST replaces the entire watchlist array', () => {
    const state: MoviesState = {
      ...base,
      watchlist: [{ id: 10, type: 'tv' }],
    };
    const action: MoviesAction = {
      type: 'SET_WATCHLIST',
      payload: [
        { id: 20, type: 'movie' },
        { id: 21, type: 'movie' },
      ],
    };
    const next = moviesReducer(state, action);
    expect(next.watchlist).toHaveLength(2);
    expect(next.watchlist[0].id).toBe(20);
    expect(next.watchlist[1].id).toBe(21);
  });

  it('REMOVE_FROM_WATCHLIST filters out the matching id', () => {
    const state: MoviesState = {
      ...base,
      watchlist: [
        { id: 10, type: 'tv' },
        { id: 11, type: 'movie' },
      ],
    };
    const action: MoviesAction = {
      type: 'REMOVE_FROM_WATCHLIST',
      payload: { id: 10 },
    };
    const next = moviesReducer(state, action);
    expect(next.watchlist).toHaveLength(1);
    expect(next.watchlist[0].id).toBe(11);
  });

  it('UPDATE_LAST_MOVIE_INDEX sets the index', () => {
    const action: MoviesAction = {
      type: 'UPDATE_LAST_MOVIE_INDEX',
      payload: 7,
    };
    const next = moviesReducer(base, action);
    expect(next.lastMovieIndex).toBe(7);
    expect(next.lastTVShowIndex).toBe(0); // unchanged
  });

  it('SET_FRIENDS_LIST replaces the friends array', () => {
    const action: MoviesAction = {
      type: 'SET_FRIENDS_LIST',
      payload: ['u1', 'u2', 'u3'],
    };
    const next = moviesReducer(base, action);
    expect(next.friends).toEqual(['u1', 'u2', 'u3']);
  });

  it('SET_ERROR flips error message', () => {
    const action: MoviesAction = {
      type: 'SET_ERROR',
      payload: 'boom',
    };
    const next = moviesReducer(base, action);
    expect(next.error).toBe('boom');
  });

  it('SET_GENRES replaces the genres array', () => {
    const action: MoviesAction = {
      type: 'SET_GENRES',
      payload: [
        { id: 28, name: 'Action' },
        { id: 35, name: 'Comedy' },
      ],
    };
    const next = moviesReducer(base, action);
    expect(next.genres).toHaveLength(2);
    expect(next.genres[0]).toEqual({ id: 28, name: 'Action' });
  });
});
