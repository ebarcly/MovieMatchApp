import React, { useContext } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MoviesContext } from '../context/MoviesContext'; // Import the context

const SwipeableCard = ({ movie }) => {
  const { state, dispatch } = useContext(MoviesContext); // Use the context
  const { poster_path, genre_ids = [] } = movie;

  // Use secure_base_url from configData and choose appropriate size for poster
  const imageBaseUrl = state.configData.images.secure_base_url;
  const imageSize = 'w500'; // Choose the appropriate image size from the available options

  // Construct the full URI for the movie poster image
  const imageUri = poster_path ? `${imageBaseUrl}${imageSize}${poster_path}` : require('../assets/default_image.jpeg');

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

  const renderGenres = () => {
    if (genre_ids.length > 0 && state.genres.length > 0) {
      // Map genre IDs to genre names
      const genreNames = genre_ids.map(genreId => {
        const genre = state.genres.find(g => g.id === genreId);
        return genre ? genre.name : 'Unknown';
      });
      return genreNames.slice(0, 3).map((name, index) => (
        <Text key={index} style={styles.genre}>
          {name}
          {index !== genreNames.length - 1 && <Text style={styles.separator}> • </Text>}
        </Text>
      ));
    } else {
      return <Text style={styles.genre}>Genres unavailable</Text>;
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => handleSwipe(direction)}
      >
        <View style={styles.cardContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.poster}
            defaultSource={require('../assets/default_image.jpeg')}
            resizeMode='cover'
          />
          <View style={styles.gradientContainer}>
            <View style={styles.gradient} />
          </View>
          <View style={styles.genreContainer}>
            {renderGenres()}
          </View>
        </View>
      </Swipeable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    backgroundColor: '#1e2031',
    overflow: 'hidden',
    marginBottom: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Add other styles such as shadow, etc.
  },
  gradientContainer: {
    position: 'absolute',
    top: 440,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  gradient: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Adjust the opacity and color as desired
  },
  poster: {
    width: 348,
    height: 496,
    borderRadius: 12,
    backfaceVisibility: 'hidden',
  },
  genreContainer: {
    position: 'absolute',
    flexDirection: 'row', // Lay out genres in a row
    flexWrap: 'wrap', // Wrap to the next line if necessary
    zIndex: 1,
    top: 448,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genre: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Medium',
    lineHeight: 18,
    paddingVertical: 4,
    borderRadius: 15,
    overflow: 'hidden',
    marginHorizontal: 4,
    textAlign: 'center',
    // Add other text style properties
  },
  separator: {
    color: '#fff',
    fontSize: 16,
    // Add other text style properties
  },
  leftAction: {
    // Add styles for left swipe action
  },
  rightAction: {
    // Add styles for right swipe action
  },
  actionText: {
    color: '#fff',
    // Add other text style properties
  },
});

export default SwipeableCard;