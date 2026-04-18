import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { fetchUserMatches, type UserMatch } from '../utils/firebaseOperations';
import { auth } from '../firebaseConfig';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabsParamList, 'Matches'>;

const MatchesScreen = ({ navigation }: Props): React.ReactElement => {
  const [matchesList, setMatchesList] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleChatPress = (match: UserMatch): void => {
    // TODO: Implement chat functionality
    Alert.alert('Chat', `Chat with ${match.friend.name} coming soon!`);
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
          setError("Couldn't load your matches. Please try again later.");
          Alert.alert('Error', "Couldn't load your matches.");
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
          <Text style={styles.matchTitle}>
            {item.title.title || item.title.name}
          </Text>
          <Text style={styles.matchText}>
            You and {item.friend.name} both liked this.
          </Text>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleChatPress(item)}
          >
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  matchImagePlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  matchDetails: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  matchText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  chatButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MatchesScreen;
