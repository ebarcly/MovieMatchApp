/**
 * Sprint 5a — ProfilePhotoScreen smoke test.
 *
 * Asserts:
 *   - Renders the hero Avatar fallback + title + body.
 *   - "Choose a photo" + "Skip for now" CTAs render with labels.
 *   - Tapping "Skip for now" invokes onSkip.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfilePhotoScreen from '../screens/ProfilePhotoScreen';
import { ToastProvider } from '../components/Toast';

const wrap = (ui: React.ReactElement) => <ToastProvider>{ui}</ToastProvider>;

describe('ProfilePhotoScreen (Sprint 5a)', () => {
  it('renders hero + both CTAs', () => {
    const { getByText, getByLabelText } = render(
      wrap(<ProfilePhotoScreen userIdOverride="user-a" onSkip={() => {}} />),
    );

    expect(getByText('Add a photo')).toBeTruthy();
    expect(getByLabelText('Choose a photo')).toBeTruthy();
    expect(getByLabelText('Skip for now')).toBeTruthy();
  });

  it('invokes onSkip when Skip for now is pressed', () => {
    const onSkip = jest.fn();
    const { getByLabelText } = render(
      wrap(<ProfilePhotoScreen userIdOverride="user-a" onSkip={onSkip} />),
    );
    fireEvent.press(getByLabelText('Skip for now'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('renders the initial-letter fallback when no photo has been uploaded', () => {
    const { getByLabelText } = render(
      wrap(<ProfilePhotoScreen userIdOverride="user-a" onSkip={() => {}} />),
    );
    // Avatar uses "Letter avatar fallback" label when photoURL is null.
    expect(getByLabelText('Letter avatar fallback')).toBeTruthy();
  });
});
