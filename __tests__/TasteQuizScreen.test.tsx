/**
 * Sprint 4 test surface: TasteQuizScreen.
 *
 * Smoke-level:
 *   - Renders pair 1 immediately (no progress indicator before pair 4).
 *   - Tapping a poster fires Haptics.selectionAsync.
 *   - Progresses to subsequent pairs on pick.
 *   - On completion, writeTasteProfile is called with an axes + labels
 *     object shape.
 *   - Read-back sentence uses the two identity labels.
 *   - Skips the quiz if fetchTasteProfile already returned a profile
 *     (idempotent re-entry).
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import TasteQuizScreen from '../screens/TasteQuizScreen';
import * as firebaseOps from '../utils/firebaseOperations';
import * as Haptics from 'expo-haptics';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
  fetchTMDBImage: jest.fn(async () => 'https://image.tmdb.org/p/abc.jpg'),
}));

jest.mock('../utils/firebaseOperations', () => ({
  writeTasteProfile: jest.fn(async () => undefined),
  fetchTasteProfile: jest.fn(async () => null),
}));

jest.mock('../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'quiz-user' } },
  db: {},
}));

const mockNavigationObj = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  popToTop: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(() => () => {}),
  removeListener: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
  reset: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigationObj,
}));

describe('TasteQuizScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firebaseOps.fetchTasteProfile as jest.Mock).mockResolvedValue(null);
    (firebaseOps.writeTasteProfile as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders pair 1 without a progress indicator', async () => {
    const tree = render(<TasteQuizScreen />);
    await waitFor(() => {
      // Poster A of pair 1 — 'The Batman'.
      expect(tree.getByLabelText(/Pick The Batman/)).toBeTruthy();
    });
    // Progress appears only from pair 4; pair 1 must NOT show '1 of 7'.
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('1 of 7');
  });

  it('tapping a poster fires Haptics.selectionAsync', async () => {
    const tree = render(<TasteQuizScreen />);
    await waitFor(() =>
      expect(tree.getByLabelText(/Pick The Batman/)).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.press(tree.getByLabelText(/Pick The Batman/));
    });
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('skips straight to CTA when fetchTasteProfile already returns a profile', async () => {
    (firebaseOps.fetchTasteProfile as jest.Mock).mockResolvedValueOnce({
      axes: {
        pacing: 0,
        era: 0,
        mood: 0,
        stakes: 0,
        tone: 0,
        genreFluency: 0,
        realism: 0,
        runtime: 0,
      },
      labels: { common: 'late-night', rare: 'slow cinema' },
    });
    const tree = render(<TasteQuizScreen />);
    await waitFor(() => {
      expect(
        tree.getByText(/You lean late-night and slow cinema/),
      ).toBeTruthy();
    });
  });

  it('completing all 7 pairs writes a tasteProfile with labels.common + labels.rare', async () => {
    jest.useFakeTimers();
    const tree = render(<TasteQuizScreen />);
    await waitFor(() =>
      expect(tree.getByLabelText(/Pick The Batman/)).toBeTruthy(),
    );

    // 7 picks — always press the first poster we find, advance each
    // time the component flushes timers forward 300ms.
    for (let i = 0; i < 7; i++) {
      // find any "Pick " labeled Pressable
      const poster = tree
        .UNSAFE_getAllByProps({ accessibilityRole: 'button' })
        .find(
          (n) =>
            typeof n.props.accessibilityLabel === 'string' &&
            n.props.accessibilityLabel.startsWith('Pick '),
        );
      await act(async () => {
        if (poster) fireEvent.press(poster);
      });
      await act(async () => {
        jest.advanceTimersByTime(320);
      });
    }
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(firebaseOps.writeTasteProfile).toHaveBeenCalledTimes(1);
    const [uid, profile] = (firebaseOps.writeTasteProfile as jest.Mock).mock
      .calls[0];
    expect(uid).toBe('quiz-user');
    expect(profile.axes).toBeDefined();
    expect(profile.labels).toBeDefined();
    expect(typeof profile.labels.common).toBe('string');
    expect(typeof profile.labels.rare).toBe('string');
    jest.useRealTimers();
  });
});

// reason: the api import is kept so the mock is registered even if a
// test path doesn't reference it directly.
void api;
