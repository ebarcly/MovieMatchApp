import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { auth, firestore } from '../firebaseConfig'; // Import Firestore
import { useNavigation } from '@react-navigation/native';

// Dummy data for streaming services 
const STREAMING_SERVICES = [
  { name: 'Netflix', logo: 'https://imgs.search.brave.com/iMK0bpQOHFE9qAS6J2UI9mfJ97x8nhrepANtIF_PSds/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMuc3RpY2twbmcu/Y29tL2ltYWdlcy81/ODBiNTdmY2Q5OTk2/ZTI0YmM0M2M1Mjku/cG5n' },
  { name: 'Prime Video', logo: 'https://logodownload.org/wp-content/uploads/2018/07/prime-video-logo-0.png' },
  { name: 'Hulu', logo: 'https://logodownload.org/wp-content/uploads/2019/09/hulu-logo-0.png' },
  { name: 'HBO Max', logo: 'https://logodownload.org/wp-content/uploads/2022/12/hbo-max-logo-0.png' },
  { name: 'Disney+', logo: 'https://logodownload.org/wp-content/uploads/2020/11/disney-plus-logo-0.png' },
  { name: 'Apple TV+', logo: 'https://logodownload.org/wp-content/uploads/2023/05/apple-tv-logo-0.png' },
  { name: 'Peacock', logo: 'https://logodownload.org/wp-content/uploads/2022/12/peacock-logo-0.png' },
  { name: 'Paramount+', logo: 'https://logodownload.org/wp-content/uploads/2021/03/paramount-plus-logo-0.png' },
  { name: 'Discovery+', logo: 'https://logodownload.org/wp-content/uploads/2021/11/discovery-plus-logo-0.png' },
  { name: 'Showtime', logo: 'https://logodownload.org/wp-content/uploads/2021/05/showtime-logo-0.png' },
  // Add more services here
];

// Dummy data for genres
const GENRES = ['Action', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Thriller'];


const ProfileSetupScreen = () => {
  const [username, setUsername] = useState('');
  const [profileName, setProfileName] = useState('');
  const [bio, setBio] = useState('');
  const [streamingServices, setStreamingServices] = useState([]);
  const [genres, setGenres] = useState([]);
  const [fullCatalogAccess, setFullCatalogAccess] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userProfile = await firestore.collection('users').doc(user.uid).get();
          if (userProfile.exists()) {
            const { username, profileName, bio, streamingServices, genres, fullCatalogAccess } = userProfile.data();
            setUsername(username || '');
            setProfileName(profileName || '');
            setBio(bio || '');
            setStreamingServices(streamingServices || []);
            setGenres(genres || []);
            setFullCatalogAccess(fullCatalogAccess || false);
          }
        } catch (error) {
          setError(error.message);
        }
      }
    };

    fetchUserProfile();
  }, []);

  const handleProfileUpdate = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await firestore.collection('users').doc(user.uid).update({
          username,
          profileName,
          bio,
          streamingServices,
          genres,
          fullCatalogAccess,
        });
        navigation.navigate('Home');
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleStreamingServiceChange = (service) => {
    setStreamingServices((prev) => 
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
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
      {/* ... */}
      {/* Streaming Services Selection */}
      <View style={styles.streamingServicesContainer}>
        <Text style={styles.streamingServicesLabel}>Streaming Services:</Text>
        <View style={styles.serviceList}>
          {STREAMING_SERVICES.map((service, index) => (
            <TouchableOpacity
              key={service.name}
              style={streamingServices.includes(service.name) ? styles.serviceItemSelected : styles.serviceItem}
              onPress={() => handleStreamingServiceChange(service.name)}
            >
              <Image source={{ uri: service.logo }} style={styles.logo} />
              <Text style={streamingServices.includes(service.name) ? styles.serviceNameSelected : styles.serviceName}>
                {service.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Full Catalog Access Toggle */}
        <View style={styles.fullCatalogContainer}>
          <Text style={styles.fullCatalogLabel}>Access Full Catalog:</Text>
          <Switch
            value={fullCatalogAccess}
            onValueChange={setFullCatalogAccess}
          />
        </View>
      </View>
      {/* Genre Preferences Selection */}
      <View style={styles.genresContainer}>
        <Text style={styles.genresLabel}>Genres:</Text>
        {GENRES.map((genre, index) => (
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
      {error ? <TouchableOpacity style={styles.updateButton} onPress={handleProfileUpdate}>
  <Text style={styles.updateButtonText}>Update Profile</Text>
</TouchableOpacity> : null}
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
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  streamingServicesLabel: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceItem: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  serviceItemSelected: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 20,
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
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  genresLabel: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  genreItem: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  genreSelected: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 5,
    padding: 10,
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
    marginTop: 20,
    alignSelf: 'flex-start',
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
