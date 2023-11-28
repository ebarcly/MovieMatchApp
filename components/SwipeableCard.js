import React, { useContext, useState } from 'react';
import { View, Image, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
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

  const [swiped, setSwiped] = useState(false); // Update the swiped state

  const handleSwipe = (direction) => {
    dispatch({ type: direction === 'left' ? 'DISLIKE_MOVIE' : 'LIKE_MOVIE', payload: movie });
    setTimeout(() => {
      swipeableRef.current?.close();
      setSwiped(true); // Update the swiped state to true
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
          <Icon name="thumb-down" size={25} color="#fff" style={styles.icon} />
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
          <Icon name="thumb-up" size={25} color="#fff" style={styles.icon} />
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
          leftThreshold={60} 
          rightThreshold={60} 
          overshootLeft={false} // Disable overshoot effect on left swipe
          overshootRight={false} // Disable overshoot effect on right swipe
          useNativeAnimations={true} // Use native animations for smoother transition
        >
          <View style={styles.cardContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.poster}
              defaultSource={require('../assets/default_image.png')}
              resizeMode='cover'
            />
            <View style={styles.genreContainer}>
              {renderGenres()}
            </View>
          </View>
        </Swipeable>
      )}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => handleSwipe('left')}>
          <Icon name="skip-next" size={25} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleSwipe('right')}>
          <Icon name="check" size={25} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Watched</Text>
        </TouchableOpacity>
      </View>
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
    top: 364,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  genre: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Bold',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    zIndex: 100,
  },
  button: {
    backgroundColor: '#19196b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 148,
    borderRadius: 24,
    flexDirection: 'row',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Regular',
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
});

export default SwipeableCard;
const handleSwipe = (direction) => {
  dispatch({ type: direction === 'left' ? 'DISLIKE_MOVIE' : 'LIKE_MOVIE', payload: movie });
  setTimeout(() => {
    swipeableRef?.current?.close();
    setSwiped(true); // Update the swiped state to true
    onSwipeComplete(); // Notify parent to load the next card
  }, 500); // Add a delay for user to see the action feedback

  // Animate the card
  Animated.timing(swipeableRef?.current, {
    toValue: direction === 'left' ? -500 : 500,
    duration: 300,
    useNativeDriver: true,
  }).start();
};
