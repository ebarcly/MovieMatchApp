import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { colors } from '../theme';

/**
 * DotLoader — the ONE motion motif for inline spinners across
 * MovieMatchApp. Paired 8px dots (one laser-lemon, one hot-magenta)
 * cross-fade over a 900ms cycle with a spring-eased scale pulse.
 *
 * Sprint 4 mobile-UX brief Rule #13 / stretch S4: "one motion motif
 * carries brand recall better than a generic spinner." Every
 * `ActivityIndicator` in the app is replaced by this component.
 *
 * Size prop maps to dot diameter:
 *   - sm: 6px  (inside button rows, Toast CTAs)
 *   - md: 8px  (default — inline spinners, screen-level loaders)
 *   - lg: 12px (post-quiz read-back, hero-level loading states)
 *
 * Accessibility: exposes an `accessibilityRole` of 'progressbar' and a
 * label pass-through so screen readers announce the busy region. Android
 * gets `accessibilityLiveRegion='polite'` — iOS VoiceOver infers from
 * role.
 */

export type DotLoaderSize = 'sm' | 'md' | 'lg';

export interface DotLoaderProps {
  /** Dot diameter preset. Default 'md' (8px). */
  size?: DotLoaderSize;
  /** Optional screen-reader label. Default 'Loading'. */
  accessibilityLabel?: string;
  /** Optional wrapper style for layout integration. */
  style?: ViewStyle;
}

const SIZE_MAP: Record<DotLoaderSize, number> = {
  sm: 6,
  md: 8,
  lg: 12,
};

const DotLoader = ({
  size = 'md',
  accessibilityLabel = 'Loading',
  style,
}: DotLoaderProps): React.ReactElement => {
  const diameter = SIZE_MAP[size];
  const gap = Math.round(diameter * 0.75);

  // 900ms full cycle — each dot pulses opacity + scale with a 450ms
  // phase offset (the second dot's `from` and `animate` states are
  // mirrored). Easing.inOut(ease) keeps the "breath" soft — the motif
  // should read as alive, not strobing. Moti's timing loop gives us the
  // steady heartbeat; an always-on spring would dampen by the second
  // cycle.
  const commonTransition = {
    type: 'timing' as const,
    loop: true,
    repeatReverse: true,
    duration: 450,
    easing: Easing.inOut(Easing.ease),
  };

  const dotBase: ViewStyle = {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
  };

  return (
    <View
      style={[styles.container, { gap }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      <MotiView
        style={[dotBase, { backgroundColor: colors.accentSecondary }]}
        from={{ opacity: 0.35, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1.05 }}
        transition={commonTransition}
      />
      <MotiView
        style={[dotBase, { backgroundColor: colors.accent }]}
        from={{ opacity: 1, scale: 1.05 }}
        animate={{ opacity: 0.35, scale: 0.85 }}
        transition={commonTransition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DotLoader;
