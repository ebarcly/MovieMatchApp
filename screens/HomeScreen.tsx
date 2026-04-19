import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs, { type Category } from '../components/CategoryTabs';
import DotLoader from '../components/DotLoader';
import StoriesStrip from '../components/StoriesStrip';
import { FilmStrip } from 'phosphor-react-native';
import {
  fetchPopularMovies,
  fetchPopularTVShows,
  fetchMoviesByServices,
  fetchTVShowsByServices,
  fetchTrendingContent,
  mapServiceNamesToIds,
  type TmdbMedia,
} from '../services/api';
import { auth, db } from '../firebaseConfig';
import { MoviesContext } from '../context/MoviesContext';
import { fetchInteractedTitleIds } from '../utils/firebaseOperations';
import type { StackScreenProps } from '@react-navigation/stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography } from '../theme';

// Sprint 2 BUG-5: when every fetched title has already been interacted
// with, retry the next TMDB page up to this many times before giving
// up. Caps at 3 to avoid infinite loops on extremely thin TMDB result
// sets (edge genres, unusual category combinations).
export const MAX_PAGINATION_RETRIES = 3;

// Sprint 2 BUG-5 (round 2): prefetch the next page when the user is
// within this many cards of the end of the currently-loaded deck.
// Kicks the next-page fetch early enough that it usually lands before
// the user swipes off the last card.
export const PREFETCH_THRESHOLD = 3;

type Props = StackScreenProps<HomeStackParamList, 'Home'>;

interface UserPreferences {
  streamingServices?: string[];
  fullCatalogAccess?: boolean;
}

