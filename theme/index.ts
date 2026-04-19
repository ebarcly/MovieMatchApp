import type { TextStyle, ViewStyle } from 'react-native';

/**
 * MovieMatchApp — Design system tokens (Sprint 2, locked 2026-04-18).
 *
 * Dual-accent dark-first palette: laser-lemon primary (taste / match /
 * action) + hot-magenta secondary (social / connection / "new"), on a
 * cool-ink neutral scale (NOT warm gray).
 *
 * Rules (enforced by sprint contract + reinforced here for future
 * migrations):
 *
 *   - Pure `#FFFFFF` is forbidden in screens. Use `colors.textHigh`
 *     (#F5F5FA).
 *   - On `colors.accent` (#FBEC5D), foreground MUST be
 *     `colors.accentForeground` (#0A0A12). Yellow + white fails WCAG AA.
 *   - On `colors.accentSecondary` (#FF3E9E), foreground MUST be
 *     `colors.accentSecondaryForeground` (#0A0A12). Pale-on-magenta
 *     sits at 3.00:1 and fails WCAG AA 4.5:1; ink on magenta passes at
 *     6.09:1. Both chromatics use ink fg — no bone-white on chromatic.
 *   - `accent` leads; `accentSecondary` punctuates. They should not sit
 *     adjacent on the same surface at equal emphasis.
 *
 * Sprint 2 migrates LoginScreen / RegisterScreen / MyCaveScreen onto
 * these tokens. Sprint 4 migrates the rest.
 */

// --- Colors -----------------------------------------------------------

export const colors = {
  // Surface & text scale — cool-undertone ink, not neutral gray.
  ink: '#0A0A12',
  surface: '#111118',
  surfaceRaised: '#1A1A24',
  borderStrong: '#2A2A38',
  borderSubtle: '#3D3D4F',
  iconMuted: '#5F5F74',
  textTertiary: '#8A8AA0',
  textSecondary: '#B4B4CA',
  textBody: '#EAEAF2',
  textHigh: '#F5F5FA',
  overlay: 'rgba(10, 10, 18, 0.7)',

  // Primary accent — laser lemon.
  accent: '#FBEC5D',
  accentHover: '#E5D94A',
  accentMuted: 'rgba(251, 236, 93, 0.15)',
  accentForeground: '#0A0A12',

  // Secondary accent — hot magenta. Social / connection / "new".
  accentSecondary: '#FF3E9E',
  accentSecondaryHover: '#E82F8C',
  accentSecondaryForeground: '#0A0A12',

  // Semantic — electric so they don't compete with the primary accent.
  success: '#00E090',
  warning: '#FBEC5D',
  error: '#FF3E6C',
  info: '#7FB3FF',

  // Match-score gradient — tri-stop heat ramp (dim → hot → solar).
  matchGradient: ['#5F5F74', '#FF3E9E', '#FBEC5D'] as const,
} as const;

// --- Spacing ----------------------------------------------------------

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// --- Typography -------------------------------------------------------

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily: 'WorkSans-Black',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  titleLg: {
    fontFamily: 'WorkSans-Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.25,
  },
  titleMd: {
    fontFamily: 'WorkSans-Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  titleSm: {
    fontFamily: 'WorkSans-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'WorkSans-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'WorkSans-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: 'WorkSans-Medium',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: 'WorkSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: 'WorkSans-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
};

// --- Radii ------------------------------------------------------------

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  pill: 999,
} as const;

// --- Shadows ----------------------------------------------------------

export const shadows: Record<string, ViewStyle> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
};

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type Radii = typeof radii;
export type Shadows = typeof shadows;

export interface Theme {
  colors: Colors;
  spacing: Spacing;
  typography: Typography;
  radii: Radii;
  shadows: Shadows;
}

const theme: Theme = { colors, spacing, typography, radii, shadows };

export default theme;
