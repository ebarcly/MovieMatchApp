import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import { doc, getDoc } from "firebase/firestore";


const MyCaveScreen = () => {
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState(require('../assets/profile_default.jpg'));
  const [headerImage, setHeaderImage] = useState(require('../assets/header_default.png'));
  const watchlist = useState([]);
  const [friendsActivity, setFriendsActivity] = useState([]);


  useEffect(() => {
    // Fetch user profile data and set the initial values
    const fetchUserProfile = async () => {
      const userDoc = doc(db, "users", auth.currentUser.uid);
      const userProfile = await getDoc(userDoc);

      if (userProfile.exists()) {
        const { username, profileName, bio, streamingServices } = userProfile.data();
        username(username);
        profileName(profileName);
        setBio(bio);
        streamingServices(streamingServices);
      } else {
        console.log("No such document!");
      }
    };
    // Simulating real-time updates from a database or WebSocket connection
    const fetchFriendsActivity = () => {
      // Replace this with your own logic to fetch friends' activity in real-time
      const activityData = [
        { id: '1', message: 'John watched "The Avengers"' },
        { id: '2', message: 'Sarah added "Inception" to her watchlist' },
        // ...more activity items
      ];
      setFriendsActivity(activityData);
    };

    // Fetch user profile data initially
    fetchUserProfile();

    // Fetch friends' activity initially
    fetchFriendsActivity();

    // Set up a timer to fetch friends' activity periodically
    const timer = setInterval(fetchFriendsActivity, 5000);

    // Clean up the timer when the component is unmounted
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigation.replace('Login');
    });
  };

  const handleProfileImageChange = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        {/* Profile Image */}
        <TouchableOpacity onPress={handleProfileImageChange}>
          <Image source={profileImage} style={styles.profileImage} />
        </TouchableOpacity>
        <Text style={styles.name}>Enrique Barclay</Text>
        <Text style={styles.description}>Waited 28 years to watch Friends...</Text>
        <View style={styles.genreContainer}>
          {/* Genre tags */}
          <Text style={styles.genreText}>Action</Text>
          <Text style={styles.genreText}>Comedy</Text>
          <Text style={styles.genreText}>Drama</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile Setup')} style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </View>
      {/* Watchlist Section */}
      <Section title="Watchlist">
        <FlatList
          horizontal
          data={watchlist}
          renderItem={({ item }) => (
            <View style={styles.watchlistItemContainer}>
              <Image source={item.image} style={styles.watchlistItemImage} />
              <Text style={styles.watchlistItemText}>{item.title}</Text>
              <TouchableOpacity onPress={() => { }} style={styles.watchlistEditButton}>
                <Text style={styles.watchlistEditText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
        />
      </Section>
      {/* Friends Activity Section */}
      <Section title="Friends activity">
        <FlatList
          data={friendsActivity}
          renderItem={({ item }) => (
            <View style={styles.activityItem}>
              <Image source={item.userImage} style={styles.activityUserImage} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{item.message}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            </View>
          )}
          keyExtractor={item => item.id}
        />
      </Section>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
    backgroundColor: '#19192b', // The background color from the mockup
  },
  headerImage: {
    width: '100%',
    height: 300, // Adjust according to the mockup
    resizeMode: 'cover', // Make sure the image covers the area without stretching
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -64, // Adjust as necessary to overlay on the header image
  },
  profileImage: {
    width: 120, // Match the size from the mockup
    height: 120,
    borderRadius: 60, // This should be half the width/height to make the image round
    borderWidth: 4,
    borderColor: '#fff', // White border for profile image
  },
  name: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'WorkSans-Bold',
    marginVertical: 8,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'WorkSans-Regular',
    marginBottom: 20,
  },
  genreContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the genre tags
    marginBottom: 20,
  },
  genreText: {
    color: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent white background
    borderRadius: 20,
    fontSize: 14,
    overflow: 'hidden', // Ensures the background doesn't bleed outside the border radius
  },
  editProfileButton: {
    backgroundColor: '#445', // Dark button background
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 20,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Bold',
  },
  logoutButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center', // Center the logout button
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  section: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontFamily: 'WorkSans-Bold',
  },
  watchlistItemContainer: {
    alignItems: 'center', // Center items vertically
    marginRight: 20,

  },
  watchlistItemImage: {
    width: 100, // Match the size from the mockup
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  watchlistItemText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Bold',
    marginBottom: 8,

  },
  watchlistEditButton: {
    backgroundColor: '#333', // Darker background for the button
    padding: 5,
    borderRadius: 5,
  },
  watchlistEditText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'WorkSans-Bold',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333', // Each activity item has a dark background
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 20,
    marginVertical: 5,
  },
  activityUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'WorkSans-Regular',
  },
  activityTime: {
    color: '#aaa', // Grey color for timestamps
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'WorkSans-Regular',
  },
});

export default MyCaveScreen;
