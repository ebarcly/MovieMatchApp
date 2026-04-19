/**
 * MatchScoreChip — Sprint 5b Stream A.
 *
 * Renders a match-score number + one of the 4 ratified tier labels:
 *   0-40%  → 'Getting There'
 *   40-60% → 'In Sync'
 *   60-80% → 'Tight Loop'
 *   80-100% → 'Soulmates'
 *
 * Copy is bridge-framed — NEVER the rank-framed compatibility language
 * noted in the Sprint 5b contract anti-patterns. Number + tier label only.
 * Per ratified 2026-04-18 decision + brief anti-patterns.
 *
 * Color mapping (theme tokens only — no hex literals):
 *   0-60%  → colors.accent (laser lemon — the "getting warm" ramp)
 *   60-100% → colors.accentSecondary (hot magenta — the "locked in" ramp)
 * Foreground always `colors.accentForeground` / `colors.accentSecondaryForeground`
 * (both = colors.ink) per a11y contrast rules in theme/index.ts.
 *
 * Size prop:
 *   'sm' — inline chip in a row (friend card subtext)
 *   'md' — friend-card overlay
 *   'lg' — stories-strip hero / FriendDetail hero
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radii, typography } from '../theme';

export type MatchScoreChipSize = 'sm' | 'md' | 'lg';

export type MatchTierLabel =
  | 'Getting There'
  | 'In Sync'
  | 'Tight Loop'
  | 'Soulmates';

export interface MatchScoreChipProps {
  /** Score in [0, 1] — computed by `utils/matchScore.ts`. */
  score: number;
  size?: MatchScoreChipSize;
  style?: ViewStyle;
  /** Optional override; defaults to `Match: <tier>, <percent>`. */
  accessibilityLabel?: string;
}

/** Map a [0,1] score to the ratified tier label. Bucket boundaries per contract. */
export function tierForScore(score: number): MatchTierLabel {
  const pct = clamp01(score) * 100;
  // Boundaries: [0, 40) = Getting There, [40, 60) = In Sync,
  // [60, 80) = Tight Loop, [80, 100] = Soulmates. Exact-40 lands in
  // 'In Sync', exact-60 lands in 'Tight Loop', exact-80 lands in
  // 'Soulmates' — bias toward the upward-feeling tier.
  if (pct >= 80) return 'Soulmates';
  if (pct >= 60) return 'Tight Loop';
  if (pct >= 40) return 'In Sync';
  return 'Getting There';
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function scoreToPct(score: number): number {
  return Math.round(clamp01(score) * 100);
}

const MatchScoreChip = ({
  score,
  size = 'md',
  style,
  accessibilityLabel,
}: MatchScoreChipProps): React.ReactElement => {
  const tier = tierForScore(score);
  const pct = scoreToPct(score);
  // The 60% seam — below is accent (yellow); above is accentSecondary (magenta).
  const hot = pct >= 60;
  const bg = hot ? colors.accentSecondary : colors.accent;
  const fg = hot ? colors.accentSecondaryForeground : colors.accentForeground;

  const sizing = SIZE_MAP[size];
  const label = accessibilityLabel ?? `Match: ${tier}, ${pct} percent`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          paddingVertical: sizing.padY,
          paddingHorizontal: sizing.padX,
        },
        style,
      ]}
    >
      <Text style={[sizing.numberStyle, { color: fg }]} numberOfLines={1}>
        {pct}%
      </Text>
      <Text style={[sizing.tierStyle, { color: fg }]} numberOfLines={1}>
        {tier}
      </Text>
    </View>
  );
};

interface SizeMapEntry {
  padY: number;
  padX: number;
  numberStyle: import('react-native').TextStyle;
  tierStyle: import('react-native').TextStyle;
}

const SIZE_MAP: Readonly<Record<MatchScoreChipSize, SizeMapEntry>> = {
  sm: {
    padY: spacing.xxs,
    padX: spacing.sm,
    numberStyle: { ...typography.label, letterSpacing: 0 },
    tierStyle: { ...typography.caption, marginTop: 0 },
  },
  md: {
    padY: spacing.xs,
    padX: spacing.md,
    numberStyle: { ...typography.titleSm },
    tierStyle: { ...typography.caption, marginTop: 2 },
  },
  lg: {
    padY: spacing.sm,
    padX: spacing.lg,
    numberStyle: { ...typography.display, letterSpacing: -1 },
    tierStyle: { ...typography.label, marginTop: spacing.xxs },
  },
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});

export default MatchScoreChip;
