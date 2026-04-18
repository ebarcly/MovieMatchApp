import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';
import {
  fetchPopularMovies,
  fetchPopularTVShows,
  fetchMoviesByServices,
  fetchTVShowsByServices,
  fetchTrendingContent,
  mapServiceNamesToIds,
} from '../services/api';
import { auth, db } from '../firebaseConfig';
import { MoviesContext } from '../context/MoviesContext';
import { fetchInteractedTitleIds } from '../utils/firebaseOperations';

// Sprint 2 BUG-5: when every fetched title has already been interacted
// with, retry the next TMDB page up to this many times before giving
// up. Caps at 3 to avoid infinite loops on extremely thin TMDB result
// sets (edge genres, unusual category combinations).
const MAX_PAGINATION_RETRIES = 3;

const HomeScreen = ({ navigation }) => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TV Shows');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const { state, dispatch } = useContext(MoviesContext);

  const fetchUserPreferences = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      setError(
        'Failed to load user preferences. Please check your internet connection.',
      );
      return null;
    }
  };

  // Sprint 2 BUG-5: request a single TMDB page for the active category.
  // Split out so the retry loop can ask for page N cleanly.
  const fetchCategoryPage = async (category, userPrefs, page) => {
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

  const fetchContentBasedOnCategory = async (category) => {
    setLoading(true);
    setError('');
    try {
      const userPrefs = await fetchUserPreferences();
      const interactedIds = auth.currentUser
        ? await fetchInteractedTitleIds(auth.currentUser.uid)
        : [];

      // Pagination + dedupe retry loop — BUG-5.
      let filteredData = [];
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

      if (filteredData.length === 0) {
        setContent([]);
        // Only now, after exhausting retries, show the empty state.
        setError(
          lastRawLength === 0
            ? 'No content available right now. Try a different category.'
            : "You've swiped through everything we have for this category. Check back soon!",
        );
      } else {
        setContent(filteredData);
      }

      // Reset card index when category changes or new content is loaded.
      // persist index per category per user, this logic needs to be more advanced
      const initialIndexForCategory =
        category === 'Movies' ? state.lastMovieIndex : state.lastTVShowIndex;
      setCurrentCardIndex(
        filteredData.length > 0 && initialIndexForCategory < filteredData.length
          ? initialIndexForCategory
          : 0,
      );
    } catch (e) {
      console.error(`Failed to fetch ${category.toLowerCase()}:`, e);
      setError(`Failed to fetch ${category.toLowerCase()}: ${e.message}`);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentBasedOnCategory(selectedCategory);
  }, [selectedCategory]);

  const handleSwipeComplete = useCallback(() => {
    const newIndex = Math.min(currentCardIndex + 1, content.length - 1);
    setCurrentCardIndex(newIndex);

    // Dispatch action to update the index in context
    const actionType =
      selectedCategory === 'Movies'
        ? 'UPDATE_LAST_MOVIE_INDEX'
        : 'UPDATE_LAST_TVSHOW_INDEX';
    dispatch({ type: actionType, payload: newIndex });
  }, [currentCardIndex, content.length, selectedCategory, dispatch]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (content.length === 0) {
    return (
      <Text style={styles.errorText}>
        No content available for your selection.
      </Text>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <NavigationBar profileName={auth.currentUser?.profileName} />
      <CategoryTabs onCategorySelect={setSelectedCategory} />
      <View style={styles.cardContainer}>
        {content.slice(currentCardIndex, currentCardIndex + 1).map((item) => (
          <SwipeableCard
            key={item.id.toString()}
            movie={item}
            onSwipeComplete={handleSwipeComplete}
            navigation={navigation}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  cardContainer: {
    alignItems: 'center',
    padding: 16,
    flex: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});

export default HomeScreen;
