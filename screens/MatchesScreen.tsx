import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
} from 'react-native';
import { Heart } from 'phosphor-react-native';
import { doc, getDoc } from 'firebase/firestore';
import {
  fetchUserMatches,
  listFriends,
  type UserMatch,
  type TasteLabels,
  type TasteProfile,
} from '../utils/firebaseOperations';
import {
  tasteProfileToUserTasteProfile,
  type UserTasteProfile,
} from '../utils/matchScore';
import { auth, db } from '../firebaseConfig';
import DotLoader from '../components/DotLoader';
import ActivityFeed from '../components/ActivityFeed';
import FriendCard, {
  type FriendCardPublicProfile,
} from '../components/FriendCard';
import { useToast } from '../components/Toast';
import { colors, spacing, radii, typography } from '../theme';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MatchesStackParamList } from '../navigation/types';

type Props = StackScreenProps<MatchesStackParamList, 'MatchesHome'>;

// Shape of a /users/{uid}/public/profile doc as read by this screen.
// Stays permissive — missing fields default to empty at call time.
interface PublicProfileRead {
  displayName?: string | null;
  photoURL?: string | null;
  tasteLabels?: TasteLabels | null;
  tasteProfile?: TasteProfile | null;
  interactedTitleIds?: number[];
  genres?: string[];
  streamingServices?: string[];
  updatedAt?: { seconds?: number; toMillis?: () => number } | number | null;
}

interface PrivateProfileRead {
  tasteProfile?: TasteProfile | null;
  genres?: string[];
  streamingServices?: string[];
}

function readUpdatedAtMillis(v: PublicProfileRead['updatedAt']): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return 0;
}

function buildFriendCardProfile(
  uid: string,
  pub: PublicProfileRead | null,
  priv: PrivateProfileRead | null,
): FriendCardPublicProfile {
  // Match-signal fields read from PUBLIC first (so cross-user match works
  // against a friend's public doc) then fall back to private for the
  // viewer's own side where onboarding may have written to private only.
  const interactedTitleIds = pub?.interactedTitleIds ?? [];
  const genres = pub?.genres ?? priv?.genres ?? [];
  const streamingServices =
    pub?.streamingServices ?? priv?.streamingServices ?? [];
  const taste: UserTasteProfile = tasteProfileToUserTasteProfile(
    uid,
    priv?.tasteProfile ?? pub?.tasteProfile ?? null,
    { interactedTitleIds, genres, streamingServices },
  );
  return {
    uid,
    displayName: pub?.displayName ?? null,
    photoURL: pub?.photoURL ?? null,
    updatedAt: readUpdatedAtMillis(pub?.updatedAt),
    taste,
  };
}

