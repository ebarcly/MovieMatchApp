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
    const [trailerUrl, setTrailerUrl] = useState(null);


    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await fetchDetailsById(id, type);
                setDetailData(data);

                // Find the trailer video if available
                const trailer = data.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
                if (trailer) {
                    setTrailerUrl(`https://www.youtube.com/embed/${trailer.key}`);
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
