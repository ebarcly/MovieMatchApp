import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { fetchStreamingServices, type TmdbProvider } from '../services/api';
import { useToast } from '../components/Toast';
import DotLoader from '../components/DotLoader';
import { colors, spacing, radii, typography } from '../theme';
import type {
  ProfileSetupStackParamList,
  MyCaveStackParamList,
  SharedProfileParams,
} from '../navigation/types';

// Dummy data for genres (Consider fetching from a config or API if dynamic)
const GENRES: string[] = [
  'Action',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Thriller',
  'Sci-Fi',
  'Anime',
];

interface UserProfileDocData {
  username?: string;
  profileName?: string;
  bio?: string;
  streamingServices?: string[];
  genres?: string[];
  fullCatalogAccess?: boolean;
  tasteProfile?: unknown;
}

// Route can be either ProfileSetupInitial (initial flow) or EditProfile
// (from MyCave). Both use SharedProfileParams, so `route.params.isEditing`
// is type-safe across both parent stacks.
type ProfileSetupRoute =
  | RouteProp<ProfileSetupStackParamList, 'ProfileSetupInitial'>
  | RouteProp<MyCaveStackParamList, 'EditProfile'>;

type ProfileSetupNav =
  | StackNavigationProp<ProfileSetupStackParamList, 'ProfileSetupInitial'>
  | StackNavigationProp<MyCaveStackParamList, 'EditProfile'>;

