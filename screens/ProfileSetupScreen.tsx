import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { fetchStreamingServices, type TmdbProvider } from '../services/api';
import type {
  ProfileSetupStackParamList,
  MyCaveStackParamList,
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
}

// Route can be either ProfileSetupInitial (initial flow) or EditProfile
// (from MyCave). Accept either.
type ProfileSetupRoute =
  | RouteProp<ProfileSetupStackParamList, 'ProfileSetupInitial'>
  | RouteProp<MyCaveStackParamList, 'EditProfile'>;

type ProfileSetupNav =
  | StackNavigationProp<ProfileSetupStackParamList, 'ProfileSetupInitial'>
  | StackNavigationProp<MyCaveStackParamList, 'EditProfile'>;

const ProfileSetupScreen = (): React.ReactElement => {
  const route = useRoute<ProfileSetupRoute>();
  const navigation = useNavigation<ProfileSetupNav>();
  // reason: route.params shape differs across the two stacks; `any` is the pragmatic escape here and the read is null-safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isEditMode: boolean = (route.params as any)?.isEditing ?? false;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setError('Failed to load profile data.');
      }
    }
  };

  const handleProfileUpdate = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      setError('No user logged in.');
      return;
    }

    if (!profileName.trim()) {
      setError('Profile Name cannot be empty.');
      return;
    }
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    setError('');

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

      await updateProfile(user, {
        displayName: dataToSave.profileName,
      });

      if (isEditMode) {
        Alert.alert('Success', 'Profile Updated!');
        navigation.goBack();
      } else {
        Alert.alert('Success', 'Profile Setup Complete!');
      }
    } catch (updateError) {
      const msg =
        updateError instanceof Error ? updateError.message : String(updateError);
      console.error('Error updating profile: ', updateError);
      setError(`Failed to update profile: ${msg}`);
      Alert.alert('Error', `Failed to update profile: ${msg}`);
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>
        {isEditMode ? 'Edit Profile' : 'Setup Profile'}
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter a unique username"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Profile Name</Text>
        <TextInput
          style={styles.input}
          value={profileName}
          onChangeText={setProfileName}
          placeholder="How you want to be displayed"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us a bit about yourself"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.fullCatalogContainer}>
        <Text style={styles.fullCatalogLabel}>
          Enable All Services (Full Catalog Access):
        </Text>
        <Switch
          value={fullCatalogAccess}
          onValueChange={setFullCatalogAccess}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={fullCatalogAccess ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      <View style={styles.streamingServicesContainer}>
        <Text style={styles.streamingServicesLabel}>
          My Streaming Services:
        </Text>
        <View style={styles.serviceList}>
          {streamingServicesData.map((service) => (
            <TouchableOpacity
              key={service.provider_id}
              style={[
                styles.serviceItem,
                streamingServices.includes(service.provider_name) &&
                  styles.serviceItemSelected,
              ]}
              onPress={() =>
                handleStreamingServiceChange(service.provider_name)
              }
              disabled={fullCatalogAccess}
            >
              <Image
                source={{ uri: service.logo_url }}
                style={[styles.logo, fullCatalogAccess && styles.disabledItem]}
              />
              <Text
                style={[
                  styles.serviceName,
                  streamingServices.includes(service.provider_name) &&
                    styles.serviceNameSelected,
                  fullCatalogAccess && styles.disabledItem,
                ]}
              >
                {service.provider_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.genresContainer}>
        <Text style={styles.genresLabel}>My Favorite Genres:</Text>
        <View style={styles.genreList}>
          {GENRES.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreItem,
                genres.includes(genre) && styles.genreSelected,
              ]}
              onPress={() => handleGenreChange(genre)}
            >
              <Text
                style={[
                  styles.genreText,
                  genres.includes(genre) && styles.genreTextSelected,
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        onPress={handleProfileUpdate}
        style={styles.updateButton}
      >
        <Text style={styles.updateButtonText}>
          {isEditMode ? 'Save Changes' : 'Complete Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontFamily: 'WorkSans-Bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontFamily: 'WorkSans-SemiBold',
    marginBottom: 8,
    fontSize: 14,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'WorkSans-Regular',
    backgroundColor: '#f9f9f9',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  streamingServicesContainer: {
    marginBottom: 25,
  },
  streamingServicesLabel: {
    fontFamily: 'WorkSans-Bold',
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  serviceItem: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: '1%',
    backgroundColor: '#fff',
  },
  serviceItemSelected: {
    borderColor: 'blue',
    backgroundColor: '#eef4ff',
  },
  logo: {
    width: 45,
    height: 45,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  serviceName: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'WorkSans-Regular',
    color: '#444',
  },
  serviceNameSelected: {
    color: 'blue',
    fontFamily: 'WorkSans-SemiBold',
  },
  disabledItem: {
    opacity: 0.5,
  },
  errorText: {
    color: 'red',
    fontFamily: 'WorkSans-Regular',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 13,
  },
  genresContainer: {
    marginBottom: 25,
  },
  genresLabel: {
    fontFamily: 'WorkSans-Bold',
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  genreItem: {
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: '1%',
    backgroundColor: '#fff',
  },
  genreSelected: {
    borderColor: 'blue',
    backgroundColor: '#eef4ff',
  },
  genreText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'WorkSans-Regular',
    color: '#444',
  },
  genreTextSelected: {
    color: 'blue',
    fontFamily: 'WorkSans-SemiBold',
  },
  fullCatalogContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  fullCatalogLabel: {
    fontFamily: 'WorkSans-SemiBold',
    fontSize: 14,
    color: '#555',
    flexShrink: 1,
    marginRight: 10,
  },
  updateButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'WorkSans-Bold',
  },
});

export default ProfileSetupScreen;
