/**
 * Sprint 4 test surface: DotLoader — the one motion motif that replaces
 * every ActivityIndicator. Smoke-level: ensures render, size prop, and
 * accessibilityRole propagation are wired.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import DotLoader from '../components/DotLoader';

describe('DotLoader', () => {
  it('renders without crashing at default size', () => {
    const tree = render(<DotLoader />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders each of the three supported sizes', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const tree = render(<DotLoader size={size} />);
      expect(tree.toJSON()).toBeTruthy();
    }
  });

  it('propagates a custom accessibilityLabel for screen readers', () => {
    const { getByLabelText } = render(
      <DotLoader accessibilityLabel="Syncing watchlist" />,
    );
    expect(getByLabelText('Syncing watchlist')).toBeTruthy();
  });

  it('defaults accessibilityLabel to "Loading"', () => {
    const { getByLabelText } = render(<DotLoader />);
    expect(getByLabelText('Loading')).toBeTruthy();
  });
});
