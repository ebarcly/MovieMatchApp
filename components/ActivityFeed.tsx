import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { UserCircle } from 'phosphor-react-native';
import { useToast } from './Toast';
import { colors, spacing, radii, typography } from '../theme';

/**
 * ActivityFeed — vertical friend-activity section. Until Sprint 5 ships
 * the real friend graph, this renders a themed empty state:
 *   - Phosphor icon (UserCircle) on a tinted-accent circle
 *   - Second-person microcopy ("Your friends' last watches will show
 *     up here. Invite Maya, Nico, or Sam →")
 *   - One-tap invite CTA (Sprint 5 will wire it; tapping now fires an
 *     info toast explaining the timeline)
 *
 * Activity rows reserve a 1-2px left-accent bar slot (Warp pattern,
 * mobile-UX brief Rule #15) so Sprint 5 can encode match / like /
 * ambient state without adding chrome.
 */

export interface ActivityRow {
  id: string;
  actor: string;
  verb: string;
  titleName: string;
  accent?: 'match' | 'like' | 'ambient';
}

export interface ActivityFeedProps {
  rows?: ActivityRow[];
}

const ACCENT_MAP: Record<NonNullable<ActivityRow['accent']>, string> = {
  match: colors.accent,
  like: colors.accentSecondary,
  ambient: colors.borderSubtle,
};

const ActivityFeed = ({ rows = [] }: ActivityFeedProps): React.ReactElement => {
  const toast = useToast();

  const handleInvite = (): void => {
    toast.show({
      type: 'info',
      title: 'Invites coming in Sprint 5',
      body: "We'll open this up as soon as the friend graph ships.",
    });
  };

  if (rows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconCircle}>
          <UserCircle size={32} color={colors.accent} weight="regular" />
        </View>
        <Text style={styles.emptyTitle}>Friends go here</Text>
        <Text style={styles.emptyBody}>
          Your friends&apos; last watches will show up here. Invite Maya, Nico,
          or Sam →
        </Text>
        <Pressable
          onPress={handleInvite}
          style={styles.inviteCta}
          accessibilityRole="button"
          accessibilityLabel="Invite a friend"
          accessibilityHint="Tap to start an invite (coming in Sprint 5)"
        >
          <Text style={styles.inviteCtaText}>Invite a friend</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View
            style={[
              styles.accentBar,
              { backgroundColor: ACCENT_MAP[item.accent ?? 'ambient'] },
            ]}
          />
          <View style={styles.rowBody}>
            <Text style={styles.rowPrimary} numberOfLines={1}>
              <Text style={styles.actor}>{item.actor}</Text> {item.verb}{' '}
              <Text style={styles.title}>{item.titleName}</Text>
            </Text>
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textHigh,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  inviteCta: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  inviteCtaText: {
    ...typography.button,
    color: colors.accentForeground,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    minHeight: 56,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  // Warp-pattern 1-2px left-accent bar. Sprint 5 fills semantics.
  accentBar: {
    width: 2,
  },
  rowBody: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  rowPrimary: {
    ...typography.bodySm,
    color: colors.textHigh,
  },
  actor: {
    ...typography.label,
    color: colors.textHigh,
  },
  title: {
    ...typography.label,
    color: colors.accent,
  },
});

export default ActivityFeed;
