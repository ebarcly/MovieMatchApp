import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import { fetchStreamingServices } from '../services/api';

// Dummy data for genres
const GENRES = ['Action', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Thriller', 'Sci-Fi', 'Anime'];

const ProfileSetupScreen = ({ route }) => {
  const [username, setUsername] = useState('');
  const [profileName, setProfileName] = useState('');
  const [bio, setBio] = useState('');
  const [streamingServices, setStreamingServices] = useState([]); // New state to store streaming services
  const [streamingServicesData, setStreamingServicesData] = useState([]); // New state to store streaming services data
  const [genres, setGenres] = useState([]);
  const [fullCatalogAccess, setFullCatalogAccess] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(null); // New state to store profile data
  const isEditMode = route.params?.isEditing || false; // Get the flag from the route params
  const navigation = useNavigation();

  useEffect(() => {
    // Fetch streaming services data and logos from TMDB and store in state
    const fetchStreamingServicesData = async () => {
      try {
        const data = await fetchStreamingServices();
        setStreamingServicesData(data);
      } catch (error) {
        console.error('Error fetching streaming services:', error);
      }
    };

    // Fetch streaming services data initially
    fetchStreamingServicesData();

    // Only fetch data if in edit mode
    if (isEditMode) {
      fetchUserProfile();
    }
  }, [isEditMode]);

  useEffect(() => {
    // Update the profile data state whenever the profile data changes
    setProfileData({
      username,
      profileName,
      bio,
      streamingServices,
      genres,
      fullCatalogAccess,
    });
  }, [username, profileName, bio, streamingServices, genres, fullCatalogAccess]);

  const fetchUserProfile = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      querySnapshot.forEach((doc) => {
        if (doc.id === auth.currentUser.uid) {
          const userData = doc.data();
          setUsername(userData.username);
          setProfileName(userData.profileName);
          setBio(userData.bio);
          setStreamingServices(userData.streamingServices);
          setGenres(userData.genres);
          setFullCatalogAccess(userData.fullCatalogAccess);
        }
      });
    } catch (error) {
      console.error("Error fetching users: ", error);
    }
  };

  const handleProfileUpdate = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, profileData); // Use the profileData state variable to update the document

        // Provide feedback and navigate back
        if (isEditMode) {
          alert('Profile Updated!');
          navigation.goBack();
        } else {
          navigation.navigate('Home');
        }
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleStreamingServiceChange = (serviceName) => {
    setStreamingServices(prevServices => {
      if (prevServices.includes(serviceName)) {
        return prevServices.filter(service => service !== serviceName);
      } else {
        return [...prevServices, serviceName];
      }
    });
  };

  const handleGenreChange = (genre) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      {/* Username, Profile Name, and Bio Inputs */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Profile Name</Text>
        <TextInput
          style={styles.input}
          value={profileName}
          onChangeText={setProfileName}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={styles.input}
          value={bio}
          onChangeText={setBio}
          multiline
        />
      </View>
      {/* Streaming Services Selection */}
      <View style={styles.streamingServicesContainer}>
        <Text style={styles.streamingServicesLabel}>My Services:</Text>
        <View style={styles.serviceList}>
          {streamingServicesData.map((service) => (
            <TouchableOpacity
              key={service.provider_id}
              style={streamingServices.includes(service.provider_name) ? styles.serviceItemSelected : styles.serviceItem}
              onPress={() => handleStreamingServiceChange(service.provider_name)}
            >
              <Image source={{ uri: service.logo_url }} style={styles.logo} />
              <Text style={streamingServices.includes(service.provider_name) ? styles.serviceNameSelected : styles.serviceName}>
                {service.provider_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Full Catalog Access Toggle */}
      <View style={styles.fullCatalogContainer}>
        <Text style={styles.fullCatalogLabel}>Access Full Catalog:</Text>
        <Switch
          value={fullCatalogAccess}
          onValueChange={setFullCatalogAccess}
        />
      </View>
      {/* Genre Preferences Selection */}
      <View style={styles.genresContainer}>
        <Text style={styles.genresLabel}>Genres:</Text>
        <View style={styles.genreList}>
          {GENRES.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={genres.includes(genre) ? styles.genreSelected : styles.genreItem}
              onPress={() => handleGenreChange(genre)}
            >
              <Text style={genres.includes(genre) ? styles.genreTextSelected : styles.genreText}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity onPress={handleProfileUpdate} style={styles.updateButton}>
        <Text style={styles.updateButtonText}>Update Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Add styles for the new components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },
  streamingServicesContainer: {
    marginBottom: 20,
  },
  streamingServicesLabel: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Added to create two columns
  },
  serviceItem: {
    width: '48%', // Added to create two columns
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  serviceItemSelected: {
    width: '48%', // Added to create two columns
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 5,
    padding: 10,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  serviceName: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'WorkSans-Regular',
  },
  serviceNameSelected: {
    fontSize: 12,
    textAlign: 'center',
    color: 'blue',
    fontFamily: 'WorkSans-Bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  genresContainer: {
    marginBottom: 20,
  },
  genresLabel: {
    fontFamily: 'WorkSans-Bold',
    marginBottom: 10,
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Added to create two columns
  },
  genreItem: {
    width: '48%', // Added to create two columns
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
  },
  genreSelected: {
    width: '48%', // Added to create two columns
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 5,
    padding: 12,
  },
  genreText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'WorkSans-Regular',
  },
  genreTextSelected: {
    fontSize: 12,
    textAlign: 'center',
    color: 'blue',
    fontFamily: 'WorkSans-Bold',
  },
  fullCatalogContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fullCatalogLabel: {
    fontWeight: 'bold',
    marginRight: 10,
  },
  updateButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 48,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileSetupScreen;
