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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';


const MyCaveScreen = () => {
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState(require('../assets/profile_default.jpg'));
  const [headerImage, setHeaderImage] = useState(require('../assets/header_default.png'));
  const watchlist = useState([]);
  const [friendsActivity, setFriendsActivity] = useState([]);
  const [userData, setUserData] = useState({});

  const navigateToProfileEdit = () => {
    navigation.navigate('Profile Setup', { isEditing: true }); // Pass a flag to indicate editing mode
  };

  useEffect(() => {
    // Fetch user profile data from Firestore
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const querySnapshot = await getDocs(collection(db, 'users'));
          querySnapshot.forEach((doc) => {
            if (doc.id === user.uid) {
              setUserData(doc.data());
            }
          });
        } catch (error) {
          console.error("Error fetching users: ", error);
        }
      }
    };

    // Fetch user profile data initially
    fetchUserProfile();

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
        <TouchableOpacity onPress={handleProfileImageChange}>
          <Image source={profileImage} style={styles.profileImage} />
        </TouchableOpacity>
        <Text style={styles.name}>{userData.profileName || 'Enrique'}</Text>
        <Text style={styles.description}>{userData.bio || 'Your Bio'}</Text>
        {/* Genre tags based on user data */}
        <View style={styles.genreContainer}>
          {userData.genres?.map((genre, index) => (
            <Text key={index} style={styles.genreText}>{genre}</Text>
          ))}
        </View>
        <TouchableOpacity onPress={navigateToProfileEdit} style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </View>
      {/* Watchlist Section - Needs dynamic data */}
      <Section title="Watchlist">
        <FlatList
          data={watchlist}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id} // Add keyExtractor prop
          renderItem={({ item }) => (
            <View key={item.id} style={styles.watchlistItemContainer}>
              <Image source={item.image} style={styles.watchlistItemImage} />
              <Text style={styles.watchlistItemText}>{item.title}</Text>
              <TouchableOpacity style={styles.watchlistEditButton}>
                <Text style={styles.watchlistEditText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </Section>
      {/* Friends Activity Section - Needs dynamic data */}
      <Section title="Friends Activity">
        {friendsActivity.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <Image source={require('../assets/profile_default.jpg')} style={styles.activityUserImage} />
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
    justifyContent: 'center',
    marginBottom: 20,
  },
  genreText: {
    color: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    backgroundColor: '#445', // Update the background color
    borderRadius: 20,
    fontSize: 14,
    overflow: 'hidden',
    fontFamily: 'WorkSans-Regular',
    borderWidth: 1,
    borderColor: '#fff',
  },
  editProfileButton: {
    backgroundColor: '#445',
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
