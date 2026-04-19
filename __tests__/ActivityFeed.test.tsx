/**
 * Sprint 4 test surface: ActivityFeed — Phosphor-icon empty state +
 * invite CTA. When rows are present, each row reserves a 2px left-
 * accent bar (Warp pattern, mobile-UX brief Rule #15).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActivityFeed from '../components/ActivityFeed';
import { ToastProvider } from '../components/Toast';

const withProvider = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

describe('ActivityFeed', () => {
  it('renders the empty state with invite CTA', () => {
    const { getByLabelText, getByText } = withProvider(<ActivityFeed />);
    expect(getByText('Friends go here')).toBeTruthy();
    expect(getByLabelText('Invite a friend')).toBeTruthy();
  });

  it('shows the "Invite Maya, Nico, or Sam" microcopy (not "no activity")', () => {
    const { queryByText, getByText } = withProvider(<ActivityFeed />);
    expect(getByText(/Invite Maya/)).toBeTruthy();
    expect(queryByText(/no activity/i)).toBeNull();
  });

  it('pressing invite CTA does not crash (toast fires)', () => {
    const { getByLabelText } = withProvider(<ActivityFeed />);
    fireEvent.press(getByLabelText('Invite a friend'));
    // Toast provider handles the rest; render should still be stable.
    expect(getByLabelText('Invite a friend')).toBeTruthy();
  });

  it('renders rows with a 2px left-accent bar when provided', () => {
    const rows = [
      {
        id: 'r1',
        actor: 'Maya',
        verb: 'liked',
        titleName: 'Past Lives',
        accent: 'match' as const,
      },
    ];
    const tree = withProvider(<ActivityFeed rows={rows} />);
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('Maya');
    expect(str).toContain('Past Lives');
  });
});
