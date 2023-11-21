import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';
import { fetchPopularMovies } from '../services/api'; // Importing the API call

const HomeScreen = () => {
  const username = 'User';
  const [movies, setMovies] = useState([]); // State to hold movie data
  const [loading, setLoading] = useState(true); // State to manage loading status

  useEffect(() => {
    // Fetch popular movies when the component mounts
    const loadMovies = async () => {
      try {
        const data = await fetchPopularMovies();
        setMovies(data);
      } catch (error) {
        console.error('Failed to fetch movies:', error);
      } finally {
        setLoading(false); // Hide loading indicator regardless of success/failure
      }
    };

    loadMovies();
  }, []);

  if (loading) {
    // Render a loading indicator while the API call is in progress
    return <ActivityIndicator size="large" color="#00ff00" />;
  }

  return (
    <ScrollView style={styles.container}>
      <NavigationBar username={username} />
      <CategoryTabs />
      <View style={styles.cardContainer}>
        {movies.map((movie) => (
          <SwipeableCard key={movie.id.toString()} movie={movie} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#19192b',
  },
  cardContainer: {
    alignItems: 'center', // Center the cards horizontally
    padding: 16, // Add padding for spacing around cards
  },
});

export default HomeScreen;
