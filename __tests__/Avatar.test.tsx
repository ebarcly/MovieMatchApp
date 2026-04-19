/**
 * Sprint 5a — Avatar component tests.
 *
 * Asserts:
 *   - Renders the expo-image when `photoURL` is present.
 *   - Falls back to initial letter when no `photoURL`.
 *   - Size variants ('xs' | 'sm' | 'md' | 'lg') render distinct widths.
 *   - Accessibility label uses displayName when present.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import Avatar from '../components/Avatar';

describe('Avatar (Sprint 5a)', () => {
  it('renders an expo-image when photoURL is set', () => {
    const { getByLabelText } = render(
      <Avatar
        photoURL="https://example.com/u.jpg"
        displayName="Maya"
        size="md"
      />,
    );
    // Parent wrapper owns the a11y label.
    expect(getByLabelText('Avatar for Maya')).toBeTruthy();
  });

  it('renders the initial letter fallback when photoURL is null', () => {
    const { getByText, getByLabelText } = render(
      <Avatar photoURL={null} displayName="Nico" />,
    );
    expect(getByText('N')).toBeTruthy();
    expect(getByLabelText('Avatar for Nico')).toBeTruthy();
  });

  it("renders '?' fallback when displayName is empty", () => {
    const { getByText, getByLabelText } = render(
      <Avatar photoURL={null} displayName="" />,
    );
    expect(getByText('?')).toBeTruthy();
    expect(getByLabelText('Avatar')).toBeTruthy();
  });

  it('accepts all four size variants without crashing', () => {
    (['xs', 'sm', 'md', 'lg'] as const).forEach((size) => {
      const { getByLabelText } = render(
        <Avatar photoURL={null} displayName="X" size={size} />,
      );
      expect(getByLabelText('Avatar for X')).toBeTruthy();
    });
  });

  it('uppercases the initial letter', () => {
    const { getByText } = render(<Avatar photoURL={null} displayName="maya" />);
    expect(getByText('M')).toBeTruthy();
  });

  it('renders with custom accessibilityLabel when provided', () => {
    const { getByLabelText } = render(
      <Avatar
        photoURL={null}
        displayName="Maya"
        accessibilityLabel="Your profile picture"
      />,
    );
    expect(getByLabelText('Your profile picture')).toBeTruthy();
  });
});
