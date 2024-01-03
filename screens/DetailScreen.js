import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, ActivityIndicator, FlatList } from 'react-native';
import { fetchDetailsById } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';

const DetailScreen = ({ route }) => {
    const { id, type } = route.params;
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [trailerUrl, setTrailerUrl] = useState(null);
    const [likes, setLikes] = useState(0); // Added likes state
    const [watchedCount, setWatchedCount] = useState(0); // Added watchedCount state

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await fetchDetailsById(id, type);
                setDetailData(data);

                // Find the trailer video if available
                const trailer = data.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
                if (trailer) {
                    setTrailerUrl(`https://www.youtube.com/embed/${trailer.key}`);
                } else if (data.videos.results.length > 0) {
                    // If trailer is not available, display the first available video
                    setTrailerUrl(`https://www.youtube.com/embed/${data.videos.results[0].key}`);
                }
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

    // Display season count for TV shows or running time for movies
    const displayTimeOrSeasons = () => {
        if (type === 'tv') {
            return `${detailData.number_of_seasons} ${detailData.number_of_seasons === 1 ? 'Season' : 'Seasons'}`;
        } else {
            const hours = Math.floor(detailData.runtime / 60);
            const minutes = detailData.runtime % 60;
            return `${hours}hr ${minutes}m`;
        }
    };

    // Find all available providers
    const availableProviders = [];
    ['flatrate'].forEach((category) => {
        if (detailData.providers && detailData.providers[category]) {
            detailData.providers[category].forEach((provider) => {
                if (!availableProviders.some((p) => p.provider_id === provider.provider_id)) {
                    availableProviders.push(provider);
                }
            });
        }
    });

    const handleLike = () => {
        setLikes(likes + 1);
    };

    const handleWatched = () => {
        setWatchedCount(watchedCount + 1);
    };

    return (
        <ScrollView style={styles.container}>
            {detailData && (
                <>
                    {trailerUrl ? (
                        <View style={styles.videoPlayer}>
                            <WebView source={{ uri: trailerUrl }} style={styles.video} />
                        </View>
                    ) : (
                        <Text style={styles.noTrailerText}>Trailer not available</Text>
                    )}

                    {/* Titles Information */}
                    <View style={styles.movieInfoContainer}>
                        <Text style={styles.movieTitle}>
                            {detailData.title || detailData.name} ({type === 'tv' ? detailData.first_air_date && detailData.first_air_date.substring(0, 4) : detailData.release_date && detailData.release_date.substring(0, 4)})
                        </Text>
                        {detailData.certification && (
                            <Text style={styles.certificationBox}>{detailData.certification}</Text>
                        )}
                        {availableProviders.length > 0 ? (
                            <View style={styles.providersContainer}>
                                <Text style={styles.providerCategoryTitle}>Where to watch</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {availableProviders.map((provider) => (
                                        <View style={styles.providerText} key={provider.provider_id}>
                                            {provider.logo_path && (
                                                <Image
                                                    source={{ uri: `https://image.tmdb.org/t/p/w500${provider.logo_path}` }}
                                                    style={styles.providerLogo}
                                                />
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : (
                            <Text style={styles.providerCategoryTitle}>Not streaming.</Text>
                        )}

                        <Text style={styles.movieTagline}>{detailData.tagline}</Text>
                        <Text style={styles.movieOverview}>{detailData.overview}</Text>
                        <View style={styles.metaInfo}>
                            <View style={styles.metaItem}>
                                <Icon name="theater-comedy" size={20} color="#FFF" />
                                <Text style={styles.metaText}>{detailData.genres.map(genre => genre.name).join(' • ')}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Icon name="schedule" size={20} color="#FFF" />
                                <Text style={styles.metaText}>{displayTimeOrSeasons()}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Icon name="favorite" size={20} color="#FF0000" onPress={handleLike} />
                                <Text style={styles.metaText}>{likes}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Icon name="visibility" size={20} color="#FFF" onPress={handleWatched} />
                                <Text style={styles.metaText}>{watchedCount}</Text>
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
        height: 200,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    noTrailerText: {
        textAlign: 'center',
        color: '#FFF',
        padding: 20,
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
        fontSize: 16,
        color: '#FFF',
        fontFamily: 'WorkSans-Bold',
        marginTop: 10,
        marginRight: 10,
        marginBottom: 10,
    },
    providerText: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    providerLogo: {
        width: 30,
        height: 30,
        marginRight: 10,
        resizeMode: 'contain',

    },
    movieTagline: {
        fontSize: 14,
        fontFamily: 'WorkSans-Thin',
        color: '#FFF',
        marginTop: 10,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    movieH1: {
        fontSize: 17,
        fontFamily: 'WorkSans-Bold',
        color: '#FFF',
        marginBottom: 10,
    },
    movieOverview: {
        fontSize: 16,
        lineHeight: 24,
        color: '#FFF',
        marginBottom: 16,
        fontFamily: 'WorkSans-Regular',
    },
    metaInfo: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    certificationBox: {
        fontSize: 12,
        color: '#FFF',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FFF',
        padding: 4,
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginBottom: 12,
        fontFamily: 'WorkSans-Bold',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 6,
    },
    metaText: {
        fontSize: 14,
        color: '#FFF',
        fontFamily: 'WorkSans-Bold',
        marginLeft: 6,
        alignSelf: 'center',
    },
    castMemberContainer: {
        width: 120,
        alignItems: 'center',
        marginRight: 10,
    },
    castImage: {
        width: '100%',
        height: 120,
        borderRadius: 60,
        marginTop: 10,
        marginBottom: 6,
        resizeMode: 'contain',
    },
    castName: {
        fontSize: 14,
        color: '#FFF',
        textAlign: 'center',
        fontFamily: 'WorkSans-Bold',
        marginBottom: 4,
    },
    castCharacter: {
        fontSize: 12,
        color: '#FFF',
        textAlign: 'center',
        fontFamily: 'WorkSans-Light',

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
