import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import { Heart } from 'phosphor-react-native';
import { fetchUserMatches, type UserMatch } from '../utils/firebaseOperations';
import { auth } from '../firebaseConfig';
import DotLoader from '../components/DotLoader';
import ActivityFeed from '../components/ActivityFeed';
import { useToast } from '../components/Toast';
import { colors, spacing, radii, typography } from '../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabsParamList, 'Matches'>;

const MatchesScreen = ({ navigation }: Props): React.ReactElement => {
  const [matchesList, setMatchesList] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleChatPress = (match: UserMatch): void => {
    toast.show({
      type: 'info',
      title: 'Chat lands in Sprint 5',
      body: `Your conversation with ${match.friend.name} will open here.`,
    });
  };

  useEffect(() => {
    const loadMatches = async (): Promise<void> => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          setLoading(true);
          setError(null);
          const fetchedMatches = await fetchUserMatches(currentUser.uid);
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

    loadMatches();
    const unsubscribe = navigation.addListener('focus', loadMatches);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (matchesList.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Matches</Text>
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Heart size={36} color={colors.accent} weight="regular" />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyBody}>
            Keep swiping. Matches land here when you and a friend both like it.
          </Text>
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
  },
});

export default MatchesScreen;
