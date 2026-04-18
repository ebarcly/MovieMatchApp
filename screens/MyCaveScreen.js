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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

const MyCaveScreen = () => {
  const navigation = useNavigation();
  const { state, dispatch } = useContext(MoviesContext);
  const [profileImage, setProfileImage] = useState(
    require('../assets/profile_default.jpg'),
  );
  const [headerImage, setHeaderImage] = useState(
    require('../assets/header_default.png'),
  );
  const [friendsActivity] = useState([]);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);

  const navigateToProfileEdit = () => {
    navigation.navigate('EditProfile', { isEditing: true });
  };

  useEffect(() => {
    // Fetch user profile data
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnapshot = await getDoc(docRef);
          if (docSnapshot.exists()) {
            setUserData(docSnapshot.data());
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching users: ', error);
        }
      }
    };

    // Fetch movie details for the watchlist
    const fetchWatchlistDetails = async () => {
      const detailsPromises = state.watchlist.map(async (item) => {
        try {
          const details = await fetchDetailsById(item.id, item.type);
          return {
            id: item.id,
            title: details.title || details.name,
            poster_path: details.poster_path,
            type: item.type,
          };
        } catch (error) {
          console.error(
            `Error fetching details for ${item.type} ${item.id}:`,
            error,
          );
          return null;
        }
      });

      const watchlistWithDetails = (await Promise.all(detailsPromises)).filter(
        Boolean,
      );
      dispatch({
        type: 'SET_WATCHLIST_DETAILS',
        payload: watchlistWithDetails,
      });
    };

    const fetchWatchlist = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const querySnapshot = await getDocs(
            collection(db, 'users', user.uid, 'watchlist'),
          );
          const watchlist = querySnapshot.docs.map((d) => d.data());
          dispatch({ type: 'SET_WATCHLIST', payload: watchlist });
        } catch (error) {
          console.error('Error fetching watchlist: ', error);
        }
      }
    };

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchWatchlistDetails(),
        fetchWatchlist(),
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Remove the item from the watchlist.
  // Sprint 2 BUG-4 follow-through: the previous implementation read a
  // `watchlist` array field from the parent user doc and updateDoc'd
  // it back — the split-brain pattern we just closed. Now: delete the
  // single subcollection doc, then dispatch the local removal.
  const handleRemoveFromWatchlist = async (item) => {
    const user = auth.currentUser;
    if (!user || !item?.id) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'watchlist', String(item.id)));
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: item });
    } catch (error) {
      console.error('Error removing item from watchlist: ', error);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  const handleProfileImageChange = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (!pickerResult.canceled) {
      setProfileImage({ uri: pickerResult.uri });
    }
  };

  const handleHeaderImageChange = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (!pickerResult.canceled) {
      setHeaderImage({ uri: pickerResult.uri });
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Image */}
      <TouchableOpacity onPress={handleHeaderImageChange}>
        <Image source={headerImage} style={styles.headerImage} />
      </TouchableOpacity>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleProfileImageChange}>
          <Image source={profileImage} style={styles.profileImage} />
        </TouchableOpacity>
        <Text style={styles.name}>{userData.profileName || 'Enrique'}</Text>
        <Text style={styles.description}>{userData.bio || 'Your Bio'}</Text>
        {/* Genre tags based on user data */}
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
      {/* Watchlist Section */}
      <Section title="Watchlist">
        <FlatList
          data={state.watchlist}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item?.id?.toString()}
          renderItem={({ item }) => (
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
      {/* Friends Activity Section - Needs dynamic data */}
      <Section title="Friends Activity">
        {friendsActivity.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <Image
              source={require('../assets/profile_default.jpg')}
              style={styles.activityUserImage}
            />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>{activity.message}</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
        ))}
      </Section>
      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      {/* Loading Indicator */}
      {loading && <ActivityIndicator style={styles.loadingIndicator} />}
    </ScrollView>
  );
};

const Section = ({ title, children }) => (
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
