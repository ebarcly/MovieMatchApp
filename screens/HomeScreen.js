import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';
import { fetchPopularMovies, fetchPopularTVShows, fetchMoviesByServices, fetchTVShowsByServices, fetchTrendingContent, mapServiceNamesToIds } from '../services/api';
import { auth, db } from '../firebaseConfig';
import { MoviesContext } from '../context/MoviesContext';

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
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const fetchContentBasedOnCategory = async (category) => {
    try {
      const userPrefs = await fetchUserPreferences();
      const { streamingServices, fullCatalogAccess } = userPrefs || {};

      let data = [];
      if (category === 'All') {
        data = await fetchTrendingContent('all', 'day');
      } else if (fullCatalogAccess) {
        data = category === 'Movies' ? await fetchPopularMovies() : await fetchPopularTVShows();
      } else if (streamingServices && streamingServices.length > 0) {
        const serviceIds = await mapServiceNamesToIds(streamingServices);
        data = category === 'Movies'
          ? await fetchMoviesByServices(serviceIds)
          : await fetchTVShowsByServices(serviceIds);
      } else {
        data = category === 'Movies' ? await fetchPopularMovies() : await fetchPopularTVShows();
      }

      setContent(data);
      const index = category === 'Movies' ? state.lastMovieIndex : state.lastTVShowIndex;
      setCurrentCardIndex(index);
    } catch (e) {
      setError(`Failed to fetch ${category.toLowerCase()}: ${e.message}`);
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
    const actionType = selectedCategory === 'Movies' ? 'UPDATE_LAST_MOVIE_INDEX' : 'UPDATE_LAST_TVSHOW_INDEX';
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
    return <Text style={styles.errorText}>No content available for your selection.</Text>;
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