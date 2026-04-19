import React from 'react';
import { type ViewStyle, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { colors, radii } from '../../theme';

/**
 * Skeleton — Moti-based shimmer placeholder matching Sprint 4
 * mobile-UX brief Rules #1-3:
 *   - Pulse 0.45 → 0.85 opacity at ~1.3Hz (770ms cycle)
 *   - Easing.inOut(Easing.ease) for a soft breath
 *   - Geometry matches the final layout within ~4px (caller passes
 *     concrete width/height/borderRadius)
 *   - Inline placeholder — chrome (headers, nav) stays real
 *
 * Sprint 4 uses Skeleton for:
 *   - HomeScreen deck preload
 *   - DetailScreen hero + meta rows
 *   - MyCaveScreen watchlist grid
 *   - MatchesScreen list rows
 *   - Stories-strip + activity-feed scaffolds
 */

export interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: ViewStyle['height'];
  borderRadius?: number;
  style?: ViewStyle;
}

const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps): React.ReactElement => {
  return (
    <MotiView
      style={[styles.base, { width, height, borderRadius }, style as ViewStyle]}
      from={{ opacity: 0.45 }}
      animate={{ opacity: 0.85 }}
      transition={{
        type: 'timing',
        duration: 770,
        loop: true,
        repeatReverse: true,
        easing: Easing.inOut(Easing.ease),
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceRaised,
  },
});

export default Skeleton;
