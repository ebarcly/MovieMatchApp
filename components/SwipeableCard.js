import React, { useContext, useState } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MoviesContext } from '../context/MoviesContext'; // Import the context

const SwipeableCard = ({ movie, onSwipeComplete }) => {
  const { state, dispatch } = useContext(MoviesContext); // Use the context
  const swipeableRef = React.useRef(null);  // Create a ref for the Swipeable component
  const { poster_path, genre_ids = [] } = movie;

  // Use secure_base_url from configData and choose appropriate size for poster
  const imageBaseUrl = state.configData.images.secure_base_url;
  const imageSize = 'w500'; // Choose the appropriate image size from the available options

  // Construct the full URI for the movie poster image
  const imageUri = poster_path ? `${imageBaseUrl}${imageSize}${poster_path}` : require('../assets/default_image.jpeg');

  const [swiped] = useState(false);

  const handleSwipe = (direction) => {
    dispatch({ type: direction === 'left' ? 'DISLIKE_MOVIE' : 'LIKE_MOVIE', payload: movie });
    setTimeout(() => {
      swipeableRef.current?.close();
      onSwipeComplete(); // Notify parent to load the next card
    }, 500); // Add a delay for user to see the action feedback
  };

  const renderLeftActions = (_, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const translateX = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftAction}>
        <Animated.View style={[styles.actionContent, { transform: [{ scale }, { translateX }] }]}>
          <Icon name="thumb-down" size={25} color="#fff" />
          <Text style={styles.actionText}>Not Interested</Text>
        </Animated.View>
      </View>
    );
  };

  const renderRightActions = (_, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const translateX = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, -100],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightAction}>
        <Animated.View style={[styles.actionContent, { transform: [{ scale }, { translateX }] }]}>
          <Icon name="thumb-up" size={25} color="#fff" />
          <Text style={styles.actionText}>Want to Watch</Text>
        </Animated.View>
      </View>
    );
  };

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
      {!swiped && (
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={renderLeftActions}
          renderRightActions={renderRightActions}
          onSwipeableOpen={handleSwipe}
          friction={2}
          leftThreshold={80}
          rightThreshold={80}
          overshootLeft={false} // Disable overshoot effect on left swipe
          overshootRight={false} // Disable overshoot effect on right swipe
          useNativeAnimations={true} // Use native animations for smoother transition
        >
          <View style={styles.cardContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.poster}
              defaultSource={require('../assets/default_image.jpeg')}
              resizeMode='cover'
            />
            <View style={styles.genreContainer}>
              {renderGenres()}
            </View>
          </View>
        </Swipeable>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    zIndex: 2,
    top: 358,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  genre: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Medium',
    lineHeight: 18,
    paddingVertical: 4,
    overflow: 'hidden',
    marginHorizontal: 4,
    textAlign: 'center',
    // Add other text style properties
  },
  separator: {
    color: '#fff',
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    zIndex: 0,
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    zIndex: 0,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Medium',
    zIndex: 10,
    marginLeft: 8,
  },
});

export default SwipeableCard;
