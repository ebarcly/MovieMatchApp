import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';
import { fetchPopularMovies, fetchPopularTVShows, fetchMoviesByServices, fetchTVShowsByServices, mapServiceNamesToIds } from '../services/api';
import { auth, db } from '../firebaseConfig';

const HomeScreen = ({ navigation }) => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Movies');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

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

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userPrefs = await fetchUserPreferences();
      const { streamingServices, fullCatalogAccess } = userPrefs || {};

      let data;
      if (fullCatalogAccess) {
        // Fetch full catalog
        data = selectedCategory === 'Movies' ? await fetchPopularMovies() : await fetchPopularTVShows();
      } else if (streamingServices && streamingServices.length > 0) {
        // Fetch based on selected streaming services
        const serviceIds = await mapServiceNamesToIds(streamingServices);
        data = selectedCategory === 'Movies'
          ? await fetchMoviesByServices(serviceIds)
          : await fetchTVShowsByServices(serviceIds);
      } else {
        // Fallback to popular movies or TV shows
        data = selectedCategory === 'Movies' ? await fetchPopularMovies() : await fetchPopularTVShows();
      }

      setContent(data);
      setCurrentCardIndex(0);
    } catch (e) {
      setError(`Failed to fetch ${selectedCategory.toLowerCase()}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);


  useEffect(() => {
    fetchContent();
  }, [fetchContent, selectedCategory]);

  const handleSwipeComplete = useCallback(() => {
    setCurrentCardIndex(prevIndex => Math.min(prevIndex + 1, content.length - 1));
  }, [content.length]);

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
      <NavigationBar username={auth.currentUser?.displayName || 'User'} />
      <CategoryTabs onCategorySelect={(category) => setSelectedCategory(category)} />
      <View style={styles.cardContainer}>
        {content[currentCardIndex] && (
          <SwipeableCard
            key={content[currentCardIndex].id.toString()}
            movie={content[currentCardIndex]}
            onSwipeComplete={handleSwipeComplete}
            navigation={navigation}
          />
        )}
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
