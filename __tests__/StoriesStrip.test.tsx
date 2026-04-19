/**
 * Sprint 4 test surface: StoriesStrip — self-referential empty state.
 *
 * When the user has no friends yet, the strip must render ONE card
 * (user avatar + taste labels). Never a literal "no stories" string.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import StoriesStrip from '../components/StoriesStrip';

jest.mock('../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-1', displayName: 'Alex Morgan' } },
  db: {},
}));

describe('StoriesStrip', () => {
  it('renders without crashing', () => {
    const tree = render(<StoriesStrip />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders the self-referential card when the user has no friend data', () => {
    const tree = render(<StoriesStrip />);
    const str = JSON.stringify(tree.toJSON());
    // Fallback labels from the component.
    expect(str).toContain('late-night');
    expect(str).toContain('slow cinema');
    // Initial from displayName 'Alex Morgan'.
    expect(str).toContain('A');
  });

  it('never renders a literal "no stories" empty state', () => {
    const tree = render(<StoriesStrip />);
    const str = JSON.stringify(tree.toJSON()).toLowerCase();
    expect(str).not.toContain('no stories');
    expect(str).not.toContain('empty');
  });
});
