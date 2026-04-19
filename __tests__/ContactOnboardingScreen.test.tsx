/**
 * Sprint 5a — ContactOnboardingScreen smoke test.
 *
 * Asserts:
 *   - Idle state renders AddressBook hero + two primary CTAs.
 *   - "Match my contacts" + "Share a link instead" are labeled.
 *   - Tapping the share CTA attempts Share.share (privacy-safe fallback
 *     when contacts permission is unavailable).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Share } from 'react-native';
import ContactOnboardingScreen from '../screens/ContactOnboardingScreen';
import { ToastProvider } from '../components/Toast';

const wrap = (ui: React.ReactElement) => <ToastProvider>{ui}</ToastProvider>;

describe('ContactOnboardingScreen (Sprint 5a)', () => {
  it('renders the idle hero with a privacy-framed body', () => {
    const { getByText, getByLabelText } = render(
      wrap(
        // reason: smoke test — nav props aren't exercised by the idle
        // hero; cast via unknown to skip the StackScreenProps requirement.
        React.createElement(
          ContactOnboardingScreen as unknown as React.ComponentType<
            Record<string, unknown>
          >,
          {},
        ),
      ),
    );

    expect(getByText('Find your people')).toBeTruthy();
    expect(getByLabelText('Match my contacts')).toBeTruthy();
    expect(getByLabelText('Share an invite link instead')).toBeTruthy();
  });

  it('pressing "Share a link instead" invokes Share.share', () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'dismissedAction' });

    const { getByLabelText } = render(
      wrap(
        // reason: smoke test — nav props aren't exercised by the idle
        // hero; cast via unknown to skip the StackScreenProps requirement.
        React.createElement(
          ContactOnboardingScreen as unknown as React.ComponentType<
            Record<string, unknown>
          >,
          {},
        ),
      ),
    );

    fireEvent.press(getByLabelText('Share an invite link instead'));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    shareSpy.mockRestore();
  });
});
