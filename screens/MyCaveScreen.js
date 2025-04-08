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
  Alert, // Import Alert
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
  deleteDoc, // Import deleteDoc for removing items
} from 'firebase/firestore';
import { MoviesContext } from '../context/MoviesContext';
import { fetchDetailsById } from '../services/api';

// Default images (consider moving to an assets index file)
const defaultProfileImage = require('../assets/profile_default.jpg');
const defaultHeaderImage = require('../assets/header_default.png');

const MyCaveScreen = () => {
  const navigation = useNavigation();
  const { state, dispatch } = useContext(MoviesContext);
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [headerImage, setHeaderImage] = useState(defaultHeaderImage);
  const [friendsActivity] = useState([]); // Placeholder for friends activity
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [watchlistDetails, setWatchlistDetails] = useState([]); // Local state for detailed watchlist

  // --- Navigation ---
  const navigateToProfileEdit = () => {
    // *** FIX: Navigate to the screen named "EditProfile" within the current stack ***
    navigation.navigate('EditProfile', { isEditing: true });
  };

  // --- Data Fetching ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
        setLoading(false);
        // Optionally navigate to login or show an error
        console.log("No user found, cannot fetch data for MyCaveScreen");
        return;
    }

    // Listener for real-time profile updates (Optional but good UX)
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = getDoc(userDocRef).then(docSnapshot => {
         if (docSnapshot.exists()) {
            setUserData(docSnapshot.data());
          } else {
            console.log('User document does not exist!');
            // Handle case where user exists in Auth but not Firestore? Maybe force profile setup?
          }
    }).catch(error => {
        console.error('Error fetching initial user profile: ', error);
    });


    // Fetch watchlist IDs first
    const fetchWatchlistIds = async () => {
      try {
        const watchlistColRef = collection(db, 'users', user.uid, 'watchlist');
        const querySnapshot = await getDocs(watchlistColRef);
        // Assuming each doc ID is the movie/show ID and data contains { id, type }
        const watchlistIds = querySnapshot.docs.map(doc => ({
             docId: doc.id, // Keep Firestore doc ID for deletion
             ...doc.data() // Should contain { id, type }
            }));
        return watchlistIds;
      } catch (error) {
        console.error('Error fetching watchlist IDs: ', error);
        return [];
      }
    };

    // Fetch details based on IDs
    const fetchWatchlistDetails = async (watchlistIds) => {
       if (!watchlistIds || watchlistIds.length === 0) {
           setWatchlistDetails([]); // Clear details if watchlist is empty
           return;
       }
      const detailsPromises = watchlistIds.map(async (item) => {
        try {
           // Ensure item has id and type before fetching
           if (!item.id || !item.type) {
               console.warn("Watchlist item missing id or type:", item);
               return null;
           }
          const details = await fetchDetailsById(item.id, item.type);
          return {
            ...item, // Include original item data (like docId)
            title: details.title || details.name,
            poster_path: details.poster_path,
          };
        } catch (error) {
          console.error(`Error fetching details for ${item.type} ${item.id}:`, error);
          return null; // Keep original item data even if details fail? Maybe return item itself?
        }
      });

      const results = (await Promise.all(detailsPromises)).filter(Boolean);
      setWatchlistDetails(results); // Update local state with detailed watchlist
    };

    // Chain the fetches
    const loadData = async () => {
        setLoading(true);
        // Profile is fetched above via listener/initial fetch
        const ids = await fetchWatchlistIds();
        await fetchWatchlistDetails(ids);
        setLoading(false);
    };

    loadData();

    // Cleanup listener if you implement one
    // return () => unsubscribeProfile();

  }, []); // Run once on mount


  // --- Actions ---

  // Remove item from watchlist
  const handleRemoveFromWatchlist = async (itemToRemove) => {
    const user = auth.currentUser;
    if (!user || !itemToRemove?.docId) {
        Alert.alert("Error", "Could not remove item. User not found or item invalid.");
        return;
    }

    Alert.alert(
        "Confirm Removal",
        `Are you sure you want to remove "${itemToRemove.title}" from your watchlist?`,
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    try {
                        const itemDocRef = doc(db, 'users', user.uid, 'watchlist', itemToRemove.docId);
                        await deleteDoc(itemDocRef);

                        // Update local state immediately for better UX
                        setWatchlistDetails(prevDetails =>
                            prevDetails.filter(item => item.docId !== itemToRemove.docId)
                        );
                        // Optionally dispatch to global context if needed elsewhere simultaneously
                        // dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: { id: itemToRemove.id } });

                        Alert.alert("Success", `"${itemToRemove.title}" removed from watchlist.`);
                    } catch (error) {
                        console.error('Error removing item from watchlist Firestore: ', error);
                        Alert.alert("Error", "Could not remove item from watchlist.");
                    }
                }
            }
        ]
    );
  };

  // Logout
  const handleLogout = () => {
    auth.signOut().catch(error => {
        console.error("Sign out error", error);
        Alert.alert("Error", "Could not sign out.");
    });
    // AppNavigator will handle navigation to Login via onAuthStateChanged
  };

  // Image Picking Logic (Keep as is, but consider adding upload logic)
  const handleProfileImageChange = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Optional: allow editing
        aspect: [1, 1], // Optional: force square aspect ratio
        quality: 0.8, // Optional: compress image
    });
    if (!pickerResult.canceled) {
      setProfileImage({ uri: pickerResult.assets[0].uri });
      // TODO: Add logic to upload image to storage (e.g., Firebase Storage)
      // and update the user's profileImageURL in Firestore/Auth profile.
    }
  };

  const handleHeaderImageChange = async () => {
     const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }
     const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Example aspect ratio for header
        quality: 0.8,
     });
    if (!pickerResult.canceled) {
      setHeaderImage({ uri: pickerResult.assets[0].uri });
       // TODO: Add logic to upload image to storage
       // and update the user's headerImageURL in Firestore.
    }
  };

  // --- Render ---

  // Render item for Watchlist FlatList
  const renderWatchlistItem = ({ item }) => (
     <View style={styles.watchlistItemContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Detail', { id: item.id, type: item.type })}>
            <Image
                source={item.poster_path ? { uri: `https://image.tmdb.org/t/p/w342${item.poster_path}` } : require('../assets/poster_placeholder.png')} // Add placeholder
                style={styles.watchlistItemImage}
                resizeMode="cover"
            />
        </TouchableOpacity>
        <TouchableOpacity
            onPress={() => handleRemoveFromWatchlist(item)}
            style={styles.watchlistRemoveButton} // Changed style name for clarity
        >
            <Text style={styles.watchlistRemoveButtonText}>X</Text>
        </TouchableOpacity>
    </View>
  );

  // Show loading indicator while fetching
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Image */}
      <TouchableOpacity onPress={handleHeaderImageChange}>
        <Image source={headerImage} style={styles.headerImage} />
      </TouchableOpacity>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleProfileImageChange}>
          {/* Use profileImage state, fallback to default */}
          <Image source={profileImage} style={styles.profileImage} />
        </TouchableOpacity>
        {/* Use userData from state */}
        <Text style={styles.name}>{userData?.profileName || 'User Name'}</Text>
        <Text style={styles.description}>{userData?.bio || 'User Bio'}</Text>
        <View style={styles.genreContainer}>
          {userData?.genres?.length > 0 ? (
             userData.genres.map((genre, index) => (
                <View key={index} style={styles.genrePill}>
                    <Text style={styles.genreText}>{genre}</Text>
                </View>
            ))
          ) : (
             <Text style={styles.noDataText}>No genres selected</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={navigateToProfileEdit} // Calls the fixed navigation function
          style={styles.editProfileButton}
        >
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      {/* Watchlist Section */}
      <Section title="Watchlist">
         {watchlistDetails.length > 0 ? (
             <FlatList
                data={watchlistDetails}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.docId} // Use Firestore docId as key
                renderItem={renderWatchlistItem}
                contentContainerStyle={styles.listContentContainer} // Add padding
            />
         ) : (
            <Text style={styles.noDataTextInSection}>Your watchlist is empty.</Text>
         )}
      </Section>

      {/* Watched Section (Placeholder) */}
       <Section title="Watched">
           <Text style={styles.noDataTextInSection}>Watched items coming soon.</Text>
       </Section>


      {/* Friends Activity Section (Placeholder) */}
      <Section title="Friends Activity">
         {friendsActivity.length > 0 ? (
             friendsActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                {/* ... activity item structure ... */}
              </View>
            ))
         ) : (
             <Text style={styles.noDataTextInSection}>No friend activity yet.</Text>
         )}
      </Section>

      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

