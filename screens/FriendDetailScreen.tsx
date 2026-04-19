/**
 * FriendDetailScreen — Sprint 5b Stream A.
 *
 * Renders a single friend's public profile + the match composite:
 *   - Avatar + displayName + tasteLabels
 *   - Big MatchScoreChip ('lg') with tier label
 *   - "Why you match" slot — DotLoader then Stream C hook result, with
 *     {displayLabel} substituted to the real friend's displayName
 *   - Top 3 shared titles (sharedTitleIds from computeMatchScore)
 *   - "Send rec" CTA (tertiary) → RecCardCompose w/ preselected friendUid
 *   - "Share match card" CTA (tertiary, Stream E) → shareMatchCard
 *
 * Data-locality rule: reads ONLY from `/users/{uid}/public/profile`. The
 * viewer's taste context (interactedTitleIds / genres / streamingServices)
 * comes from the private `/users/{uid}` doc of the SIGNED-IN user, which
 * is their own data — no cross-user private read. The friend's taste
 * contribution is from the friend's public profile.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import Avatar from '../components/Avatar';
import DotLoader from '../components/DotLoader';
import MatchScoreChip from '../components/MatchScoreChip';
import {
  computeMatchScore,
  tasteProfileToUserTasteProfile,
  type UserTasteProfile,
} from '../utils/matchScore';
import type {
  TasteAxis,
  TasteLabels,
  TasteProfile,
} from '../utils/firebaseOperations';
import { fetchDetailsById, type TitleDetails } from '../services/api';
import { useWhyYouMatch } from '../hooks/useWhyYouMatch';
import { getDefaultLLMClient } from '../utils/ai/impl/AnthropicLLMClient';
import { shareMatchCard } from '../utils/shareMatchCard';
import type { MatchesStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography } from '../theme';

type FriendDetailRouteProp = RouteProp<MatchesStackParamList, 'FriendDetail'>;
type FriendDetailNavProp = StackNavigationProp<
  MatchesStackParamList,
  'FriendDetail'
>;

// --- Helpers ----------------------------------------------------------

interface PublicProfileShape {
  displayName?: string | null;
  photoURL?: string | null;
  tasteLabels?: TasteLabels | null;
  tasteProfile?: TasteProfile | null;
  interactedTitleIds?: number[];
  genres?: string[];
  streamingServices?: string[];
  updatedAt?: { seconds?: number; toMillis?: () => number } | number | null;
}

interface PrivateProfileShape {
  tasteProfile?: TasteProfile | null;
  genres?: string[];
  streamingServices?: string[];
}

function topAxesForPayload(
  axes: Record<TasteAxis, number> | null | undefined,
): { axis: TasteAxis; value: number }[] {
  if (!axes) return [];
  const rows: { axis: TasteAxis; value: number }[] = (
    Object.entries(axes) as [TasteAxis, number][]
  )
    .filter(([, v]) => Number.isFinite(v))
    .map(([axis, value]) => ({ axis, value }));
  rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return rows.slice(0, 3);
}

// --- Screen -----------------------------------------------------------

const FriendDetailScreen = (): React.ReactElement => {
  const route = useRoute<FriendDetailRouteProp>();
  const navigation = useNavigation<FriendDetailNavProp>();
  const friendUid = route.params.friendUid;
  const userUid = auth.currentUser?.uid ?? null;

  const [friendPublic, setFriendPublic] = useState<PublicProfileShape | null>(
    null,
  );
  const [userPublic, setUserPublic] = useState<PublicProfileShape | null>(null);
  const [userPrivate, setUserPrivate] = useState<PrivateProfileShape | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [titleDetails, setTitleDetails] = useState<
    Record<number, TitleDetails>
  >({});

  // Subscribe to friend's public profile.
  useEffect(() => {
    if (!friendUid) return undefined;
    const unsub = onSnapshot(
      doc(db, 'users', friendUid, 'public', 'profile'),
      (snap) => {
        setFriendPublic(
          (snap.data() as PublicProfileShape | undefined) ?? null,
        );
        setLoading(false);
      },
      (err) => {
        console.warn('[FriendDetail] friend public read failed:', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [friendUid]);

  // Subscribe to the signed-in user's public + private for the viewer's
  // taste context. Private read is the viewer's OWN doc — rules allow it.
  useEffect(() => {
    if (!userUid) return undefined;
    const unsubPub = onSnapshot(
      doc(db, 'users', userUid, 'public', 'profile'),
      (snap) => {
        setUserPublic((snap.data() as PublicProfileShape | undefined) ?? null);
      },
    );
    const unsubPriv = onSnapshot(doc(db, 'users', userUid), (snap) => {
      setUserPrivate((snap.data() as PrivateProfileShape | undefined) ?? null);
    });
    return () => {
      unsubPub();
      unsubPriv();
    };
  }, [userUid]);

  // Compose UserTasteProfile for both sides.
  const userTaste: UserTasteProfile | null = useMemo(() => {
    if (!userUid) return null;
    return tasteProfileToUserTasteProfile(
      userUid,
      userPrivate?.tasteProfile ?? null,
      {
        interactedTitleIds: [],
        genres: userPrivate?.genres ?? [],
        streamingServices: userPrivate?.streamingServices ?? [],
      },
    );
  }, [userUid, userPrivate]);

  const friendTaste: UserTasteProfile | null = useMemo(() => {
    if (!friendUid) return null;
    return tasteProfileToUserTasteProfile(
      friendUid,
      friendPublic?.tasteProfile ?? null,
      {
        interactedTitleIds: friendPublic?.interactedTitleIds ?? [],
        genres: friendPublic?.genres ?? [],
        streamingServices: friendPublic?.streamingServices ?? [],
      },
    );
  }, [friendUid, friendPublic]);

  const matchResult = useMemo(() => {
    if (!userTaste || !friendTaste) return null;
    return computeMatchScore(userTaste, friendTaste);
  }, [userTaste, friendTaste]);

  // Fetch top 3 shared-title metadata (poster, title). Best-effort — any
  // failure just renders a plain placeholder.
  useEffect(() => {
    if (!matchResult) return;
    const top3 = matchResult.sharedTitleIds.slice(0, 3);
    let cancelled = false;
    (async () => {
      const fetched: Record<number, TitleDetails> = {};
      for (const id of top3) {
        if (titleDetails[id]) {
          fetched[id] = titleDetails[id];
          continue;
        }
        try {
          const d = await fetchDetailsById(id, 'movie');
          fetched[id] = d;
        } catch {
          // Ignored — a missing title just renders the id.
        }
      }
      if (!cancelled) setTitleDetails((prev) => ({ ...prev, ...fetched }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchResult?.sharedTitleIds.join(','), matchResult]);

  // Wire the Stream C hook for the why-you-match sentence.
  const whyInput = useMemo(() => {
    const friendLabels: TasteLabels = friendPublic?.tasteLabels ?? {
      common: 'texture',
      rare: 'signal',
    };
    const userLabels: TasteLabels = userPublic?.tasteLabels ?? {
      common: 'texture',
      rare: 'signal',
    };
    return {
      user: {
        tasteLabels: userLabels,
        topAxes: topAxesForPayload(userPrivate?.tasteProfile?.axes ?? null),
      },
      friend: {
        tasteLabels: friendLabels,
        topAxes: topAxesForPayload(friendPublic?.tasteProfile?.axes ?? null),
      },
      overlap: {
        sharedGenres: matchResult?.sharedGenres ?? [],
        sharedEras: [],
        sharedMoods: [],
        sharedDirectors: [],
        signalTier:
          (matchResult?.sharedTitleIds.length ?? 0) >= 3
            ? ('full' as const)
            : (matchResult?.sharedGenres.length ?? 0) >= 1
              ? ('partial' as const)
              : ('cold' as const),
      },
    };
  }, [userPublic, userPrivate, friendPublic, matchResult]);

  const client = useMemo(() => getDefaultLLMClient(), []);
  const whyState = useWhyYouMatch({
    client,
    input: whyInput,
    friendDisplayName: friendPublic?.displayName ?? 'your friend',
    uidPair: [userUid ?? '', friendUid ?? ''],
  });

  const handleSendRec = (): void => {
    const firstTitleId = matchResult?.sharedTitleIds[0];
    navigation.navigate('RecCardCompose', {
      titleId: firstTitleId ?? 0,
      friendUid,
    });
  };

  const handleShareMatchCard = async (): Promise<void> => {
    if (!userUid || !friendUid) return;
    try {
      await shareMatchCard(userUid, friendUid);
    } catch (err) {
      console.warn('[FriendDetail] shareMatchCard failed:', err);
    }
  };

  if (loading || !matchResult) {
    return (
      <View style={styles.loading}>
        <DotLoader size="lg" accessibilityLabel="Loading friend detail" />
      </View>
    );
  }

  const top3 = matchResult.sharedTitleIds.slice(0, 3);
  const friendLabels = friendPublic?.tasteLabels;
  const displayName = friendPublic?.displayName ?? 'Your friend';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Avatar
          photoURL={friendPublic?.photoURL ?? null}
          displayName={displayName}
          size="xl"
        />
        <Text style={styles.name}>{displayName}</Text>
        {friendLabels ? (
          <Text style={styles.labels} numberOfLines={2}>
            {friendLabels.common} · {friendLabels.rare}
          </Text>
        ) : null}
        <View style={styles.chipWrap}>
          <MatchScoreChip score={matchResult.score} size="lg" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why you match</Text>
        {whyState.loading ? (
          <View style={styles.loaderRow}>
            <DotLoader size="sm" accessibilityLabel="Generating reason" />
          </View>
        ) : (
          <Text style={styles.whyText}>{whyState.text}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top shared titles</Text>
        {top3.length === 0 ? (
          <Text style={styles.emptyLine}>
            No overlap yet — swap a rec to seed one.
          </Text>
        ) : (
          <View style={styles.posterRow}>
            {top3.map((id) => {
              const d = titleDetails[id];
              return (
                <View key={id} style={styles.posterCell}>
                  {d?.poster_path ? (
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w342${d.poster_path}`,
                      }}
                      style={styles.poster}
                    />
                  ) : (
                    <View style={[styles.poster, styles.posterPlaceholder]} />
                  )}
                  <Text style={styles.posterTitle} numberOfLines={2}>
                    {d?.title ?? d?.name ?? `#${id}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [
            styles.tertiaryBtn,
            pressed ? styles.tertiaryBtnPressed : null,
          ]}
          onPress={handleSendRec}
          accessibilityRole="button"
          accessibilityLabel="Send a rec to this friend"
        >
          <Text style={styles.tertiaryBtnText}>Send rec</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tertiaryBtn,
            pressed ? styles.tertiaryBtnPressed : null,
          ]}
          onPress={handleShareMatchCard}
          accessibilityRole="button"
          accessibilityLabel="Share match card"
        >
          <Text style={styles.tertiaryBtnText}>Share match card</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  name: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  labels: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  chipWrap: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textHigh,
    marginBottom: spacing.sm,
  },
  whyText: {
    ...typography.body,
    color: colors.textBody,
  },
  loaderRow: {
    paddingVertical: spacing.md,
  },
  emptyLine: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  posterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  posterCell: {
    flex: 1,
  },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  posterPlaceholder: {
    backgroundColor: colors.surfaceRaised,
  },
  posterTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  tertiaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tertiaryBtnPressed: {
    opacity: 0.8,
  },
  tertiaryBtnText: {
    ...typography.button,
    color: colors.textHigh,
  },
});

export default FriendDetailScreen;
