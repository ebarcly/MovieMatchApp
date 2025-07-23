import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import SwipeableCard from "../components/SwipeableCard";
import NavigationBar from "../components/NavigationBar";
import CategoryTabs from "../components/CategoryTabs";
import {
  fetchPopularMovies,
  fetchPopularTVShows,
  fetchMoviesByServices,
  fetchTVShowsByServices,
  fetchTrendingContent,
  mapServiceNamesToIds,
} from "../services/api";
import { auth, db } from "../firebaseConfig";
import { MoviesContext } from "../context/MoviesContext";
import { fetchInteractedTitleIds } from "../utils/firebaseOperations";

const HomeScreen = ({ navigation }) => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TV Shows");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const { state, dispatch } = useContext(MoviesContext);

  const fetchUserPreferences = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      setError("Failed to load user preferences. Please check your internet connection.");
      return null;
    }
  };

  const fetchContentBasedOnCategory = async (category) => {
    setLoading(true);
    setError(""); // Just to clear prev errors
    try {
      const userPrefs = await fetchUserPreferences();
      const { streamingServices, fullCatalogAccess } = userPrefs || {};

      let rawData = [];
      if (category === "All") {
        rawData = await fetchTrendingContent("all", "day");
      } else if (fullCatalogAccess) {
        rawData =
          category === "Movies"
            ? await fetchPopularMovies()
            : await fetchPopularTVShows();
      } else if (streamingServices && streamingServices.length > 0) {
        const serviceIds = await mapServiceNamesToIds(streamingServices);
        rawData =
          category === "Movies"
            ? await fetchMoviesByServices(serviceIds)
            : await fetchTVShowsByServices(serviceIds);
      } else {
        rawData =
          category === "Movies"
            ? await fetchPopularMovies()
            : await fetchPopularTVShows();
      }

      let filteredData = [...rawData];

      if (auth.currentUser && rawData.length > 0) {
        const interactedIds = await fetchInteractedTitleIds(auth.currentUser.uid);
        if (interactedIds.length > 0) {
          filteredData = rawData.filter(item => !interactedIds.includes(item.id));
          console.log(`Filtered deck: ${rawData.length} raw -> ${filteredData.length} after removing interacted.`);
        }
    }
    
    // what to do if ALL items are filtered out? Fetch more? Show a message? --- needs research 
    if (filteredData.length === 0 && rawData.length > 0) {
      console.log("All fetched items were previously interacted with. Consider fetching more or showing a message.");
      // maybe fetch the next "page" from TMDB and repeat filtering?
      // Or just show a message: "No new content based on your filters and interactions."
      // maybe show the raw data to avoid getting stuck:
      // setContent(rawData);
      setContent([]); // for now, "no new content" if all filtered
      setError("No new content to show. Try changing categories or come back later!");

    } else {
      setContent(filteredData);
    }

    // Reset card index when category changes or new content is loaded
    // persist index per category per user, this logic needs to be more advanced
    const initialIndexForCategory = category === "Movies" ? state.lastMovieIndex : state.lastTVShowIndex;
    // If filteredData has fewer items than the stored index, reset to 0
    setCurrentCardIndex(filteredData.length > 0 && initialIndexForCategory < filteredData.length ? initialIndexForCategory : 0);

  } catch (e) {
    console.error(`Failed to fetch ${category.toLowerCase()}:`, e);
    setError(`Failed to fetch ${category.toLowerCase()}: ${e.message}`);
    setContent([]); // Clear content on error
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchContentBasedOnCategory(selectedCategory);
  }, [selectedCategory]);

  const handleSwipeComplete = useCallback(() => {
    const newIndex = Math.min(currentCardIndex + 1, content.length - 1);
    setCurrentCardIndex(newIndex);

    // Dispatch action to update the index in context
    const actionType =
      selectedCategory === "Movies"
        ? "UPDATE_LAST_MOVIE_INDEX"
        : "UPDATE_LAST_TVSHOW_INDEX";
    dispatch({ type: actionType, payload: newIndex });
  }, [currentCardIndex, content.length, selectedCategory, dispatch]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (content.length === 0) {
    return (
      <Text style={styles.errorText}>
        No content available for your selection.
      </Text>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <NavigationBar profileName={auth.currentUser?.profileName} />
      <CategoryTabs onCategorySelect={setSelectedCategory} />
      <View style={styles.cardContainer}>
        {content.slice(currentCardIndex, currentCardIndex + 1).map((item) => (
          <SwipeableCard
            key={item.id.toString()}
            movie={item}
            onSwipeComplete={handleSwipeComplete}
            navigation={navigation}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  cardContainer: {
    alignItems: "center",
    padding: 16,
    flex: 1,
  },
  errorText: {
    color: "red",
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
});

export default HomeScreen;
