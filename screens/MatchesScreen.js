import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { fetchUserMatches } from '../utils/firebaseOperations';
import { auth } from '../firebaseConfig';
import { MoviesContext } from '../context/MoviesContext'; // for context data (if we need)

const MatchesScreen = () => {
  const [matchesList, setMatchesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const { state: moviesState } = useContext(MoviesContext); // for context data (if we need)

  useEffect(() => {
    const loadMatches = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          setLoading(true);
          setError(null);
          const fetchedMatches = await fetchUserMatches(currentUser.uid);
          setMatchesList(fetchedMatches);
        } catch (err) {
          console.error("Failed to load matches on screen:", err);
          setError("Couldn't load your matches. Please try again later.");
          Alert.alert("Error", "Couldn't load your matches.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("Please log in to see your matches.");
        setLoading(false);
      }
    };

    loadMatches();
    // Add a listener for screen focus to refresh matches if user navigate away and back
    const unsubscribe = navigation.addListener('focus', loadMatches);
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading Matches...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (matchesList.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No matches yet! Keep swiping.</Text>
      </View>
    );
  }

  // Temporary render item to just show some data
  const renderMatchItem = ({ item }) => {
    // Identify the other user
    const currentUserUID = auth.currentUser ? auth.currentUser.uid : null;
    const otherUserID = item.userIds.find(uid => uid !== currentUserUID);

    return (
      <View style={styles.matchItem}>
        <Text>Match ID: {item.id}</Text>
        <Text>Matched with: {otherUserID || 'Unknown User'}</Text>
        <Text>Content ID: {item.titleId}</Text>
        <Text>Content Type: {item.titleType}</Text>
        <Text>Status: {item.status}</Text>
        {item.timestamp && <Text>Date: {new Date(item.timestamp.seconds * 1000).toLocaleDateString()}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Matches</Text>
      <FlatList
        data={matchesList}
        renderItem={renderMatchItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No matches found.</Text>} // covered by the check above
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  matchItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  }
});

export default MatchesScreen;
