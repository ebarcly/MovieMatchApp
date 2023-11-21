import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';
import { fetchPopularMovies } from '../services/api'; // Importing the API call

const HomeScreen = () => {
  const username = 'User';
  const [movies, setMovies] = useState(null); // Initialize to null to check if movies have been loaded
  const [loading, setLoading] = useState(true); // State to manage loading status
  const [error, setError] = useState(''); // State to hold any error messages

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const data = await fetchPopularMovies();
        if (data.results) {
          setMovies(data.results); // Make sure to set the state with the array of movies
        } else {
          setError('No movies data found'); // Set an error message if no movies
        }
      } catch (error) {
        console.error('Failed to fetch movies:', error);
        setError('Failed to fetch movies'); // Set an error message on failure
      } finally {
        setLoading(false); // Hide loading indicator regardless of success/failure
      }
    };

    loadMovies();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#00ff00" />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>; // Render error message if there is an error
  }

  if (!movies) {
    return <Text style={styles.errorText}>Movies are currently unavailable.</Text>; // Render a message if movies is null
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
});

export default HomeScreen;
