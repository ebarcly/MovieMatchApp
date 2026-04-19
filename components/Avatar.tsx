import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { colors, radii, typography } from '../theme';

/**
 * Sprint 5a — Avatar primitive for friend-graph surfaces.
 *
 * Renders:
 *   - The user's `photoURL` (via `expo-image` for lazy-load + caching)
 *     when present.
 *   - A fallback: initial letter on a `colors.accentMuted` tinted
 *     circle, matching the Sprint 4 empty-state visual voice
 *     (Phosphor-on-tinted-circle). The letter is high-contrast
 *     `colors.textHigh`.
 *
 * Size prop:
 *   - 'xs' = 24 (inline row chips)
 *   - 'sm' = 32 (list rows)
 *   - 'md' = 48 (default, friend-candidate cards)
 *   - 'lg' = 80 (onboarding hero)
 *   - 'xl' = 120 (MyCave profile hero)
 */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Readonly<Record<AvatarSize, number>> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

export interface AvatarProps {
  /** The user's photo URL, or null/undefined to render the fallback. */
  photoURL?: string | null;
  /** The user's display name. First letter is used for the fallback. */
  displayName?: string | null;
  /** Visual size preset. Default 'md' (48). */
  size?: AvatarSize;
  /** Optional wrapper style override (e.g. marginRight in a row). */
  style?: ViewStyle;
  /**
   * a11y: label announced by screen readers. Defaults to
   * `Avatar for {displayName}`.
   */
  accessibilityLabel?: string;
}

const Avatar = ({
  photoURL,
  displayName,
  size = 'md',
  style,
  accessibilityLabel,
}: AvatarProps): React.ReactElement => {
  const px = SIZE_MAP[size];
  const fontSize = Math.round(px * 0.42);
  const letter = (displayName?.trim()?.[0] ?? '?').toUpperCase();
  const label =
    accessibilityLabel ??
    (displayName ? `Avatar for ${displayName}` : 'Avatar');

  const wrapperStyle: ViewStyle = {
    width: px,
    height: px,
    borderRadius: radii.pill,
  };
  const imageStyle: ImageStyle = {
    width: px,
    height: px,
    borderRadius: radii.pill,
  };

  if (photoURL) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={label}
        style={[styles.wrapper, wrapperStyle, style]}
      >
        <ExpoImage
          source={{ uri: photoURL }}
          style={[styles.image, imageStyle]}
          contentFit="cover"
          transition={150}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.wrapper, styles.fallback, wrapperStyle, style]}
    >
      <Text style={[styles.letter, { fontSize }]}>{letter}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  fallback: {
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Dimensions come from wrapperStyle; `flex: 1` ensures the image
    // fills the circular wrapper when the parent has layout constraints.
    flex: 1,
  },
  letter: {
    ...typography.button,
    color: colors.textHigh,
  },
});

export default Avatar;
