import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  FlatList,
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
  onSnapshot,
} from 'firebase/firestore';
import { MoviesContext } from '../context/MoviesContext';
import { fetchDetailsById } from '../services/api';
import Avatar from '../components/Avatar';
import DotLoader from '../components/DotLoader';
import { useToast } from '../components/Toast';
import {
  uploadProfileImage,
  ProfileImageError,
} from '../utils/profileImageUpload';
import { colors, spacing, radii, typography, shadows } from '../theme';
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
  const toast = useToast();
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [headerImage, setHeaderImage] = useState<ImageSourcePropType>(
    require('../assets/header_default.png') as ImageSourcePropType,
  );
  const [friendsActivity] = useState<FriendActivity[]>([]);
  const [userData, setUserData] = useState<UserProfileData>({});
  const [loading, setLoading] = useState(true);

  // Sprint 5a follow-up: photoURL now lives on /users/{uid}/public/profile,
  // not on the private root doc. Subscribe so uploads from ProfilePhotoScreen
  // reflect here without a manual refresh.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    const publicRef = doc(db, 'users', user.uid, 'public', 'profile');
    const unsub = onSnapshot(publicRef, (snap) => {
      const data = snap.data() as { photoURL?: string } | undefined;
      setPhotoURL(data?.photoURL ?? null);
    });
    return () => unsub();
  }, []);

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
    const user = auth.currentUser;
    if (!user) return;
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      toast.show({
        type: 'error',
        title: 'Permission needed',
        body: 'Grant camera-roll access in Settings to change your photo.',
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    const asset = pickerResult.assets?.[0];
    if (pickerResult.canceled || !asset?.uri) return;

    setPhotoUploading(true);
    try {
      await uploadProfileImage(user.uid, {
        localUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        sizeBytes: asset.fileSize ?? 0,
      });
      // onSnapshot above will update photoURL once Firestore writes.
      toast.show({
        type: 'success',
        title: 'Photo updated',
        body: 'Your new profile picture is live.',
      });
    } catch (err) {
      const body =
        err instanceof ProfileImageError && err.kind === 'too-large'
          ? 'Image too large — pick one under 2 MB.'
          : err instanceof ProfileImageError && err.kind === 'bad-mime'
            ? 'Only JPEG or PNG images are supported.'
            : 'Upload failed. Check your connection and try again.';
      toast.show({ type: 'error', title: 'Upload failed', body });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleHeaderImageChange = async (): Promise<void> => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      toast.show({
        type: 'error',
        title: 'Permission needed',
        body: 'Grant camera-roll access in Settings to change your cover.',
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
      setHeaderImage({ uri: pickerResult.assets[0].uri });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Pressable
        onPress={handleHeaderImageChange}
        accessibilityRole="button"
        accessibilityLabel="Change cover image"
      >
        <Image source={headerImage} style={styles.headerImage} />
        {/* Sprint 4 fix: gradient/ink scrim over the header edge so the
            seam between the cover image and the profile section reads
            as a cohesive dark surface instead of a hard band. */}
        <View style={styles.headerScrim} pointerEvents="none" />
      </Pressable>
      <View style={styles.profileSection}>
        <Pressable
          onPress={handleProfileImageChange}
          accessibilityRole="button"
          accessibilityLabel="Change profile picture"
          accessibilityState={{ disabled: photoUploading }}
          disabled={photoUploading}
          style={styles.profileImageWrapper}
        >
          <Avatar
            photoURL={photoURL}
            displayName={userData.profileName ?? null}
            size="xl"
            style={styles.profileImage}
          />
          {photoUploading ? (
            <View
              style={styles.profileImageOverlay}
              pointerEvents="none"
              accessibilityLiveRegion="polite"
            >
              <DotLoader size="md" accessibilityLabel="Uploading photo" />
            </View>
          ) : null}
        </Pressable>
        <Text style={styles.name}>{userData.profileName || 'Your Name'}</Text>
        <Text style={styles.description}>
          {userData.bio || 'Your bio — a line or two.'}
        </Text>
        <View style={styles.genreContainer}>
          {userData.genres?.map((genre, index) => (
            <Text key={index} style={styles.genreText}>
              {genre}
            </Text>
          ))}
        </View>
        <Pressable
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
          onPress={navigateToProfileEdit}
          style={({ pressed }) => [
            styles.editProfileButton,
            pressed && styles.editProfilePressed,
          ]}
        >
          <Text style={styles.editProfileText}>Edit profile</Text>
        </Pressable>
      </View>
      <Section title="Watchlist">
        <FlatList
          data={state.watchlist}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item?.id ?? '')}
          renderItem={({ item }: { item: WatchlistItem }) => (
            <Pressable
              accessibilityLabel={`Open ${item.title || item.name || 'title'} details`}
              accessibilityRole="button"
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
              <Pressable
                accessibilityLabel={`Remove ${item.title || item.name || 'title'} from watchlist`}
                accessibilityRole="button"
                onPress={() => handleRemoveFromWatchlist(item)}
                style={styles.watchlistEditButton}
              >
                <Text style={styles.watchlistEditText}>Remove</Text>
              </Pressable>
            </Pressable>
          )}
        />
      </Section>
      <Section title="Friends activity">
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
      <Pressable
        accessibilityLabel="Log out"
        accessibilityRole="button"
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}
      >
        <Text style={styles.logoutButtonText}>Log out</Text>
      </Pressable>
      {loading ? (
        <View style={styles.loadingIndicator}>
          <DotLoader size="md" accessibilityLabel="Loading your cave" />
        </View>
      ) : null}
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
  headerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: colors.ink,
    opacity: 0.55,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -spacing.xxxl,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    borderWidth: 4,
    borderColor: colors.ink,
  },
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,18,0.55)',
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
    minHeight: 44,
    justifyContent: 'center',
  },
  editProfilePressed: {
    opacity: 0.85,
  },
  editProfileText: {
    ...typography.button,
    color: colors.textHigh,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    ...shadows.sm,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.error,
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
