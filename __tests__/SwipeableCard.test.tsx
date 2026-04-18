/**
 * Sprint 3 test surface: SwipeableCard button direction (Sprint 2 BUG-1
 * regression guard).
 *
 * Convention:
 *   Skip button    → handleSwipe('reject', ...) → DISLIKE_MOVIE dispatch,
 *                    interactionAction = 'disliked_or_skipped'
 *   Watched button → handleSwipe('accept', ...) → ADD_TO_WATCHLIST dispatch,
 *                    interactionAction = 'liked' + addToWatchlist call
 *
 * We assert those semantics through the MoviesContext dispatch spy + the
 * mocked firebaseOperations calls.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SwipeableCard from '../components/SwipeableCard';
import { MoviesContext } from '../context/MoviesContext';
import * as firebaseOps from '../utils/firebaseOperations';
import * as firebaseAuth from 'firebase/auth';

jest.mock('../utils/firebaseOperations', () => ({
  recordTitleInteraction: jest.fn(async () => undefined),
  addToWatchlist: jest.fn(async () => undefined),
  createMatchDocument: jest.fn(async () => undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const recordTitleInteraction = firebaseOps.recordTitleInteraction as jest.Mock;
const addToWatchlist = firebaseOps.addToWatchlist as jest.Mock;

// Pretend there is a signed-in user so the interaction path runs.
// reason: firebase auth is mocked globally; we pin .currentUser here so the
// SwipeableCard's auth.currentUser reads see a "signed in" user.
(firebaseAuth as unknown as { getAuth: () => { currentUser: unknown } }).getAuth = jest.fn(
  () => ({ currentUser: { uid: 'test-user' } }),
);

// The SwipeableCard component reads auth.currentUser off firebaseConfig.auth.
// firebaseConfig imports firebase/auth's initializeAuth (mocked). Patch the
// module-level exported auth.currentUser by replacing the firebaseConfig
// export directly.
jest.mock('../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
}));

const makeCtx = () => {
  const dispatch = jest.fn();
  const value = {
    state: {
      movies: [],
      tvShows: [],
      watchlist: [],
      favorites: [],
      dislikedMovies: [],
      watched: [],
      lastMovieIndex: 0,
      lastTVShowIndex: 0,
      configData: {
        images: { base_url: 'http://img.tmdb/', secure_base_url: 'https://img.tmdb/' },
      },
      genres: [],
      error: null,
      friends: [],
    },
    dispatch,
  };
  return { dispatch, value };
};

const movie = {
  id: 101,
  type: 'movie' as const,
  poster_path: '/p.jpg',
  genre_ids: [],
  index: 0,
};

describe('SwipeableCard — button direction (BUG-1 regression)', () => {
  beforeEach(() => {
    recordTitleInteraction.mockReset();
    addToWatchlist.mockReset();
    recordTitleInteraction.mockResolvedValue(undefined);
    addToWatchlist.mockResolvedValue(undefined);
  });

  it('Skip button dispatches DISLIKE_MOVIE and records disliked_or_skipped', async () => {
    const { dispatch, value } = makeCtx();
    const onComplete = jest.fn();

    const { getByText } = render(
      <MoviesContext.Provider
        // reason: context test provider — MoviesContextValue is fully
        // typed so the `value` matches its generic without any-cast.
        value={value}
      >
        <SwipeableCard movie={movie} onSwipeComplete={onComplete} />
      </MoviesContext.Provider>,
    );

    await act(async () => {
      fireEvent.press(getByText('Skip'));
    });

    const dispatched = dispatch.mock.calls.map((c) => c[0].type);
    expect(dispatched).toContain('DISLIKE_MOVIE');
    expect(dispatched).not.toContain('ADD_TO_WATCHLIST');

    expect(recordTitleInteraction).toHaveBeenCalledWith(
      'test-user',
      101,
      'movie',
      'disliked_or_skipped',
    );
    expect(addToWatchlist).not.toHaveBeenCalled();
  });

  it('Watched button dispatches ADD_TO_WATCHLIST and calls addToWatchlist with liked', async () => {
    const { dispatch, value } = makeCtx();
    const onComplete = jest.fn();

    const { getByText } = render(
      <MoviesContext.Provider value={value}>
        <SwipeableCard movie={movie} onSwipeComplete={onComplete} />
      </MoviesContext.Provider>,
    );

    await act(async () => {
      fireEvent.press(getByText('Watched'));
    });

    const dispatched = dispatch.mock.calls.map((c) => c[0].type);
    expect(dispatched).toContain('ADD_TO_WATCHLIST');
    expect(dispatched).not.toContain('DISLIKE_MOVIE');

    expect(recordTitleInteraction).toHaveBeenCalledWith(
      'test-user',
      101,
      'movie',
      'liked',
    );
    expect(addToWatchlist).toHaveBeenCalledWith(
      'test-user',
      expect.objectContaining({ id: 101, type: 'movie' }),
    );
  });
});
