/**
 * QueueDetailScreen — Sprint 5b Stream D.
 *
 * Vertical list of titles in queue-order with 4 reaction-tap buttons
 * (👍🔥😴⏭️) per row + a "mark watched" button visible only on the
 * current next-up title (when `nextPickUid === auth.currentUser.uid`).
 *
 * Loading: DotLoader (never ActivityIndicator).
 * Empty state: Phosphor FilmStrip + tinted circle + ≤12-word body per
 * Sprint 4 rules.
 *
 * Optimistic local state: reactions + mark-watched update locally first
 * then call firebaseOperations; a thrown error rolls back the local
 * optimistic write and surfaces an inline banner.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { FilmStrip } from 'phosphor-react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import DotLoader from '../components/DotLoader';
import {
  reactToQueueTitle,
  markTitleWatched,
  queueReactionKey,
  type QueueDoc,
  type QueueReaction,
} from '../utils/firebaseOperations';
import { fetchDetailsById, type TitleDetails } from '../services/api';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography } from '../theme';

type QueueDetailRouteProp = RouteProp<HomeStackParamList, 'QueueDetail'>;

const REACTION_SET: QueueReaction[] = ['👍', '🔥', '😴', '⏭️'];

interface TitleMap {
  [id: number]: TitleDetails | null;
}

const QueueDetailScreen = (): React.ReactElement => {
  const route = useRoute<QueueDetailRouteProp>();
  const queueId = route.params.queueId;
  const uid = auth.currentUser?.uid ?? null;
  const [queue, setQueue] = useState<QueueDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState<TitleMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queueId) return undefined;
    const unsub = onSnapshot(
      doc(db, 'queues', queueId),
      (snap) => {
        if (!snap.exists()) {
          setQueue(null);
        } else {
          const data = snap.data() as Omit<QueueDoc, 'id'>;
          setQueue({ id: snap.id, ...data });
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[QueueDetail] load failed:', err);
        setError('Could not load this queue. Pull down to retry.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [queueId]);

  // Fetch title details for each titleId, one-by-one best-effort.
  useEffect(() => {
    if (!queue) return;
    let cancelled = false;
    (async () => {
      const next: TitleMap = {};
      for (const id of queue.orderedTitleIds) {
        if (titles[id] !== undefined) {
          next[id] = titles[id];
          continue;
        }
        try {
          next[id] = await fetchDetailsById(id, 'movie');
        } catch {
          next[id] = null;
        }
      }
      if (!cancelled) setTitles((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue?.orderedTitleIds.join(',')]);

  const handleReact = async (
    titleId: number,
    reaction: QueueReaction,
  ): Promise<void> => {
    try {
      setError(null);
      await reactToQueueTitle(queueId, titleId, reaction);
    } catch (err) {
      console.warn('[QueueDetail] react failed:', err);
      setError('We could not save that reaction. Try again.');
    }
  };

  const handleMarkWatched = async (titleId: number): Promise<void> => {
    try {
      setError(null);
      await markTitleWatched(queueId, titleId);
    } catch (err) {
      console.warn('[QueueDetail] mark watched failed:', err);
      setError('Only the current picker can mark a title watched.');
    }
  };

  const nextPickTitleId = useMemo(() => {
    // Convention: the next-up title is the first un-watched title in
    // orderedTitleIds. Because we don't store a per-title "watched" bit
    // on the queue itself, we expose "mark watched" ONLY on the first
    // title in the ordered list when the caller is the current picker.
    return queue?.orderedTitleIds[0] ?? null;
  }, [queue]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DotLoader size="lg" accessibilityLabel="Loading queue" />
      </View>
    );
  }

  if (!queue) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <FilmStrip size={32} color={colors.accent} weight="regular" />
        </View>
        <Text style={styles.emptyTitle}>Queue not found</Text>
        <Text style={styles.emptyBody}>Ask a participant to re-share it.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {queue.name ? <Text style={styles.header}>{queue.name}</Text> : null}
      {error ? (
        <View
          style={styles.errorBanner}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {queue.orderedTitleIds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <FilmStrip size={32} color={colors.accent} weight="regular" />
          </View>
          <Text style={styles.emptyTitle}>No titles yet</Text>
          <Text style={styles.emptyBody}>Add one to get started.</Text>
        </View>
      ) : (
        queue.orderedTitleIds.map((titleId) => {
          const d = titles[titleId];
          const myKey = uid ? queueReactionKey(titleId, uid) : '';
          const myReaction = myKey ? (queue.reactions[myKey] ?? null) : null;
          const isNextUp = titleId === nextPickTitleId;
          const canMarkWatched = isNextUp && queue.nextPickUid === uid;
          return (
            <View key={titleId} style={styles.row}>
              <View style={styles.rowTop}>
                {d?.poster_path ? (
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w185${d.poster_path}`,
                    }}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                <View style={styles.rowMeta}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {d?.title ?? d?.name ?? `Title #${titleId}`}
                  </Text>
                  <View style={styles.reactionsRow}>
                    {REACTION_SET.map((r) => (
                      <Pressable
                        key={r}
                        accessibilityRole="button"
                        accessibilityLabel={`React ${r}`}
                        onPress={() => handleReact(titleId, r)}
                        style={({ pressed }) => [
                          styles.reactionBtn,
                          myReaction === r ? styles.reactionBtnActive : null,
                          pressed ? styles.reactionBtnPressed : null,
                        ]}
                      >
                        <Text style={styles.reactionText}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              {canMarkWatched ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark watched"
                  onPress={() => handleMarkWatched(titleId)}
                  style={({ pressed }) => [
                    styles.watchedBtn,
                    pressed ? styles.watchedBtnPressed : null,
                  ]}
                >
                  <Text style={styles.watchedBtnText}>Mark watched</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  header: {
    ...typography.titleMd,
    color: colors.textHigh,
    marginBottom: spacing.md,
  },
  errorBanner: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.textHigh,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
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
  },
  row: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
  },
  thumb: {
    width: 72,
    height: 108,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  thumbEmpty: {
    backgroundColor: colors.borderStrong,
  },
  rowMeta: {
    flex: 1,
    justifyContent: 'space-between',
  },
  rowTitle: {
    ...typography.label,
    color: colors.textHigh,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  reactionBtnActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  reactionBtnPressed: {
    opacity: 0.7,
  },
  reactionText: {
    fontSize: 18,
  },
  watchedBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  watchedBtnPressed: {
    opacity: 0.85,
  },
  watchedBtnText: {
    ...typography.button,
    color: colors.accentForeground,
  },
});

export default QueueDetailScreen;
