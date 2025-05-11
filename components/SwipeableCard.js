import React, { useContext, useState, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MoviesContext } from '../context/MoviesContext';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { addToWatchlist, createMatchDocument } from '../utils/firebaseOperations';


const SwipeableCard = ({ movie, onSwipeComplete }) => {
  const { state, dispatch } = useContext(MoviesContext);
  const swipeableRef = useRef(null);
  const { poster_path, genre_ids = [], type } = movie;
  const navigation = useNavigation();

  // Use secure_base_url from configData and choose appropriate size for poster
  const imageBaseUrl = state.configData.images.secure_base_url;
  const imageSize = 'w780'; // Choose the appropriate image size

  // Construct the full URI for the movie poster image
  const imageUri = poster_path
    ? `${imageBaseUrl}${imageSize}${poster_path}`
    : require('../assets/default_image.jpeg');

  const [swiped, setSwiped] = useState(false); // Update the swiped state

  // Function to check for a match and create a match document
  const checkForMatchAndCreate = async (newWatchlistItem) => {
    const friendsList = state.friends;
    for (const friendId of friendsList) {
      const friendWatchlistRef = collection(db, 'users', friendId, 'watchlist');
      const q = query(
        friendWatchlistRef,
        where('id', '==', newWatchlistItem.id)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // A match is found, create a match document
        await createMatchDocument(
          [auth.currentUser.uid, friendId],
          newWatchlistItem.id,
          newWatchlistItem.type,
          serverTimestamp(),
        );
        console.log('Match found with ${friendId} for title ${newWatchlistItem.id} (type: ${newWatchlistItem.type})');
        break;
      }
    }
  };

  // Modify the handleSwipe function to include match checking
  const handleSwipe = async (direction, cardIndex) => {
    const actionType =
      direction === 'left' ? 'ADD_TO_WATCHLIST' : 'DISLIKE_MOVIE';

    
    dispatch({ type: actionType, payload: movie });

    if (direction === 'left') {
      const newWatchlistItem = { id: movie.id, type: movie.type };

      if (!movie.id || !movie.type) {
        console.error("Movie ID or Type is missing in SwippeableCard, cannot process swipe.", movie);
        Alert.alert("Error", "Could not process this title. Please try another.");
        return;
      }


      await addToWatchlist(auth.currentUser.uid, newWatchlistItem);
      await checkForMatchAndCreate(newWatchlistItem);
    }

    // Dispatch action to update the last index
    const updateActionType =
      movie.type === 'movie'
        ? 'UPDATE_LAST_MOVIE_INDEX'
        : 'UPDATE_LAST_TVSHOW_INDEX';
    dispatch({ type: updateActionType, payload: cardIndex });

    // Close the swipeable card
    setTimeout(() => {
      swipeableRef.current?.close();
      setSwiped(true);
      onSwipeComplete();
    }, 250);
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

    const backgroundColor = direction === 'right' ? '#006600' : '#ff6666';
    const iconName = direction === 'right' ? 'thumb-up' : 'thumb-down';
    const actionText = direction === 'right' ? 'Interested' : 'Not Interested';

    return (
      <View style={[styles.actionContainer, { backgroundColor }]}>
        <Animated.View
          style={[styles.actionContent, { transform: [{ scale }, { rotate }] }]}
        >
          <Icon name={iconName} size={24} color="#fff" style={styles.icon} />
          <Text style={styles.actionText}>{actionText}</Text>
        </Animated.View>
      </View>
    );
  };

  const renderGenres = () => {
    if (genre_ids.length > 0 && state.genres.length > 0) {
      // Map genre IDs to genre names
      const genreNames = genre_ids
        .map((genreId) => {
          const genre = state.genres.find((g) => g.id === genreId);
          return genre ? genre.name : null; // Return null instead of 'Unknown'
        })
        .filter(Boolean); // Filter out null values

      if (genreNames.length > 0) {
        // Check if there are any available genres
        return genreNames.slice(0, 3).map((name, index) => (
          <Text key={index} style={styles.genreSmall}>
            • {name}
            {index !== genreNames.length - 1}
          </Text>
        ));
      }
    }

    return <Text style={styles.genreSmall}>Genres unavailable</Text>;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {!swiped && (
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={(dragX) => renderActions(dragX, 'right')}
          renderRightActions={(dragX) => renderActions(dragX, 'left')}
          onSwipeableOpen={(direction) => handleSwipe(direction, movie.index)}
          friction={2}
          leftThreshold={60}
          rightThreshold={60}
          overshootLeft={false} // Disable overshoot effect on left swipe
          overshootRight={false} // Disable overshoot effect on right swipe
          useNativeAnimations={true} // Use native animations for smoother transitions
        >
          <TouchableWithoutFeedback
            onPress={() =>
              navigation.navigate('Detail', { id: movie.id, type: movie.type })
            }
          >
            <View style={styles.cardContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.poster}
                defaultSource={require('../assets/default_image.jpeg')}
                resizeMode="cover"
              />
              <View style={styles.genreContainer}>{renderGenres()}</View>
            </View>
          </TouchableWithoutFeedback>
        </Swipeable>
      )}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleSwipe('right', movie.index)}
        >
          <Icon name="skip-next" size={25} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleSwipe('left', movie.index)}
        >
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
    width: '90%',
    height: '90%',
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  genreContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 10,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  genreSmall: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'WorkSans-Bold',
    lineHeight: 16,
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
