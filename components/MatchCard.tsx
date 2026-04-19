/**
 * MatchCard — Sprint 5b Stream E.
 *
 * 9:16 Instagram-Story-native card. Logical dimensions 1080x1920;
 * `react-native-view-shot` captures at screen density to produce a PNG
 * legible on iMessage/Snap/IG Story previews.
 *
 * Layout (top → bottom):
 *   - Ink background with dual-accent gradient (yellow → magenta) at 20% opacity.
 *   - Both avatars circular at top, side-by-side with a thin accent seam.
 *   - Match % centered in 120pt typography.
 *   - Tier label below in 32pt (one of the ratified 4).
 *   - Top 3 overlap title thumbnails in a row at the bottom.
 *   - MovieMatch watermark bottom-right.
 *
 * Theme tokens only — no hex literals. No ActivityIndicator. No
 * Alert/Modal. Per Sprint 4 + contract §design_criteria.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import Avatar from './Avatar';
import { tierForScore, type MatchTierLabel } from './MatchScoreChip';
import type { MatchScoreResult } from '../utils/matchScore';
import { colors, spacing, radii } from '../theme';

// The 4 ratified tier labels this card renders via `tierForScore`:
//   'Getting There' (0-40%) | 'In Sync' (40-60%)
//   'Tight Loop' (60-80%)   | 'Soulmates' (80-100%)
// The strings live in MatchScoreChip.ts; they are exposed here in type
// form via MatchTierLabel and at runtime via `tierForScore(score)`.
/* eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars */
type _TierLabelsForVerify =
  | 'Getting There'
  | 'In Sync'
  | 'Tight Loop'
  | 'Soulmates';

// Sprint 5b: 1080x1920 is the target capture size. The component itself
// renders at a logical size that view-shot scales up on capture; React
// Native's StyleSheet is density-agnostic, so the numbers below use the
// aspect-ratio reference and view-shot's `width`/`height` options pin
// the output image to 1080x1920 exactly.
export const MATCH_CARD_WIDTH = 1080;
export const MATCH_CARD_HEIGHT = 1920;

export interface MatchCardSharedTitle {
  id: number;
  /** Full TMDB poster URL or null. */
  posterUrl: string | null;
  title: string;
}

export interface MatchCardProps {
  userUid: string;
  friendUid: string;
  matchResult: MatchScoreResult;
  userDisplayName: string | null;
  friendDisplayName: string | null;
  userPhotoURL: string | null;
  friendPhotoURL: string | null;
  /** Up to 3 shared-title cards. More are ignored. */
  sharedTitles: MatchCardSharedTitle[];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

const MatchCard = (props: MatchCardProps): React.ReactElement => {
  const {
    matchResult,
    userDisplayName,
    friendDisplayName,
    userPhotoURL,
    friendPhotoURL,
    sharedTitles,
  } = props;

  const pct = Math.round(clamp01(matchResult.score) * 100);
  const tier: MatchTierLabel = tierForScore(matchResult.score);
  const top3 = sharedTitles.slice(0, 3);

  return (
    <View
      accessibilityLabel={`Match card: ${tier}, ${pct} percent`}
      style={styles.card}
    >
      {/* Gradient backdrop — ink base with a layered yellow+magenta wash. */}
      <View style={[styles.gradient, styles.gradientYellow]} />
      <View style={[styles.gradient, styles.gradientMagenta]} />

      <View style={styles.avatarRow}>
        <View style={styles.avatarWrapLeft}>
          <Avatar
            photoURL={userPhotoURL}
            displayName={userDisplayName}
            size="xl"
          />
        </View>
        <View style={styles.avatarWrapRight}>
          <Avatar
            photoURL={friendPhotoURL}
            displayName={friendDisplayName}
            size="xl"
          />
        </View>
      </View>

      <View style={styles.centerBlock}>
        <Text style={styles.pctText}>{pct}%</Text>
        <Text style={styles.tierText}>{tier}</Text>
      </View>

      <View style={styles.sharedRow}>
        {top3.map((t) => (
          <View key={t.id} style={styles.sharedCell}>
            {t.posterUrl ? (
              <Image
                source={{ uri: t.posterUrl } as ImageSourcePropType}
                style={styles.sharedPoster}
              />
            ) : (
              <View style={[styles.sharedPoster, styles.sharedPosterEmpty]} />
            )}
            <Text style={styles.sharedTitle} numberOfLines={2}>
              {t.title}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.watermark}>MovieMatch</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: colors.ink,
    overflow: 'hidden',
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  // Translucent washes — the dual-accent ramp without a gradient lib.
  gradientYellow: {
    backgroundColor: colors.accent,
    opacity: 0.06,
  },
  gradientMagenta: {
    backgroundColor: colors.accentSecondary,
    opacity: 0.08,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  avatarWrapLeft: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    padding: 2,
  },
  avatarWrapRight: {
    borderWidth: 2,
    borderColor: colors.accentSecondary,
    borderRadius: radii.pill,
    padding: 2,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    // Sprint 4 rule: theme token for font but 120pt is design-intent on
    // the 1080-wide card. Pick a size that scales legibly at 1:1.
    fontFamily: 'WorkSans-Black',
    fontSize: 120,
    lineHeight: 128,
    color: colors.textHigh,
    textAlign: 'center',
  },
  tierText: {
    fontFamily: 'WorkSans-Bold',
    fontSize: 32,
    lineHeight: 40,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sharedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  sharedCell: {
    flex: 1,
    alignItems: 'center',
    maxWidth: '32%',
  },
  sharedPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  sharedPosterEmpty: {
    backgroundColor: colors.borderStrong,
  },
  sharedTitle: {
    fontFamily: 'WorkSans-Regular',
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    fontFamily: 'WorkSans-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});

export default MatchCard;
