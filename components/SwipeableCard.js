import React, { useContext } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MoviesContext } from '../context/MoviesContext'; // Import the context

const SwipeableCard = ({ movie }) => {
  const { state, dispatch } = useContext(MoviesContext); // Use the context
  const { posterPath, title, genres = [] } = movie;
  const imageBaseUrl = state.configData?.images?.secure_base_url || '';
  const imageUri = posterPath ? { uri: `${imageBaseUrl}${posterPath}` } : require('../assets/default_image.jpeg');

  const handleSwipe = (direction) => {
    // Dispatch an action based on the swipe direction
    dispatch({ type: direction === 'left' ? 'DISLIKE_MOVIE' : 'LIKE_MOVIE', payload: movie });
  };

  const renderLeftActions = () => (
    <View style={styles.leftAction}>
      <Icon name="thumb-down" size={25} color="#fff" />
      <Text style={styles.actionText}>Not Interested</Text>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.rightAction}>
      <Icon name="thumb-up" size={25} color="#fff" />
      <Text style={styles.actionText}>Want to Watch</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => handleSwipe(direction)}
      >
        <View style={styles.cardContainer}>
          <Image
            source={imageUri}
            style={styles.poster}
            defaultSource={require('../assets/default_image.jpeg')}
          />
          <View style={styles.textContainer}>
            {title ? (
              <>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.genres}>{genres.join(' • ')}</Text>
              </>
            ) : (
              <Text style={styles.title}>Movie information unavailable</Text>
            )}
          </View>
        </View>
      </Swipeable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Ensures the root view takes up full space for gestures
  },
  cardContainer: {
    borderRadius: 20,
    backgroundColor: '#1e2031',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  poster: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  genres: {
    color: '#fff',
    fontSize: 14,
  },
  leftAction: {
    // Styles for left swipe action
  },
  rightAction: {
    // Styles for right swipe action
  },
  actionText: {
    color: '#fff',
    // Additional styles for action text
  },
});

export default SwipeableCard;
