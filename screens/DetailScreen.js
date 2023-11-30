import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { fetchDetailsById } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Make sure to install this package

const DetailScreen = ({ route }) => {
    const { id, type } = route.params;
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await fetchDetailsById(id, type);
                setDetailData(data);
            } catch (e) {
                setError('Unable to fetch details.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, type]);

    if (loading) {
        return <ActivityIndicator size="large" />;
    }

    if (error) {
        return <Text style={styles.errorText}>{error}</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            {detailData && (
                <>
                    {/* Mock video player */}
                    <View style={styles.videoPlayer}>
                        <Image
                            source={{ uri: `https://image.tmdb.org/t/p/w500${detailData.backdrop_path}` }}
                            style={styles.backdropImage}
                        />
                        {/* Overlay Play Button */}
                        <TouchableOpacity style={styles.playButton}>
                            <Icon name="play-circle-outline" size={60} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Movie Information */}
                    <View style={styles.movieInfoContainer}>
                        <Text style={styles.movieTitle}>{detailData.title || detailData.name}</Text>
                        <Text style={styles.movieOverview}>{detailData.overview}</Text>
                        <View style={styles.metaInfo}>
                            <Text style={styles.metaText}>{detailData.vote_average} Rating</Text>
                            <Text style={styles.metaText}>{detailData.genres.map(genre => genre.name).join(' • ')}</Text>
                            <Text style={styles.metaText}>{detailData.runtime || detailData.episode_run_time} min</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity style={styles.likeButton}>
                            <Icon name="thumb-up" size={25} color="#00ff00" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dislikeButton}>
                            <Icon name="thumb-down" size={25} color="#ff0000" />
                        </TouchableOpacity>
                    </View>

                    {/* Cast Carousel */}
                    {detailData.credits && detailData.credits.cast && (
                        <FlatList
                            data={detailData.credits.cast}
                            horizontal
                            renderItem={({ item }) => (
                                <View style={styles.castMemberContainer}>
                                    <Image
                                        source={{ uri: `https://image.tmdb.org/t/p/w500${item.profile_path}` }}
                                        style={styles.castImage}
                                    />
                                    <Text style={styles.castName}>{item.name}</Text>
                                    <Text style={styles.castCharacter}>{item.character}</Text>
                                </View>
                            )}
                            keyExtractor={(item) => item.id.toString()}
                        />
                    )}
                </>
            )}
        </ScrollView>
    );
};

// Define your styles here
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#19192b',
    },
    videoPlayer: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    backdropImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    playButton: {
        // styles for the play button
    },
    movieInfoContainer: {
        padding: 10,
        // other styles
    },
    movieTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        // other styles
    },
    movieOverview: {
        fontSize: 16,
        color: '#FFF',
        // other styles
    },
    metaInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // other styles
    },
    metaText: {
        fontSize: 14,
        color: '#FFF',
        // other styles
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 10,
        // other styles
    },
    likeButton: {
        // styles for like button
    },
    dislikeButton: {
        // styles for dislike button
    },
    castMemberContainer: {
        width: 100,
        marginHorizontal: 5,
        // other styles
    },
    castImage: {
        width: '100%',
        height: 150,
        borderRadius: 75,
        // other styles
    },
    castName: {
        fontSize: 14,
        color: '#FFF',
        textAlign: 'center',
        // other styles
    },
    castCharacter: {
        fontSize: 12,
        color: '#FFF',
        textAlign: 'center',
        // other styles
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        textAlign: 'center',
    },
    // Add other styles as necessary
});

export default DetailScreen;
