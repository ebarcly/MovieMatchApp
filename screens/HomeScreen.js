import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';
import { fetchPopularMovies, fetchPopularTVShows } from '../services/api'; // Ensure you have the fetchPopularTVShows API call implemented

const HomeScreen = ({ navigation }) => { // Add navigation as a prop
  const username = 'Enrique';
  const [content, setContent] = useState([]); // This will store either movies or TV shows based on selection
  const [loading, setLoading] = useState(true); // State to manage loading status
  const [error, setError] = useState(''); // State to hold any error messages
  const [selectedCategory, setSelectedCategory] = useState('Movies'); // Start with 'Movies' as default
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // State to keep track of the current card index
  const [isRefreshing, setIsRefreshing] = useState(false); // State to manage pull-to-refresh

  // Fetch content based on the selected category
  const fetchContent = useCallback(async () => {
    if (!isRefreshing) setIsRefreshing(true); // If refresh is triggered, set isRefreshing to true
    try {
      let data;
      if (selectedCategory === 'Movies') {
        data = await fetchPopularMovies();
        data.results = data.results.map(item => ({ ...item, type: 'movie' })); // Set type property to 'movie'
      } else if (selectedCategory === 'TV Shows') {
        data = await fetchPopularTVShows();
        data.results = data.results.map(item => ({ ...item, type: 'tv' })); // Set type property to 'tvshow'
      } else {
        // Handle other categories as needed
        data = { results: [] };
      }
      setContent(data.results);
      setCurrentCardIndex(0); // Reset the current card index to 0
      setIsRefreshing(false); // If refresh is successful, set isRefreshing to false
    } catch (e) {
      setError(`Failed to fetch ${selectedCategory.toLowerCase()}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

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
    return <Text style={styles.errorText}>Content is currently unavailable.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <NavigationBar username={username} />
      <CategoryTabs onCategorySelect={(category) => setSelectedCategory(category)} />
      <View style={styles.cardContainer}>
        {content.slice(currentCardIndex, currentCardIndex + 1).map((item) => (
          <SwipeableCard key={item.id.toString()} movie={item} onSwipeComplete={handleSwipeComplete} navigation={navigation} /> // Pass navigation as a prop
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
