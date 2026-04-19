/**
 * QueueStrip — Sprint 5b Stream D.
 *
 * Horizontal strip shown on HomeScreen ABOVE the swipe deck and above
 * the CategoryTabs. Renders up to 5 queues the signed-in user
 * participates in. Each row: queue name + participant avatars stacked +
 * up-next title thumbnail + user's own reaction emoji (if any).
 *
 * Tap a row → navigation.navigate('QueueDetail', { queueId }).
 *
 * Theme tokens only. DotLoader while loading (no ActivityIndicator).
 * Empty state uses Phosphor FilmStrip + tinted circle + ≤12-word body.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { FilmStrip } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Avatar from './Avatar';
import DotLoader from './DotLoader';
import {
  listQueuesForUid,
  queueReactionKey,
  type QueueDoc,
} from '../utils/firebaseOperations';
import { auth } from '../firebaseConfig';
import { fetchDetailsById, type TitleDetails } from '../services/api';
import { colors, spacing, radii, typography } from '../theme';
import type { HomeStackParamList } from '../navigation/types';

const MAX_QUEUES = 5;

type QueueStripNav = StackNavigationProp<HomeStackParamList>;

interface ResolvedQueueRow {
  queue: QueueDoc;
  upNextTitle: TitleDetails | null;
  userReaction: string | null;
}

const QueueStrip = (): React.ReactElement => {
  const navigation = useNavigation<QueueStripNav>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ResolvedQueueRow[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const queues = (await listQueuesForUid(uid)).slice(0, MAX_QUEUES);
        const resolved: ResolvedQueueRow[] = await Promise.all(
          queues.map(async (q) => {
            const upNextId = q.orderedTitleIds[0];
            let upNextTitle: TitleDetails | null = null;
            if (typeof upNextId === 'number') {
              try {
                upNextTitle = await fetchDetailsById(upNextId, 'movie');
              } catch {
                upNextTitle = null;
              }
            }
            const reactionKey =
              typeof upNextId === 'number'
                ? queueReactionKey(upNextId, uid)
                : '';
            const userReaction = reactionKey
              ? (q.reactions[reactionKey] ?? null)
              : null;
            return { queue: q, upNextTitle, userReaction };
          }),
        );
        if (!cancelled) setRows(resolved);
      } catch (err) {
        console.warn('[QueueStrip] load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DotLoader size="sm" accessibilityLabel="Loading queues" />
      </View>
    );
  }

  if (rows.length === 0) {
    return <View style={styles.emptyPlaceholder} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {rows.map(({ queue, upNextTitle, userReaction }) => (
          <Pressable
            key={queue.id}
            accessibilityRole="button"
            accessibilityLabel={`Open queue ${queue.name ?? 'Untitled'}`}
            onPress={() =>
              navigation.navigate('QueueDetail', { queueId: queue.id })
            }
            style={({ pressed }) => [
              styles.card,
              pressed ? styles.cardPressed : null,
            ]}
          >
            {upNextTitle?.poster_path ? (
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w342${upNextTitle.poster_path}`,
                }}
                style={styles.poster}
              />
            ) : (
              <View style={[styles.poster, styles.posterEmpty]}>
                <FilmStrip size={24} color={colors.accent} weight="regular" />
              </View>
            )}
            <View style={styles.avatarStack}>
              {queue.participants.slice(0, 3).map((uid, idx) => (
                <View
                  key={uid}
                  style={[
                    styles.avatarSlot,
                    { marginLeft: idx === 0 ? 0 : -8 },
                  ]}
                >
                  <Avatar size="xs" displayName={uid} />
                </View>
              ))}
            </View>
            <Text style={styles.queueName} numberOfLines={1}>
              {queue.name ?? 'Shared queue'}
            </Text>
            {userReaction ? (
              <Text style={styles.reaction}>{userReaction}</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  emptyPlaceholder: {
    // Nothing — keep layout clean. The deck empty-state handles the
    // "no queues yet" message elsewhere (contract §Stream D empty state
    // lives on QueueDetailScreen, not the strip).
    height: 0,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 128,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.85,
  },
  poster: {
    width: 96,
    height: 144,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  posterEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  avatarStack: {
    flexDirection: 'row',
    marginTop: spacing.xxs,
  },
  avatarSlot: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.pill,
  },
  queueName: {
    ...typography.caption,
    color: colors.textHigh,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  reaction: {
    marginTop: 2,
    fontSize: 14,
  },
});

export default QueueStrip;