// Section Component (Helper)
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// --- Styles --- (Includes refinements)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#19192b',
  },
  loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  headerImage: {
    width: '100%',
    height: 250, // Adjusted height
    resizeMode: 'cover',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -70, // Adjusted overlap
    paddingBottom: 20, // Add padding at the bottom of the section
  },
  profileImage: {
    width: 140, // Slightly larger
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#555', // Background color while loading/if no image
  },
  name: {
    fontSize: 26, // Larger name
    color: '#fff',
    fontFamily: 'WorkSans-Bold',
    marginTop: 15, // Increased margin
    marginBottom: 5,
  },
  description: {
    fontSize: 15,
    color: '#ccc', // Lighter color for bio
    fontFamily: 'WorkSans-Regular',
    textAlign: 'center',
    paddingHorizontal: 30, // Add horizontal padding
    marginBottom: 15,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow genres to wrap
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 15, // Padding for the container
  },
   genrePill: { // Changed from genreText for clarity
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent background
    borderRadius: 15, // Pill shape
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4, // Margin around each pill
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Subtle border
  },
  genreText: {
    color: '#eee', // Lighter genre text
    fontSize: 13,
    fontFamily: 'WorkSans-Regular',
  },
  editProfileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent button
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 10, // Adjusted margin
  },
  editProfileText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'WorkSans-SemiBold', // Use SemiBold
  },
  logoutButton: {
    backgroundColor: '#e74c3c', // A less harsh red
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 20, // Add margin top
    marginBottom: 40, // Increased bottom margin
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'WorkSans-Bold',
  },
  section: {
    marginTop: 15, // Adjusted spacing
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20, // Slightly larger section title
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 15, // Increased margin bottom
    fontFamily: 'WorkSans-Bold',
  },
   listContentContainer: {
    paddingHorizontal: 20, // Add padding to the start/end of the list
    paddingVertical: 5,
  },
  watchlistItemContainer: {
    marginRight: 15, // Spacing between items
    position: 'relative', // Needed for absolute positioning of the remove button
  },
  watchlistItemImage: {
    width: 110, // Adjusted size
    height: 165,
    borderRadius: 8,
    backgroundColor: '#333', // Placeholder background
  },
  watchlistRemoveButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark semi-transparent background
    borderRadius: 15, // Make it round
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  watchlistRemoveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 18, // Adjust for vertical centering
  },
  noDataText: {
      color: '#aaa',
      fontFamily: 'WorkSans-Regular',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 5,
  },
   noDataTextInSection: {
      color: '#aaa',
      fontFamily: 'WorkSans-Regular',
      fontSize: 14,
      paddingHorizontal: 20, // Align with section title padding
      marginTop: 5,
  },
  // Styles for Activity Section (if implemented)
  activityItem: { /* ... */ },
  activityUserImage: { /* ... */ },
  activityContent: { /* ... */ },
  activityText: { /* ... */ },
  activityTime: { /* ... */ },
});

export default MyCaveScreen;
