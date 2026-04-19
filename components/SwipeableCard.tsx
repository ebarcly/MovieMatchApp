import React, { useContext, useState, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  TouchableWithoutFeedback,
  type ImageSourcePropType,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';
import {
  SkipForward,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { MoviesContext, type MovieItem } from '../context/MoviesContext';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  addToWatchlist,
  createMatchDocument,
  recordTitleInteraction,
  type TitleType,
  type WatchlistItem,
} from '../utils/firebaseOperations';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography, shadows } from '../theme';

export type SwipeDirection = 'accept' | 'reject';

export interface SwipeableCardMovie extends MovieItem {
  id: number;
  type: TitleType;
  poster_path?: string | null;
  genre_ids?: number[];
  index?: number;
}

export interface SwipeableCardProps {
  movie: SwipeableCardMovie;
  onSwipeComplete: () => void;
}

type NavProp = StackNavigationProp<HomeStackParamList, 'Home'>;

const SwipeableCard = ({
  movie,
  onSwipeComplete,
}: SwipeableCardProps): React.ReactElement => {
  const { state, dispatch } = useContext(MoviesContext);
  const swipeableRef = useRef<Swipeable | null>(null);
  const { poster_path, genre_ids = [] } = movie;
  const navigation = useNavigation<NavProp>();

  // Use secure_base_url from configData and choose appropriate size for poster
  const imageBaseUrl = state.configData.images?.secure_base_url ?? '';
  const imageSize = 'w780';

  const imageUri: string | ImageSourcePropType = poster_path
    ? `${imageBaseUrl}${imageSize}${poster_path}`
    : (require('../assets/default_image.jpeg') as ImageSourcePropType);

  const [swiped, setSwiped] = useState(false);

  // Function to check for a match and create a match document
  const checkForMatchAndCreate = async (
    newWatchlistItem: WatchlistItem,
  ): Promise<void> => {
    const friendsList = state.friends;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    for (const friendId of friendsList) {
      const friendWatchlistRef = collection(db, 'users', friendId, 'watchlist');
      console.log(
        `SWIPEABLE_CARD: Checking friend ${friendId}. newWatchlistItem.id is: ${
          newWatchlistItem.id
        } (type: ${typeof newWatchlistItem.id})`,
      );
      const q = query(
        friendWatchlistRef,
        where('id', '==', newWatchlistItem.id),
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.log(
          "SWIPEABLE_CARD: Friend's watchlist contains the item. About to create match.",
        );
        await createMatchDocument(
          [currentUser.uid, friendId],
          newWatchlistItem.id,
          newWatchlistItem.type,
        );
        console.log(
          `Match found with ${friendId} for title ${newWatchlistItem.id} (type: ${newWatchlistItem.type})`,
        );
        break;
      } else {
        console.log(
          'SWIPEABLE_CARD: Friend',
          friendId,
          'does NOT have item',
          newWatchlistItem.id,
          'in their watchlist subcollection.',
        );
      }
    }
  };

  // Sprint 2 BUG-1 convention: `direction` carries semantic intent, not
  // a raw gesture axis. We pass one of:
  //   'accept' — user wants this title (physical swipe right, Watched
  //              button, or leftActions panel opened by Swipeable)
  //   'reject' — user does not want this title (physical swipe left,
  //              Skip button, or rightActions panel)
  // The previous code leaked gesture-handler's inverse 'left'/'right'
  // ("opened which panel?") into business logic and inverted Skip vs
  // Watched. Keeping semantics at this boundary prevents the
  // regression.
  const handleSwipe = async (
    direction: SwipeDirection,
    cardIndex: number,
  ): Promise<void> => {
    const isLikeAction = direction === 'accept';
    const localDispatchActionType = isLikeAction
      ? 'ADD_TO_WATCHLIST'
      : 'DISLIKE_MOVIE';

    if (isLikeAction) {
      const watchlistItem: WatchlistItem = {
        id: movie.id,
        type: movie.type,
        poster_path: movie.poster_path ?? null,
      };
      dispatch({ type: 'ADD_TO_WATCHLIST', payload: watchlistItem });
    } else {
      dispatch({ type: 'DISLIKE_MOVIE', payload: movie });
    }
    void localDispatchActionType; // Retain semantic variable for log parity.

    const interactionAction = isLikeAction ? 'liked' : 'disliked_or_skipped';
    if (auth.currentUser && movie.id && movie.type) {
      await recordTitleInteraction(
        auth.currentUser.uid,
        movie.id,
        movie.type,
        interactionAction,
      );
    } else {
      console.warn(
        'Cannot record interaction: missing user, movie.id, or movie.type',
      );
    }

    if (isLikeAction) {
      if (!movie.id || !movie.type) {
        console.error(
          'Movie ID or Type is missing in SwipeableCard, cannot process swipe.',
          movie,
        );
        return;
      }
      const newWatchlistItem: WatchlistItem = {
        id: movie.id,
        type: movie.type,
        poster_path: movie.poster_path ?? null,
      };
      const currentUser = auth.currentUser;
      if (currentUser) {
        await addToWatchlist(currentUser.uid, newWatchlistItem);
        await checkForMatchAndCreate(newWatchlistItem);
      }
    }

    const updateContextIndexActionType =
      movie.type === 'movie'
        ? 'UPDATE_LAST_MOVIE_INDEX'
        : 'UPDATE_LAST_TVSHOW_INDEX';
    dispatch({ type: updateContextIndexActionType, payload: cardIndex });

    // Sprint 4: haptic on swipe-commit — one of the 4 sanctioned
    // haptic events (dopamine brief Rule #7). Fires on the visual peak
    // (post-dispatch) so haptic-visual delay stays <30ms.
    void Haptics.impactAsync(
      isLikeAction
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );

    setTimeout(() => {
      swipeableRef.current?.close();
      setSwiped(true);
      onSwipeComplete();
    }, 250);
  };

  const renderActions = (
    dragX: Animated.AnimatedInterpolation<number>,
    direction: 'left' | 'right',
  ): React.ReactElement => {
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

    // Sprint 4: keep green/red semantics (universal convention per
    // mobile-UX brief) but source from `colors.success` / `colors.error`
    // so a palette tweak can shift them without a raw-hex hunt.
    const backgroundColor =
      direction === 'right' ? colors.success : colors.error;
    const ActionIcon = direction === 'right' ? ThumbsUp : ThumbsDown;
    const actionText = direction === 'right' ? 'Interested' : 'Not Interested';

    return (
      <View style={[styles.actionContainer, { backgroundColor }]}>
        <Animated.View
          style={[styles.actionContent, { transform: [{ scale }, { rotate }] }]}
        >
          <ActionIcon
            size={28}
            color={colors.accentForeground}
            weight="fill"
            style={styles.icon}
          />
          <Text style={styles.actionText}>{actionText}</Text>
        </Animated.View>
      </View>
    );
  };

  const renderGenres = (): React.ReactNode => {
    if (genre_ids.length > 0 && state.genres.length > 0) {
      const genreNames = genre_ids
        .map((genreId) => {
          const genre = state.genres.find((g) => g.id === genreId);
          return genre ? genre.name : null;
        })
        .filter((n): n is string => Boolean(n));

      if (genreNames.length > 0) {
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

  const cardIndex: number = movie.index ?? 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      {!swiped && (
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={(dragX) => renderActions(dragX, 'right')}
          renderRightActions={(dragX) => renderActions(dragX, 'left')}
          onSwipeableOpen={(direction) =>
            // Gesture Handler passes 'left' when the left-actions panel
            // opens (i.e. user dragged card to the RIGHT = accept) and
            // 'right' when the right-actions panel opens (drag left =
            // reject). Translate to our semantic intent vocabulary.
            handleSwipe(direction === 'left' ? 'accept' : 'reject', cardIndex)
          }
          friction={2}
          leftThreshold={60}
          rightThreshold={60}
          overshootLeft={false}
          overshootRight={false}
          useNativeAnimations
        >
          <TouchableWithoutFeedback
            onPress={() =>
              navigation.navigate('Detail', { id: movie.id, type: movie.type })
            }
          >
            <View style={styles.cardContainer}>
              <Image
                source={
                  typeof imageUri === 'string' ? { uri: imageUri } : imageUri
                }
                style={styles.poster}
                defaultSource={
                  require('../assets/default_image.jpeg') as number
                }
                resizeMode="cover"
              />
              <View style={styles.genreContainer}>{renderGenres()}</View>
            </View>
          </TouchableWithoutFeedback>
        </Swipeable>
      )}
      <View style={styles.buttonContainer}>
        <Pressable
          accessibilityLabel="Skip"
          accessibilityHint="Skips this title without adding it to your watchlist"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            styles.buttonSkip,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleSwipe('reject', cardIndex)}
        >
          <SkipForward
            size={20}
            color={colors.textHigh}
            weight="bold"
            style={styles.icon}
          />
          <Text style={styles.buttonSkipText}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Watched"
          accessibilityHint="Adds this title to your watchlist"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            styles.buttonAccept,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleSwipe('accept', cardIndex)}
        >
          <Check
            size={20}
            color={colors.accentForeground}
            weight="bold"
            style={styles.icon}
          />
          <Text style={styles.buttonAcceptText}>Watched</Text>
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cardContainer: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
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
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 10,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.sm,
  },
  genreSmall: {
    ...typography.caption,
    color: colors.textHigh,
    marginHorizontal: spacing.xxs,
    textAlign: 'center',
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.xl,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  actionText: {
    ...typography.titleSm,
    color: colors.accentForeground,
    marginLeft: spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    zIndex: 100,
  },
  button: {
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 132,
    minHeight: 44,
    flexDirection: 'row',
  },
  buttonSkip: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonAccept: {
    backgroundColor: colors.accent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonSkipText: {
    ...typography.button,
    color: colors.textHigh,
    marginLeft: spacing.xs,
  },
  buttonAcceptText: {
    ...typography.button,
    color: colors.accentForeground,
    marginLeft: spacing.xs,
  },
  icon: {
    marginRight: spacing.xxs,
  },
});

export default SwipeableCard;
