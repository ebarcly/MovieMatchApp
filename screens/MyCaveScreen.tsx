import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  type ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../firebaseConfig';
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { MoviesContext } from '../context/MoviesContext';
import { fetchDetailsById } from '../services/api';
import { colors, spacing, radii, typography } from '../theme';
import type { MyCaveStackParamList } from '../navigation/types';
import type { WatchlistItem } from '../utils/firebaseOperations';

interface UserProfileData {
  profileName?: string;
  bio?: string;
  genres?: string[];
}

interface FriendActivity {
  id: string;
  message: string;
}

type NavProp = StackNavigationProp<MyCaveStackParamList, 'MyCaveProfile'>;

const MyCaveScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavProp>();
  const { state, dispatch } = useContext(MoviesContext);
  const [profileImage, setProfileImage] = useState<ImageSourcePropType>(
    require('../assets/profile_default.jpg') as ImageSourcePropType,
  );
  const [headerImage, setHeaderImage] = useState<ImageSourcePropType>(
    require('../assets/header_default.png') as ImageSourcePropType,
  );
  const [friendsActivity] = useState<FriendActivity[]>([]);
  const [userData, setUserData] = useState<UserProfileData>({});
  const [loading, setLoading] = useState(true);

  const navigateToProfileEdit = (): void => {
    navigation.navigate('EditProfile', { isEditing: true });
  };

  useEffect(() => {
    const fetchUserProfile = async (): Promise<void> => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnapshot = await getDoc(docRef);
          if (docSnapshot.exists()) {
            setUserData(docSnapshot.data() as UserProfileData);
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching users: ', error);
        }
      }
    };

    const fetchWatchlistDetails = async (): Promise<void> => {
      const detailsPromises = state.watchlist.map(async (item) => {
        try {
          const details = await fetchDetailsById(item.id, item.type);
          const enriched: WatchlistItem = {
            id: item.id,
            type: item.type,
            title: details.title || details.name,
            poster_path: details.poster_path ?? null,
          };
          return enriched;
        } catch (error) {
          console.error(
            `Error fetching details for ${item.type} ${item.id}:`,
            error,
          );
          return null;
        }
      });

      const resolved = await Promise.all(detailsPromises);
      const watchlistWithDetails: WatchlistItem[] = resolved.filter(
        (r): r is WatchlistItem => r !== null,
      );
      dispatch({
        type: 'SET_WATCHLIST_DETAILS',
        payload: watchlistWithDetails,
      });
    };

    const fetchWatchlist = async (): Promise<void> => {
      const user = auth.currentUser;
      if (user) {
        try {
          const querySnapshot = await getDocs(
            collection(db, 'users', user.uid, 'watchlist'),
          );
          const watchlist = querySnapshot.docs.map(
            (d) => d.data() as WatchlistItem,
          );
          dispatch({ type: 'SET_WATCHLIST', payload: watchlist });
        } catch (error) {
          console.error('Error fetching watchlist: ', error);
        }
      }
    };

    const fetchData = async (): Promise<void> => {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchWatchlistDetails(),
        fetchWatchlist(),
      ]);
      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remove the item from the watchlist.
  // Sprint 2 BUG-4 follow-through: the previous implementation read a
  // `watchlist` array field from the parent user doc and updateDoc'd
  // it back — the split-brain pattern we just closed. Now: delete the
  // single subcollection doc, then dispatch the local removal.
  const handleRemoveFromWatchlist = async (
    item: WatchlistItem,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !item?.id) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'watchlist', String(item.id)));
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: { id: item.id } });
    } catch (error) {
      console.error('Error removing item from watchlist: ', error);
    }
  };

  const handleLogout = (): void => {
    auth.signOut();
  };

  const handleProfileImageChange = async (): Promise<void> => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
      setProfileImage({ uri: pickerResult.assets[0].uri });
    }
  };

  const handleHeaderImageChange = async (): Promise<void> => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
      setHeaderImage({ uri: pickerResult.assets[0].uri });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={handleHeaderImageChange}>
        <Image source={headerImage} style={styles.headerImage} />
      </TouchableOpacity>
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleProfileImageChange}>
          <Image source={profileImage} style={styles.profileImage} />
        </TouchableOpacity>
        <Text style={styles.name}>{userData.profileName || 'Enrique'}</Text>
        <Text style={styles.description}>{userData.bio || 'Your Bio'}</Text>
        <View style={styles.genreContainer}>
          {userData.genres?.map((genre, index) => (
            <Text key={index} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
        <TouchableOpacity
          onPress={navigateToProfileEdit}
          style={styles.editProfileButton}
        >
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </View>
      <Section title="Watchlist">
        <FlatList
          data={state.watchlist}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item?.id ?? '')}
          renderItem={({ item }: { item: WatchlistItem }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Detail', { id: item.id, type: item.type })
              }
              style={styles.watchlistItemContainer}
            >
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                }}
                style={styles.watchlistItemImage}
              />
              <TouchableOpacity
                onPress={() => handleRemoveFromWatchlist(item)}
                style={styles.watchlistEditButton}
              >
                <Text style={styles.watchlistEditText}>Remove</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </Section>
      <Section title="Friends Activity">
        {friendsActivity.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <Image
              source={
                require('../assets/profile_default.jpg') as ImageSourcePropType
              }
              style={styles.activityUserImage}
            />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>{activity.message}</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
        ))}
      </Section>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator style={styles.loadingIndicator} />}
    </ScrollView>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section = ({ title, children }: SectionProps): React.ReactElement => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  headerImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -spacing.xxxl,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: radii.pill,
    borderWidth: 4,
    borderColor: colors.ink,
  },
  name: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginVertical: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  genreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  genreText: {
    ...typography.bodySm,
    color: colors.textBody,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.xxs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  editProfileButton: {
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    marginVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  editProfileText: {
    ...typography.button,
    color: colors.textHigh,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.textHigh,
  },
  section: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textHigh,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  watchlistItemContainer: {
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  watchlistItemImage: {
    width: 100,
    height: 150,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  watchlistEditButton: {
    backgroundColor: colors.surface,
    padding: spacing.xxs,
    borderRadius: radii.sm,
  },
  watchlistEditText: {
    ...typography.bodySm,
    color: colors.textBody,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xxs,
  },
  activityUserImage: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...typography.bodySm,
    color: colors.textBody,
  },
  activityTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },
  loadingIndicator: {
    marginTop: spacing.lg,
  },
});

export default MyCaveScreen;
