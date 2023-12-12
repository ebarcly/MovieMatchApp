import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, FlatList, Linking } from 'react-native';
import { fetchDetailsById } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';

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

const handlePlayTrailer = () => {
    if (detailData && detailData.videos && detailData.videos.results.length > 0) {
        // Filter for a video that has type 'Trailer'
        const trailer = detailData.videos.results.find(video => video.type === 'Trailer');

        if (trailer) {
            const trailerKey = trailer.key;
            const youtubeURL = `https://www.youtube.com/watch?v=${trailerKey}`;
            Linking.openURL(youtubeURL);
        } else {
            // Handle the scenario where no trailer is available
            alert('Trailer not available');
        }
    }
};


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
                    {/* Video Player */}
                    <TouchableOpacity onPress={handlePlayTrailer}>
                        <View style={styles.videoPlayer}>
                            <WebView
                                source={{ uri: `https://www.youtube.com/embed/${detailData.videos.results[0].key}` }}
                                style={styles.video}
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Movie Information */}
                    <View style={styles.movieInfoContainer}>
                        <Text style={styles.movieTitle}>
                            {detailData.title || detailData.name} ({type === 'tv' ? detailData.first_air_date && detailData.first_air_date.substring(0, 4) : detailData.release_date && detailData.release_date.substring(0, 4)})
                            {detailData.certifications && (
                                <Text style={styles.certifications}>{detailData.certifications}</Text>
                            )}
                        </Text>
                        {detailData.providers && (
                            <>
                                {['flatrate', 'rent', 'buy'].map((category) => (
                                    detailData.providers[category] && detailData.providers[category].length > 0 && (
                                        <View key={category} style={styles.providersContainer}>
                                            <Text style={styles.providerCategoryTitle}>{category.toUpperCase()}</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {detailData.providers[category].slice(0, 2).map((provider) => (
                                                    <View style={styles.providerText} key={provider.provider_id}>
                                                        {provider.logo_path && (
                                                            <Image
                                                                source={{ uri: `https://image.tmdb.org/t/p/w500${provider.logo_path}` }}
                                                                style={styles.providerLogo}
                                                            />
                                                        )}
                                                        <Text style={styles.providerName}>{provider.provider_name}</Text>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )
                                ))}
                            </>
                        )}
                        <Text style={styles.movieOverview}>{detailData.overview}</Text>
                        <View style={styles.metaInfo}>
                            <View style={styles.metaItem}>
                                <Icon name="star" size={20} color="#FFD700" />
                                <Text style={styles.metaText}>{detailData.vote_average}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Icon name="theater-comedy" size={20} color="#FFF" />
                                <Text style={styles.metaText}>{detailData.genres.map(genre => genre.name).join(' • ')}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Icon name="schedule" size={20} color="#FFF" />
                                <Text style={styles.metaText}>{detailData.runtime || detailData.episode_run_time} min</Text>
                            </View>
                        </View>
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
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
    },
    video: {
        flex: 1,
    },
    movieInfoContainer: {
        padding: 10,
        marginBottom: 10,
    },
    movieTitle: {
        fontSize: 24,
        fontFamily: 'WorkSans-Bold',
        color: '#FFF',
        marginBottom: 10,
    },
    providersContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        backgroundColor: '#19192b',
        padding: 5,
        borderRadius: 5,
    },
    providerCategoryTitle: {
        fontSize: 10,
        color: '#FFF',
        fontFamily: 'WorkSans-Bold',
        marginTop: 10,
        marginRight: 10,
    },
    providerText: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    providerLogo: {
        width: 30,
        height: 30,
        marginRight: 5,
    },
    providerName: {
        fontSize: 16,
        color: '#FFF',
        fontFamily: 'WorkSans-Regular',
    },
    movieOverview: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 12,
        fontFamily: 'WorkSans-Regular',
    },
    metaInfo: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    metaText: {
        fontSize: 14,
        color: '#FFF',
        fontFamily: 'WorkSans-Regular',
        marginLeft: 6,
    },
    castMemberContainer: {
        width: 120,
        alignItems: 'center',
        marginRight: 10,
    },
    castImage: {
        width: '100%',
        height: 120,
        borderRadius: 24,
        marginTop: 12,
        marginBottom: 6,
        resizeMode: 'contain',
    },
    castName: {
        fontSize: 14,
        color: '#FFF',
        textAlign: 'center',
        fontFamily: 'WorkSans-Bold',
    },
    castCharacter: {
        fontSize: 12,
        color: '#FFF',
        textAlign: 'center',
        fontFamily: 'WorkSans-Regular',
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    // Add other styles as necessary
});

export default DetailScreen;