const MatchesScreen = ({ navigation }: Props): React.ReactElement => {
  const [matchesList, setMatchesList] = useState<UserMatch[]>([]);
  const [friends, setFriends] = useState<FriendCardPublicProfile[]>([]);
  const [viewer, setViewer] = useState<FriendCardPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleFriendPress = useCallback(
    (friendUid: string): void => {
      navigation.navigate('FriendDetail', { friendUid });
    },
    [navigation],
  );

  const loadFriends = useCallback(async (uid: string): Promise<void> => {
    // 1. Viewer's own public + private (for taste axes from quiz).
    const [viewerPubSnap, viewerPrivSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'public', 'profile')),
      getDoc(doc(db, 'users', uid)),
    ]);
    const viewerPub =
      (viewerPubSnap.data() as PublicProfileRead | undefined) ?? null;
    const viewerPriv =
      (viewerPrivSnap.data() as PrivateProfileRead | undefined) ?? null;
    const viewerProfile = buildFriendCardProfile(uid, viewerPub, viewerPriv);
    setViewer(viewerProfile);

    // 2. Friendships (accepted only) + resolve friend public profiles.
    const friendships = await listFriends(uid);
    const resolved = await Promise.all(
      friendships.map(async (f) => {
        const friendUid = f.participants.find((p) => p !== uid);
        if (!friendUid) return null;
        try {
          const fs = await getDoc(
            doc(db, 'users', friendUid, 'public', 'profile'),
          );
          const fpub = (fs.data() as PublicProfileRead | undefined) ?? null;
          // Friend's side never sees private (rules reject cross-user); pass
          // null for priv. buildFriendCardProfile will use pub for tasteProfile
          // if present, else defaults.
          return buildFriendCardProfile(friendUid, fpub, null);
        } catch {
          return null;
        }
      }),
    );
    setFriends(
      resolved.filter((x): x is FriendCardPublicProfile => x !== null),
    );
  }, []);

  const handleChatPress = (match: UserMatch): void => {
    toast.show({
      type: 'info',
      title: 'Chat lands in Sprint 5',
      body: `Your conversation with ${match.friend.name} will open here.`,
    });
  };

  useEffect(() => {
    const loadAll = async (): Promise<void> => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          setLoading(true);
          setError(null);
          // Title-matches (existing) and friend list (Sprint 5b Stream A)
          // load in parallel — they share nothing and don't block each
          // other.
          const [fetchedMatches] = await Promise.all([
            fetchUserMatches(currentUser.uid),
            loadFriends(currentUser.uid),
          ]);
          setMatchesList(fetchedMatches);
        } catch (err) {
          console.error('Failed to load matches on screen:', err);
          setError("We couldn't load your matches. Pull to retry.");
        } finally {
          setLoading(false);
        }
      } else {
        setError('Please log in to see your matches.');
        setLoading(false);
      }
    };

    loadAll();
    const unsubscribe = navigation.addListener('focus', loadAll);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFriends]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <DotLoader size="lg" accessibilityLabel="Loading matches" />
        <Text style={styles.loadingText}>Loading matches…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      </View>
    );
  }

  const friendsSection =
    viewer && friends.length > 0 ? (
      <View>
        <Text style={styles.subheader}>Your friends</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.friendsRow}
        >
          {friends.map((friend) => (
            <FriendCard
              key={friend.uid}
              user={viewer}
              friend={friend}
              onPress={handleFriendPress}
              style={styles.friendCard}
            />
          ))}
        </ScrollView>
      </View>
    ) : null;

  if (matchesList.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Matches</Text>
        {friendsSection}
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Heart size={36} color={colors.accent} weight="regular" />
          </View>
          <Text style={styles.emptyTitle}>No title matches yet</Text>
          <Text style={styles.emptyBody}>
            Keep swiping. Title matches land when you both like the same film.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find friends"
            accessibilityHint="Opens the contact match screen"
            onPress={() => navigation.navigate('ContactOnboarding')}
            style={({ pressed }) => [
              styles.findFriendsCta,
              pressed && styles.findFriendsCtaPressed,
            ]}
          >
            <Text style={styles.findFriendsCtaText}>Find friends</Text>
          </Pressable>
        </View>
        <Text style={styles.subheader}>Friend activity</Text>
        <ActivityFeed />
      </View>
    );
  }

  const renderMatchItem = ({
    item,
  }: {
    item: UserMatch;
  }): React.ReactElement => {
    const posterPath = item.title.poster_path;
    const imageUrl = posterPath
      ? `https://image.tmdb.org/t/p/w500${posterPath}`
      : undefined;

    return (
      <View style={styles.matchItem}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.matchImage} />
        ) : (
          <View style={[styles.matchImage, styles.matchImagePlaceholder]} />
        )}
        <View style={styles.matchDetails}>
          <Text style={styles.matchTitle} numberOfLines={2}>
            {item.title.title || item.title.name}
          </Text>
          <Text style={styles.matchText}>
            You and {item.friend.name} both love this.
          </Text>
          <Pressable
            accessibilityLabel={`Open chat with ${item.friend.name}`}
            accessibilityHint="Chat surface lands in Sprint 5"
            accessibilityRole="button"
            style={styles.chatButton}
            onPress={() => handleChatPress(item)}
          >
            <Text style={styles.chatButtonText}>Start chat</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Matches</Text>
      {friendsSection}
      <FlatList
        data={matchesList}
        renderItem={renderMatchItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
      <Text style={styles.subheader}>Friend activity</Text>
      <ActivityFeed />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xl,
    backgroundColor: colors.ink,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  header: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
  subheader: {
    ...typography.titleSm,
    color: colors.textHigh,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  matchItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  matchImage: {
    width: 84,
    height: 126,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  matchImagePlaceholder: {
    backgroundColor: colors.borderSubtle,
  },
  matchDetails: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  matchTitle: {
    ...typography.titleSm,
    color: colors.textHigh,
  },
  matchText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  chatButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  chatButtonText: {
    ...typography.button,
    color: colors.accentForeground,
  },
  errorBanner: {
    margin: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
  },
  errorBannerText: {
    ...typography.body,
    color: colors.textHigh,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
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
    maxWidth: 320,
    marginBottom: spacing.md,
  },
  findFriendsCta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  findFriendsCtaPressed: {
    backgroundColor: colors.accentHover,
  },
  findFriendsCtaText: {
    ...typography.button,
    color: colors.accentForeground,
  },
  friendsRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  friendCard: {
    marginRight: spacing.sm,
  },
});

export default MatchesScreen;
