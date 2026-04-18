import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  fetchDetailsById,
  type TitleDetails,
  type TmdbProvider,
  type TmdbCastMember,
} from '../services/api';
import { PlayCircle, FilmStrip, Clock } from 'phosphor-react-native';
import { WebView } from 'react-native-webview';
import type { StackScreenProps } from '@react-navigation/stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = StackScreenProps<HomeStackParamList, 'Detail'>;

const DetailScreen = ({ route }: Props): React.ReactElement => {
  const { id, type } = route.params;
  const [detailData, setDetailData] = useState<TitleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    const fetchDetails = async (): Promise<void> => {
      try {
        const data = await fetchDetailsById(id, type);
        setDetailData(data);

        // Sprint 2 BUG-6: guard against undefined data.videos /
        // data.videos.results. TMDB returns titles with no videos key.
        const trailer = data.videos?.results?.find(
          (video) => video.type === 'Trailer' && video.site === 'YouTube',
        );
        if (trailer) {
          setTrailerUrl(`https://www.youtube.com/embed/${trailer.key}`);
        }
      } catch (e) {
        setError('Unable to get details for this movie');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  const handlePlayTrailerClick = (): void => {
    setShowTrailer(true);
  };

  const renderTrailer = (): React.ReactElement => {
    if (trailerUrl && showTrailer) {
      return (
        <View style={styles.videoPlayer}>
          <WebView source={{ uri: trailerUrl }} style={styles.video} />
        </View>
      );
    } else if (trailerUrl) {
      return (
        <View style={styles.backdropContainer}>
          {detailData?.backdrop_path ? (
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w500${detailData.backdrop_path}`,
              }}
              style={styles.backdropImage}
            />
          ) : null}
          <TouchableOpacity
            onPress={handlePlayTrailerClick}
            style={styles.playButton}
          >
            <PlayCircle size={56} color="#FFF" weight="fill" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.videoPlayer}>
        <Text style={styles.noTrailerText}>No trailer available</Text>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (!detailData) {
    return <Text style={styles.errorText}>No details available.</Text>;
  }

  // Display season count for TV shows or running time for movies
  const displayTimeOrSeasons = (): string => {
    if (type === 'tv') {
      const n = detailData.number_of_seasons ?? 0;
      return `${n} ${n === 1 ? 'Season' : 'Seasons'}`;
    }
    const runtime = detailData.runtime ?? 0;
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return `${hours}hr ${minutes}m`;
  };

  // Find all available providers
  const availableProviders: TmdbProvider[] = [];
  (['flatrate'] as const).forEach((category) => {
    const list = detailData.providers?.[category];
    if (list) {
      list.forEach((provider) => {
        if (
          !availableProviders.some(
            (p) => p.provider_id === provider.provider_id,
          )
        ) {
          availableProviders.push(provider);
        }
      });
    }
  });

  // Sprint 2 BUG-2: like / watched-count handlers were local-only stubs
  // (they only incremented component state and never persisted).
  // Removed along with their UI entry points until Sprint 4/5 wires
  // real like/watched persistence against Firestore.

  return (
    <ScrollView style={styles.container}>
      {renderTrailer()}
      <View style={styles.movieInfoContainer}>
        <Text style={styles.movieTitle}>
          {detailData.title || detailData.name} (
          {type === 'tv'
            ? detailData.first_air_date &&
              detailData.first_air_date.substring(0, 4)
            : detailData.release_date &&
              detailData.release_date.substring(0, 4)}
          )
        </Text>
        {detailData.certification ? (
          <Text style={styles.certificationBox}>
            {detailData.certification}
          </Text>
        ) : null}
        {availableProviders.length > 0 ? (
          <View style={styles.providersContainer}>
            <Text style={styles.providerCategoryTitle}>Where to watch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableProviders.map((provider) => (
                <View style={styles.providerText} key={provider.provider_id}>
                  {provider.logo_path ? (
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w500${provider.logo_path}`,
                      }}
                      style={styles.providerLogo}
                    />
                  ) : null}
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
            <FilmStrip size={20} color="#FFF" weight="regular" />
            <Text style={styles.metaText}>
              {(detailData.genres || []).map((g) => g.name).join(' • ')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={20} color="#FFF" weight="regular" />
            <Text style={styles.metaText}>{displayTimeOrSeasons()}</Text>
          </View>
        </View>
      </View>

      {detailData.credits && detailData.credits.cast ? (
        <FlatList
          data={detailData.credits.cast}
          horizontal
          renderItem={({ item }: { item: TmdbCastMember }) => (
            <View style={styles.castMemberContainer}>
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${item.profile_path}`,
                }}
                style={styles.castImage}
              />
              <Text style={styles.castName}>{item.name}</Text>
              <Text style={styles.castCharacter}>{item.character}</Text>
            </View>
          )}
          keyExtractor={(item: TmdbCastMember) => item.id.toString()}
        />
      ) : null}
    </ScrollView>
  );
};

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
  backdropContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  playButton: {
    position: 'absolute',
    zIndex: 10,
  },
  video: {
    width: '100%',
    height: 200,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 5,
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
});

export default DetailScreen;