const HomeScreen = (_props: Props): React.ReactElement => {
  const [content, setContent] = useState<TmdbMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<Category>('TV Shows');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { state, dispatch } = useContext(MoviesContext);

  const fetchUserPreferences = async (): Promise<UserPreferences | null> => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserPreferences;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      setError(
        'Failed to load user preferences. Please check your connection.',
      );
      return null;
    }
  };

  // Sprint 2 BUG-5: request a single TMDB page for the active category.
  // Split out so the retry loop can ask for page N cleanly.
  const fetchCategoryPage = async (
    category: Category,
    userPrefs: UserPreferences | null,
    page: number,
  ): Promise<TmdbMedia[]> => {
    const { streamingServices, fullCatalogAccess } = userPrefs || {};
    if (category === 'All') {
      // Trending endpoint is un-paginated for our purposes; page is
      // accepted but TMDB returns the same trending set regardless, so
      // retries on 'All' exit early in the caller when page > 1.
      return fetchTrendingContent('all', 'day');
    }
    if (fullCatalogAccess) {
      return category === 'Movies'
        ? fetchPopularMovies(page)
        : fetchPopularTVShows(page);
    }
    if (streamingServices && streamingServices.length > 0) {
      const serviceIds = await mapServiceNamesToIds(streamingServices);
      return category === 'Movies'
        ? fetchMoviesByServices(serviceIds, page)
        : fetchTVShowsByServices(serviceIds, page);
    }
    return category === 'Movies'
      ? fetchPopularMovies(page)
      : fetchPopularTVShows(page);
  };

  const fetchContentBasedOnCategory = async (
    category: Category,
  ): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const userPrefs = await fetchUserPreferences();
      const interactedIds = auth.currentUser
        ? await fetchInteractedTitleIds(auth.currentUser.uid)
        : [];

      // Pagination + dedupe retry loop — BUG-5 (initial load).
      let filteredData: TmdbMedia[] = [];
      let page = 1;
      let lastRawLength = 0;
      for (let attempt = 0; attempt < MAX_PAGINATION_RETRIES; attempt += 1) {
        const rawData = await fetchCategoryPage(category, userPrefs, page);
        lastRawLength = rawData.length;
        const filtered =
          interactedIds.length > 0
            ? rawData.filter((item) => !interactedIds.includes(item.id))
            : rawData;
        console.log(
          `HOME: category=${category} page=${page} raw=${rawData.length} filtered=${filtered.length} (attempt ${attempt + 1}/${MAX_PAGINATION_RETRIES})`,
        );
        if (filtered.length > 0) {
          filteredData = filtered;
          break;
        }
        // Trending endpoint doesn't paginate usefully — bail early so
        // we don't burn retries fetching the same set 3x.
        if (category === 'All') {
          break;
        }
        page += 1;
      }

      setCurrentPage(page);

      if (filteredData.length === 0) {
        setContent([]);
        setError(
          lastRawLength === 0
            ? 'No content available right now. Try a different category.'
            : "You've swiped through everything for this category. Check back soon.",
        );
      } else {
        setContent(filteredData);
      }

      // Reset card index when category changes or new content is loaded.
      const initialIndexForCategory =
        category === 'Movies' ? state.lastMovieIndex : state.lastTVShowIndex;
      setCurrentCardIndex(
        filteredData.length > 0 && initialIndexForCategory < filteredData.length
          ? initialIndexForCategory
          : 0,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to fetch ${category.toLowerCase()}:`, e);
      setError(`Failed to fetch ${category.toLowerCase()}: ${msg}`);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  // Sprint 2 BUG-5 (round 2): fetch the NEXT TMDB page and append
  // non-duplicate, non-interacted titles to the existing deck.
  const loadMoreContent = useCallback(async (): Promise<void> => {
    if (isLoadingMore || selectedCategory === 'All') return;
    setIsLoadingMore(true);
    try {
      const userPrefs = await fetchUserPreferences();
      const interactedIds = auth.currentUser
        ? await fetchInteractedTitleIds(auth.currentUser.uid)
        : [];
      const existingIds = new Set(content.map((c) => c.id));

      let appended = 0;
      let nextPage = currentPage;
      for (let attempt = 0; attempt < MAX_PAGINATION_RETRIES; attempt += 1) {
        nextPage += 1;
        const rawData = await fetchCategoryPage(
          selectedCategory,
          userPrefs,
          nextPage,
        );
        const filtered = rawData.filter(
          (item) =>
            !interactedIds.includes(item.id) && !existingIds.has(item.id),
        );
        console.log(
          `HOME-APPEND: page=${nextPage} raw=${rawData.length} newFiltered=${filtered.length} (attempt ${attempt + 1}/${MAX_PAGINATION_RETRIES})`,
        );
        if (filtered.length > 0) {
          setContent((prev) => [...prev, ...filtered]);
          appended = filtered.length;
          break;
        }
      }
      setCurrentPage(nextPage);
      if (appended === 0) {
        console.log(
          `HOME-APPEND: exhausted ${MAX_PAGINATION_RETRIES} pages without new content for category=${selectedCategory}`,
        );
      }
    } catch (e) {
      console.error('Failed to load more content:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, selectedCategory, currentPage, content]);

  useEffect(() => {
    setCurrentPage(1);
    fetchContentBasedOnCategory(selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => {
    if (
      content.length > 0 &&
      !isLoadingMore &&
      selectedCategory !== 'All' &&
      content.length - currentCardIndex <= PREFETCH_THRESHOLD
    ) {
      loadMoreContent();
    }
  }, [
    currentCardIndex,
    content.length,
    isLoadingMore,
    selectedCategory,
    loadMoreContent,
  ]);

  const handleSwipeComplete = useCallback((): void => {
    const newIndex = currentCardIndex + 1;
    setCurrentCardIndex(newIndex);

    const actionType =
      selectedCategory === 'Movies'
        ? 'UPDATE_LAST_MOVIE_INDEX'
        : 'UPDATE_LAST_TVSHOW_INDEX';
    dispatch({ type: actionType, payload: newIndex });
  }, [currentCardIndex, selectedCategory, dispatch]);

  const handleRetry = useCallback((): void => {
    fetchContentBasedOnCategory(selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <NavigationBar />
        <View style={styles.loadingContainer}>
          <DotLoader size="lg" accessibilityLabel="Loading your deck" />
          <Text style={styles.loadingText}>Warming up your deck…</Text>
        </View>
      </View>
    );
  }

  const currentCard = content[currentCardIndex];
  const deckExhausted = !currentCard && content.length > 0;

  return (
    <View style={styles.screen}>
      <NavigationBar />
      <StoriesStrip />
      <CategoryTabs
        selected={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      {error ? (
        <View
          style={styles.errorBanner}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            accessibilityHint="Re-fetches the deck"
            style={styles.errorRetry}
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.cardContainer}>
        {currentCard ? (
          <SwipeableCard
            key={currentCard.id.toString()}
            movie={{
              id: currentCard.id,
              type: currentCard.type,
              poster_path: currentCard.poster_path ?? null,
              genre_ids: currentCard.genre_ids ?? [],
              index: currentCardIndex,
            }}
            onSwipeComplete={handleSwipeComplete}
          />
        ) : isLoadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <DotLoader size="md" accessibilityLabel="Loading more titles" />
            <Text style={styles.loadingMoreText}>Loading more titles…</Text>
          </View>
        ) : deckExhausted ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <FilmStrip size={32} color={colors.accent} weight="regular" />
            </View>
            <Text style={styles.emptyTitle}>You&apos;re caught up</Text>
            <Text style={styles.emptyBody}>
              Try another category or check back soon.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  cardContainer: {
    alignItems: 'center',
    padding: spacing.md,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  loadingMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingMoreText: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.textHigh,
    flex: 1,
    marginRight: spacing.sm,
  },
  errorRetry: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRetryText: {
    ...typography.button,
    color: colors.accent,
  },
});

export default HomeScreen;
