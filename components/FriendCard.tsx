/**
 * FriendCard — Sprint 5b Stream A.
 *
 * Renders a friend's public identity + a MatchScoreChip overlay. The
 * component is read-only for 5b: taps bubble up via `onPress` and the
 * caller navigates to FriendDetailScreen.
 *
 * Strict data-locality rule (contract §Stream A + memory):
 *   - Reads ONLY from `/users/{uid}/public/profile` — never the private
 *     `/users/{uid}` root. The caller provides the already-loaded public
 *     profile snapshot for both the signed-in user and the friend; this
 *     component does no Firestore reads of its own.
 *
 * Memoization:
 *   - Match score is memoized keyed on both uids + both profiles'
 *     `updatedAt` timestamps so a pair of stable props doesn't recompute
 *     on every re-render.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';
import Avatar from './Avatar';
import MatchScoreChip from './MatchScoreChip';
import { computeMatchScore, type UserTasteProfile } from '../utils/matchScore';
import { colors, spacing, radii, typography } from '../theme';

export interface FriendCardPublicProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  /** Serialized timestamp/millis — used as a memo cache key. */
  updatedAt: number;
  /** Taste inputs needed by `computeMatchScore` — derived by caller. */
  taste: UserTasteProfile;
}

export interface FriendCardProps {
  user: FriendCardPublicProfile;
  friend: FriendCardPublicProfile;
  onPress?: (friendUid: string) => void;
  style?: ViewStyle;
}

const FriendCard = ({
  user,
  friend,
  onPress,
  style,
}: FriendCardProps): React.ReactElement => {
  const score = useMemo(() => {
    return computeMatchScore(user.taste, friend.taste).score;
    // Intentionally key on uid + updatedAt pairs so a stable prop chain
    // doesn't recompute. See contract §Stream A.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, friend.uid, user.updatedAt, friend.updatedAt]);

  const handlePress = (): void => {
    onPress?.(friend.uid);
  };

  const a11y = `Friend ${friend.displayName ?? 'Unknown'}, match score overlay`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar
          photoURL={friend.photoURL}
          displayName={friend.displayName}
          size="lg"
        />
        <View style={styles.chipOverlay}>
          <MatchScoreChip score={score} size="sm" />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {friend.displayName ?? 'Unknown'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    minWidth: 120,
  },
  cardPressed: {
    opacity: 0.85,
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOverlay: {
    position: 'absolute',
    bottom: -spacing.xxs,
    alignSelf: 'center',
  },
  name: {
    ...typography.label,
    color: colors.textHigh,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default FriendCard;
