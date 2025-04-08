import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert, // Use Alert for feedback
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth"; // Import updateProfile for auth object
import { auth, db } from "../firebaseConfig";
import { fetchStreamingServices } from "../services/api";

// Dummy data for genres (Consider fetching from a config or API if dynamic)
const GENRES = [
  "Action", "Comedy", "Drama", "Fantasy", "Horror", "Mystery",
  "Romance", "Thriller", "Sci-Fi", "Anime",
];

// Ensure route and route.params exist before accessing them
const ProfileSetupScreen = ({ route }) => {
  // Default isEditMode to false if route or route.params is undefined
  const isEditMode = route?.params?.isEditing ?? false;

  const [username, setUsername] = useState("");
  const [profileName, setProfileName] = useState(""); // This likely corresponds to displayName
  const [bio, setBio] = useState("");
  const [streamingServices, setStreamingServices] = useState([]);
  const [streamingServicesData, setStreamingServicesData] = useState([]);
  const [genres, setGenres] = useState([]);
  const [fullCatalogAccess, setFullCatalogAccess] = useState(false);
  const [error, setError] = useState("");
  // Removed profileData state as we can build the object directly on update
  const navigation = useNavigation();

  useEffect(() => {
    const fetchStreamingServicesData = async () => {
      try {
        const data = await fetchStreamingServices();
        setStreamingServicesData(data);
      } catch (error) {
        console.error("Error fetching streaming services:", error);
        // Optionally set an error state for the user
      }
    };

    fetchStreamingServicesData();

    if (isEditMode) {
      fetchUserProfile();
    }
    // If NOT in edit mode, maybe pre-fill username/profileName from auth if available?
    // else {
    //   const user = auth.currentUser;
    //   if (user) {
    //      setUsername(user.email || ''); // Example prefill
    //      setProfileName(user.displayName || '');
    //   }
    // }

  }, [isEditMode]); // Depend only on isEditMode for fetching profile

  const fetchUserProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUsername(userData.username || ''); // Use default empty string
          setProfileName(userData.profileName || ''); // This should map to displayName
          setBio(userData.bio || '');
          setStreamingServices(userData.streamingServices || []);
          setGenres(userData.genres || []);
          setFullCatalogAccess(userData.fullCatalogAccess || false);
        } else {
          console.log("User document doesn't exist yet.");
          // Pre-fill from auth object if desired
          // setUsername(user.email || '');
          // setProfileName(user.displayName || '');
        }
      } catch (fetchError) {
        console.error("Error fetching user profile: ", fetchError);
        setError("Failed to load profile data.");
      }
    }
  };

  const handleProfileUpdate = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("No user logged in.");
      return;
    }

    // Basic validation example
    if (!profileName.trim()) {
       setError("Profile Name cannot be empty.");
       return;
    }
     if (!username.trim()) {
       setError("Username cannot be empty.");
       return;
    }

    setError(""); // Clear previous errors

    // Construct the data object to save
    const dataToSave = {
      username: username.trim(),
      profileName: profileName.trim(), // This should be the displayName
      bio: bio.trim(),
      streamingServices,
      genres,
      fullCatalogAccess,
      // Add/update any other relevant fields like profileLastUpdated timestamp
      // profileLastUpdated: serverTimestamp(), // Import serverTimestamp from 'firebase/firestore'
    };

    try {
      // 1. Update Firestore document
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, dataToSave);

      // 2. Update the Firebase Auth user profile (especially displayName)
      // This helps ensure onAuthStateChanged picks up the change faster
      await updateProfile(user, {
        displayName: dataToSave.profileName,
        // photoURL: "some_photo_url" // If you add profile pictures
      });

      // 3. Handle navigation/feedback
      if (isEditMode) {
        Alert.alert("Success", "Profile Updated!");
        navigation.goBack();
      } else {
        // *** NO NAVIGATION NEEDED HERE ***
        // AppNavigator's onAuthStateChanged will detect the updated user
        // (specifically the displayName) and automatically switch the view
        // to MainAppTabs. You might show a brief success message if desired.
         Alert.alert("Success", "Profile Setup Complete!");
        // Optionally, you could disable the button here to prevent double submission
      }
    } catch (updateError) {
      console.error("Error updating profile: ", updateError);
      setError(`Failed to update profile: ${updateError.message}`);
       Alert.alert("Error", `Failed to update profile: ${updateError.message}`);
    }
  };

  // --- Handlers for selections ---
  const handleStreamingServiceChange = (serviceName) => {
    setStreamingServices((prevServices) =>
      prevServices.includes(serviceName)
        ? prevServices.filter((service) => service !== serviceName)
        : [...prevServices, serviceName]
    );
  };

  const handleGenreChange = (genre) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // --- Render Logic ---
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{isEditMode ? "Edit Profile" : "Setup Profile"}</Text>

      {/* Input Fields */}
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
          style={[styles.input, styles.bioInput]} // Style for multiline
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us a bit about yourself"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Full Catalog Toggle */}
      <View style={styles.fullCatalogContainer}>
        <Text style={styles.fullCatalogLabel}>Enable All Services (Full Catalog Access):</Text>
        <Switch
          value={fullCatalogAccess}
          onValueChange={setFullCatalogAccess}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={fullCatalogAccess ? "#f5dd4b" : "#f4f3f4"}
        />
      </View>

      {/* Streaming Services Selection (Conditionally disable if full access is on?) */}
      <View style={styles.streamingServicesContainer}>
        <Text style={styles.streamingServicesLabel}>My Streaming Services:</Text>
        <View style={styles.serviceList}>
          {streamingServicesData.map((service) => (
            <TouchableOpacity
              key={service.provider_id}
              style={[
                styles.serviceItem, // Base style
                streamingServices.includes(service.provider_name) && styles.serviceItemSelected // Selected style
              ]}
              onPress={() => handleStreamingServiceChange(service.provider_name)}
              disabled={fullCatalogAccess} // Disable if full access is toggled
            >
              <Image
                source={{ uri: service.logo_url }}
                style={[styles.logo, fullCatalogAccess && styles.disabledItem]} // Dim if disabled
              />
              <Text
                 style={[
                    styles.serviceName, // Base text style
                    streamingServices.includes(service.provider_name) && styles.serviceNameSelected, // Selected text style
                    fullCatalogAccess && styles.disabledItem // Dim if disabled
                 ]}
              >
                {service.provider_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Genre Preferences Selection */}
      <View style={styles.genresContainer}>
        <Text style={styles.genresLabel}>My Favorite Genres:</Text>
        <View style={styles.genreList}>
          {GENRES.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreItem, // Base style
                genres.includes(genre) && styles.genreSelected // Selected style
              ]}
              onPress={() => handleGenreChange(genre)}
            >
              <Text
                style={[
                  styles.genreText, // Base text style
                  genres.includes(genre) && styles.genreTextSelected // Selected text style
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Error Message Display */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Update Button */}
      <TouchableOpacity
        onPress={handleProfileUpdate}
        style={styles.updateButton}
      >
        <Text style={styles.updateButtonText}>
           {isEditMode ? "Save Changes" : "Complete Profile"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// --- Styles ---
// (Styles remain largely the same, added a few minor tweaks below)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff', // Add a background color
  },
  title: {
    fontSize: 24,
    fontFamily: "WorkSans-Bold", // Use loaded font
    marginBottom: 25,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15, // Slightly reduced margin
  },
  label: {
    fontFamily: "WorkSans-SemiBold", // Use loaded font
    marginBottom: 8,
    fontSize: 14,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc', // Lighter border
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8, // More rounded corners
    fontSize: 14,
    fontFamily: "WorkSans-Regular",
    backgroundColor: '#f9f9f9', // Slight off-white background
  },
  bioInput: {
    height: 80, // Explicit height for multiline
    textAlignVertical: 'top', // Start text from top
  },
  streamingServicesContainer: {
    marginBottom: 25,
  },
  streamingServicesLabel: {
    fontFamily: "WorkSans-Bold",
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  serviceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    // justifyContent: "space-between", // Let items flow naturally
    marginHorizontal: -5, // Counteract item padding
  },
  serviceItem: {
    width: "48%",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd", // Lighter border
    borderRadius: 8,
    padding: 10,
    marginHorizontal: '1%', // Add horizontal margin
    backgroundColor: '#fff',
  },
  serviceItemSelected: {
     borderColor: "blue", // Keep blue border for selected
     backgroundColor: '#eef4ff', // Light blue background when selected
  },
  logo: {
    width: 45, // Slightly smaller logo
    height: 45,
    marginBottom: 8,
    resizeMode: "contain",
  },
  serviceName: {
    fontSize: 11, // Slightly smaller text
    textAlign: "center",
    fontFamily: "WorkSans-Regular",
    color: '#444',
  },
  serviceNameSelected: {
    color: "blue",
    fontFamily: "WorkSans-SemiBold", // Use SemiBold for selected
  },
  disabledItem: {
    opacity: 0.5, // Dim disabled items
  },
  errorText: {
    color: "red",
    fontFamily: "WorkSans-Regular",
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 13,
  },
  genresContainer: {
    marginBottom: 25,
  },
  genresLabel: {
    fontFamily: "WorkSans-Bold",
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  genreList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  genreItem: {
    // width: "48%", // Adjust width based on content? Or keep fixed.
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 15, // Pill shape
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: '1%',
    backgroundColor: '#fff',
  },
  genreSelected: {
    borderColor: "blue",
    backgroundColor: '#eef4ff',
  },
  genreText: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "WorkSans-Regular",
    color: '#444',
  },
  genreTextSelected: {
    color: "blue",
    fontFamily: "WorkSans-SemiBold",
  },
  fullCatalogContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between', // Space out label and switch
    marginBottom: 25,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  fullCatalogLabel: {
    fontFamily: "WorkSans-SemiBold",
    fontSize: 14,
    color: '#555',
    flexShrink: 1, // Allow text to wrap if needed
    marginRight: 10,
  },
  updateButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 14, // Larger padding
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10, // Add some space above
    marginBottom: 40, // Ensure it's above keyboard etc.
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "WorkSans-Bold",
  },
});

export default ProfileSetupScreen;
