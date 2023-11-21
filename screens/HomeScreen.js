import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import SwipeableCard from '../components/SwipeableCard';
import NavigationBar from '../components/NavigationBar';
import CategoryTabs from '../components/CategoryTabs';

const HomeScreen = () => {
  const username = 'User';
  const movies = mockMovies; // Replace with data from context or API in the future

  return (
    <ScrollView style={styles.container}>
      <NavigationBar username={username} />
      <CategoryTabs />
      <View style={styles.cardContainer}>
        {movies.map(movie => (
          <SwipeableCard key={movie.id} movie={movie} />
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
