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
  getDocs,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { MoviesContext } from '../context/MoviesContext';
import { fetchDetailsById } from '../services/api';

const MyCaveScreen = () => {
  const navigation = useNavigation();
  const { state, dispatch } = useContext(MoviesContext);
  const [profileImage, setProfileImage] = useState(
    require('../assets/profile_default.jpg')
  );
  const [headerImage, setHeaderImage] = useState(
    require('../assets/header_default.png')
  );
  const [friendsActivity] = useState([]);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);

  const navigateToProfileEdit = () => {
    navigation.navigate('Profile Setup', { isEditing: true }); // Pass a flag to indicate editing mode
  };

  useEffect(() => {
    // Fetch user profile data
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid); // Reference to the user's document
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
            error
          );
          return null; // Return null for failed requests
        }
      });

      const watchlistWithDetails = (await Promise.all(detailsPromises)).filter(
        Boolean
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
            collection(db, 'users', user.uid, 'watchlist')
          );
          const watchlist = querySnapshot.docs.map((doc) => doc.data());
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

  //  Remove the item from the watchlist and update the state and database
  const handleRemoveFromWatchlist = async (item) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const watchlist = docSnap.data().watchlist;
          const updatedWatchlist = watchlist.filter(
            (watchlistItem) => watchlistItem.id !== item.id
          );
          await updateDoc(userDocRef, {
            watchlist: updatedWatchlist,
          });
          dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: item });
        }
      } catch (error) {
        console.error('Error removing item from watchlist: ', error);
      }
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigation.navigate('Login');
    });
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
              {/* Add remove button */}
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
      {/* Watched Section */}
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
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  loadingIndicator: {
    marginTop: 20,
  },
});

export default MyCaveScreen;
