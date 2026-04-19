/**
 * Sprint 4 test surface: Skeleton — inline shimmer placeholder.
 * Smoke-level: renders, respects width/height/borderRadius props, hidden
 * from screen readers (screen-reader ignores the pulse, sees the final
 * content when it loads).
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton } from '../components/Skeleton';

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    const tree = render(<Skeleton />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('accepts width, height, and borderRadius props', () => {
    const tree = render(
      <Skeleton width={120} height={180} borderRadius={12} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('is hidden from screen readers (accessibilityElementsHidden)', () => {
    const tree = render(<Skeleton />);
    const json = tree.toJSON() as {
      props?: { accessibilityElementsHidden?: boolean };
    } | null;
    expect(json?.props?.accessibilityElementsHidden).toBe(true);
  });
});
