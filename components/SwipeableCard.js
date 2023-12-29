import React, { useContext, useState } from 'react';
import { View, Image, Text, StyleSheet, Animated, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MoviesContext } from '../context/MoviesContext';
import { useNavigation } from '@react-navigation/native'; 

const SwipeableCard = ({ movie, onSwipeComplete }) => {
  const { state, dispatch } = useContext(MoviesContext); // Use the context
  const swipeableRef = React.useRef(null);  // Create a ref for the Swipeable component
  const { poster_path, genre_ids = [] } = movie;
  const navigation = useNavigation();

  // Use secure_base_url from configData and choose appropriate size for poster
  const imageBaseUrl = state.configData.images.secure_base_url;
  const imageSize = 'w500'; // Choose the appropriate image size from the available options

  // Construct the full URI for the movie poster image
  const imageUri = poster_path ? `${imageBaseUrl}${imageSize}${poster_path}` : require('../assets/default_image.jpeg');

  const [swiped, setSwiped] = useState(false); // Update the swiped state

  const handleSwipe = (direction) => {
    dispatch({ type: direction === 'left' ? 'LIKE_MOVIE' : 'DISLIKE_MOVIE', payload: movie });
    setTimeout(() => {
      swipeableRef.current?.close();
      setSwiped(true); // Update the swiped state to true
      onSwipeComplete(); // Notify parent to load the next card
    }, 250); // Add a delay for user to see the action feedback
  };

  const renderActions = (dragX, direction) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0, 100],
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const rotate = dragX.interpolate({
      inputRange: [-100, 0, 100],
      outputRange: ['-15deg', '0deg', '15deg'],
      extrapolate: 'clamp',
    });

    const backgroundColor = direction === 'left' ? '#006600' : '#ff6666';
    const iconName = direction === 'left' ? 'thumb-up' : 'thumb-down';
    const actionText = direction === 'left' ? 'Interested' : 'Not Interested';

    return (
      <View style={[styles.actionContainer, { backgroundColor }]}>
        <Animated.View style={[styles.actionContent, { transform: [{ scale }, { rotate }] }]}>
          <Icon name={iconName} size={24} color="#fff" style={styles.icon} />
          <Text style={styles.actionText}>{actionText}</Text>
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
          renderLeftActions={(dragX) => renderActions(dragX, 'left')}
          renderRightActions={(dragX) => renderActions(dragX, 'right')}
          onSwipeableOpen={handleSwipe}
          friction={2}
          leftThreshold={60}
          rightThreshold={60}
          overshootLeft={false} // Disable overshoot effect on left swipe
          overshootRight={false} // Disable overshoot effect on right swipe
          useNativeAnimations={true} // Use native animations for smoother transitions
        >
          <TouchableWithoutFeedback onPress={() => navigation.navigate('Detail', { id: movie.id, type: movie.type })}>
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
          </TouchableWithoutFeedback>
        </Swipeable>
      )}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => handleSwipe('right')}>
          <Icon name="skip-next" size={25} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleSwipe('left')}>
          <Icon name="check" size={25} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Watched</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
};

// Styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
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
    flex: 1,
    width: '100%',
    height: '100%',
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  genreContainer: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap', 
    zIndex: 10,
    top: 364,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(48,48,64,0.6)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  genre: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'WorkSans-Bold',
    lineHeight: 18,
    paddingVertical: 2,
    overflow: 'hidden',
    marginHorizontal: 4,
    textAlign: 'center',
    // Add other text style properties
  },
  separator: {
    color: '#fff',
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'WorkSans-Medium',
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
    fontSize: 17,
    fontFamily: 'WorkSans-Light',
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
});

export default SwipeableCard;