const ProfileSetupScreen = (): React.ReactElement => {
  const route = useRoute<ProfileSetupRoute>();
  const navigation = useNavigation<ProfileSetupNav>();
  const params: SharedProfileParams | undefined = route.params;
  const isEditMode: boolean = params?.isEditing ?? false;
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [profileName, setProfileName] = useState('');
  const [bio, setBio] = useState('');
  const [streamingServices, setStreamingServices] = useState<string[]>([]);
  const [streamingServicesData, setStreamingServicesData] = useState<
    TmdbProvider[]
  >([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [fullCatalogAccess, setFullCatalogAccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStreamingServicesData = async (): Promise<void> => {
      try {
        const data = await fetchStreamingServices();
        setStreamingServicesData(data);
      } catch (e) {
        console.error('Error fetching streaming services:', e);
      }
    };

    fetchStreamingServicesData();

    if (isEditMode) {
      fetchUserProfile();
    }
  }, [isEditMode]);

  const fetchUserProfile = async (): Promise<void> => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data() as UserProfileDocData;
          setUsername(userData.username || '');
          setProfileName(userData.profileName || '');
          setBio(userData.bio || '');
          setStreamingServices(userData.streamingServices || []);
          setGenres(userData.genres || []);
          setFullCatalogAccess(userData.fullCatalogAccess || false);
        } else {
          console.log("User document doesn't exist yet.");
        }
      } catch (fetchError) {
        console.error('Error fetching user profile: ', fetchError);
        setError('We could not load your profile. Please try again.');
      }
    }
  };

  const handleProfileUpdate = async (): Promise<void> => {
    if (isSubmitting) return;
    const user = auth.currentUser;
    if (!user) {
      setError('No user logged in.');
      return;
    }

    if (!profileName.trim()) {
      setError('Profile name cannot be empty.');
      return;
    }
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const dataToSave = {
      username: username.trim(),
      profileName: profileName.trim(),
      bio: bio.trim(),
      streamingServices,
      genres,
      fullCatalogAccess,
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        { ...dataToSave, profileLastUpdated: serverTimestamp() },
        { merge: true },
      );

      // Also mirror cross-user-readable fields onto the public profile
      // subcollection (Sprint 5a data-split). Without this, any surface
      // that reads `/users/{uid}/public/profile` — friend cards, match
      // chips, rec compose friend picker, why-you-match prompt — falls
      // back to the uid prefix because the public doc has no displayName.
      // Same merge pattern as the private root; never overwrites
      // contactHashes/tasteLabels/createdAt.
      const publicProfileRef = doc(db, 'users', user.uid, 'public', 'profile');
      await setDoc(
        publicProfileRef,
        {
          displayName: dataToSave.profileName,
          genres: dataToSave.genres,
          streamingServices: dataToSave.streamingServices,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await updateProfile(user, {
        displayName: dataToSave.profileName,
      });

      if (isEditMode) {
        toast.show({
          type: 'success',
          title: 'Profile updated',
          body: 'Your changes are saved.',
        });
        navigation.goBack();
        return;
      }

      // Initial profile-setup flow — if the user does not already have a
      // tasteProfile written, route into the onboarding quiz. Otherwise
      // AppNavigator will advance to Main automatically once the user doc
      // satisfies the profile-complete predicate.
      const snap = await getDoc(userDocRef);
      const hasTaste = Boolean(
        (snap.data() as UserProfileDocData | undefined)?.tasteProfile,
      );
      if (!hasTaste) {
        // reason: ProfileSetupScreen mounts in both ProfileSetupStack and
        // MyCaveStack (as EditProfile); narrowing to the setup stack here
        // because TasteQuiz is only reachable from initial onboarding.
        (
          navigation as unknown as StackNavigationProp<
            ProfileSetupStackParamList,
            'ProfileSetupInitial'
          >
        ).navigate('TasteQuiz');
      }
    } catch (updateError) {
      const msg =
        updateError instanceof Error
          ? updateError.message
          : String(updateError);
      console.error('Error updating profile: ', updateError);
      setError(`We couldn't save your profile: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStreamingServiceChange = (serviceName: string): void => {
    setStreamingServices((prevServices) =>
      prevServices.includes(serviceName)
        ? prevServices.filter((service) => service !== serviceName)
        : [...prevServices, serviceName],
    );
  };

  const handleGenreChange = (genre: string): void => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        {isEditMode ? 'Edit profile' : 'Set up your profile'}
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="A unique handle"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          accessibilityLabel="Username"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Profile name</Text>
        <TextInput
          style={styles.input}
          value={profileName}
          onChangeText={setProfileName}
          placeholder="How you want to be displayed"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Profile name"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="A line or two about you"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          accessibilityLabel="Bio"
        />
      </View>

      <View style={styles.fullCatalogContainer}>
        <Text style={styles.fullCatalogLabel}>Show everything</Text>
        <Switch
          value={fullCatalogAccess}
          onValueChange={setFullCatalogAccess}
          trackColor={{
            false: colors.borderStrong,
            true: colors.accent,
          }}
          thumbColor={
            fullCatalogAccess ? colors.accentForeground : colors.textHigh
          }
          ios_backgroundColor={colors.borderStrong}
          accessibilityLabel="Show everything"
        />
      </View>

      <View style={styles.streamingServicesContainer}>
        <Text style={styles.sectionLabel}>Streaming services</Text>
        <View style={styles.serviceList}>
          {streamingServicesData.map((service) => {
            const selected = streamingServices.includes(service.provider_name);
            return (
              <Pressable
                accessibilityLabel={service.provider_name}
                accessibilityRole="button"
                accessibilityState={{
                  selected,
                  disabled: fullCatalogAccess,
                }}
                key={service.provider_id}
                style={[
                  styles.serviceItem,
                  selected && styles.serviceItemSelected,
                  fullCatalogAccess && styles.disabledItem,
                ]}
                onPress={() =>
                  handleStreamingServiceChange(service.provider_name)
                }
                disabled={fullCatalogAccess}
              >
                <Image source={{ uri: service.logo_url }} style={styles.logo} />
                <Text
                  style={[
                    styles.serviceName,
                    selected && styles.serviceNameSelected,
                  ]}
                  numberOfLines={1}
                >
                  {service.provider_name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.genresContainer}>
        <Text style={styles.sectionLabel}>Favorite genres</Text>
        <View style={styles.genreList}>
          {GENRES.map((genre) => {
            const selected = genres.includes(genre);
            return (
              <Pressable
                accessibilityLabel={genre}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={genre}
                style={[styles.genreItem, selected && styles.genreSelected]}
                onPress={() => handleGenreChange(genre)}
              >
                <Text
                  style={[
                    styles.genreText,
                    selected && styles.genreTextSelected,
                  ]}
                >
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={isEditMode ? 'Save changes' : 'Complete profile'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        onPress={handleProfileUpdate}
        style={({ pressed }) => [
          styles.updateButton,
          pressed && styles.updateButtonPressed,
        ]}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <DotLoader size="sm" accessibilityLabel="Saving profile" />
        ) : (
          <Text style={styles.updateButtonText}>
            {isEditMode ? 'Save changes' : 'Complete profile'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.titleLg,
    marginBottom: spacing.lg,
    textAlign: 'center',
    color: colors.textHigh,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
    color: colors.textBody,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minHeight: 44,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  streamingServicesContainer: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.titleSm,
    marginBottom: spacing.sm,
    color: colors.textHigh,
  },
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xxs,
  },
  serviceItem: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginHorizontal: '1%',
    backgroundColor: colors.surfaceRaised,
    minHeight: 44,
  },
  serviceItemSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  logo: {
    width: 44,
    height: 44,
    marginBottom: spacing.xs,
    resizeMode: 'contain',
  },
  serviceName: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textBody,
  },
  serviceNameSelected: {
    color: colors.accent,
  },
  disabledItem: {
    opacity: 0.4,
  },
  errorBanner: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.textHigh,
  },
  genresContainer: {
    marginBottom: spacing.lg,
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xxs,
  },
  genreItem: {
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: '1%',
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  genreSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  genreText: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textBody,
  },
  genreTextSelected: {
    color: colors.accent,
  },
  fullCatalogContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  fullCatalogLabel: {
    ...typography.label,
    color: colors.textHigh,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  updateButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    minHeight: 52,
  },
  updateButtonPressed: {
    backgroundColor: colors.accentHover,
  },
  updateButtonText: {
    ...typography.button,
    color: colors.accentForeground,
  },
});

export default ProfileSetupScreen;
