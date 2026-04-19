import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  FlatList,
  Pressable,
} from 'react-native';
import {
  fetchDetailsById,
  type TitleDetails,
  type TmdbProvider,
  type TmdbCastMember,
} from '../services/api';
import { PlayCircle, FilmStrip, Clock } from 'phosphor-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import DotLoader from '../components/DotLoader';
import { Skeleton } from '../components/Skeleton';
import type { StackScreenProps } from '@react-navigation/stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography } from '../theme';

type Props = StackScreenProps<HomeStackParamList, 'Detail'>;

const DetailScreen = ({ route, navigation }: Props): React.ReactElement => {
  const { id, type } = route.params;
  const [detailData, setDetailData] = useState<TitleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
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
          // Sprint 4 DetailScreen trailer fix: react-native-youtube-iframe
          // takes the bare video id (not an embed URL), fixing WebView
          // Error 153 noted in the Sprint 3 handoff.
          setTrailerKey(trailer.key);
        }
      } catch (e) {
        setError('We could not load this title right now. Please try again.');
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
    if (trailerKey && showTrailer) {
      return (
        <View style={styles.videoPlayer}>
          <YoutubePlayer
            height={200}
            play
            videoId={trailerKey}
            webViewStyle={styles.videoInner}
          />
        </View>
      );
    } else if (trailerKey) {
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
          <Pressable
            onPress={handlePlayTrailerClick}
            style={styles.playButton}
            accessibilityRole="button"
            accessibilityLabel="Play trailer"
            accessibilityHint="Starts the embedded YouTube trailer"
          >
            <PlayCircle size={64} color={colors.accent} weight="fill" />
          </Pressable>
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
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.loadingWrap}
      >
        <Skeleton height={220} borderRadius={0} />
        <View style={styles.loadingBody}>
          <Skeleton height={28} width="80%" style={styles.loadingRow} />
          <Skeleton height={14} width="60%" style={styles.loadingRow} />
          <Skeleton height={14} width="90%" style={styles.loadingRow} />
          <Skeleton height={14} width="90%" style={styles.loadingRow} />
          <View style={styles.loadingSpinner}>
            <DotLoader size="md" accessibilityLabel="Loading title details" />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View
          style={styles.errorBanner}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!detailData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorBannerText}>No details available.</Text>
        </View>
      </View>
    );
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

        {detailData.tagline ? (
          <Text style={styles.movieTagline}>{detailData.tagline}</Text>
        ) : null}
        <Text style={styles.movieOverview}>{detailData.overview}</Text>
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <FilmStrip
              size={20}
              color={colors.textSecondary}
              weight="regular"
            />
            <Text style={styles.metaText}>
              {(detailData.genres || []).map((g) => g.name).join(' • ')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={20} color={colors.textSecondary} weight="regular" />
            <Text style={styles.metaText}>{displayTimeOrSeasons()}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recommend this title to a friend"
          onPress={() =>
            navigation.navigate('RecCardCompose', {
              titleId:
                typeof id === 'number' ? id : Number.parseInt(String(id), 10),
            })
          }
          style={({ pressed }) => [
            styles.recommendBtn,
            pressed ? styles.recommendBtnPressed : null,
          ]}
        >
          <Text style={styles.recommendBtnText}>Recommend</Text>
        </Pressable>
      </View>

      {detailData.credits && detailData.credits.cast ? (
        <FlatList
          data={detailData.credits.cast}
          horizontal
          style={styles.castList}
          contentContainerStyle={styles.castListContent}
          renderItem={({ item }: { item: TmdbCastMember }) => (
            <View style={styles.castMemberContainer}>
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${item.profile_path}`,
                }}
                style={styles.castImage}
              />
              <Text style={styles.castName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.castCharacter} numberOfLines={1}>
                {item.character}
              </Text>
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
    backgroundColor: colors.ink,
  },
  loadingWrap: {
    paddingBottom: spacing.xl,
  },
  loadingBody: {
    padding: spacing.md,
  },
  loadingRow: {
    marginBottom: spacing.sm,
  },
  loadingSpinner: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: 220,
    backgroundColor: colors.ink,
  },
  videoInner: {
    backgroundColor: colors.ink,
  },
  backdropContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: colors.surface,
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
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTrailerText: {
    ...typography.bodySm,
    textAlign: 'center',
    color: colors.textSecondary,
    padding: spacing.lg,
  },
  movieInfoContainer: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  movieTitle: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: spacing.sm,
  },
  providersContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radii.sm,
  },
  providerCategoryTitle: {
    ...typography.label,
    color: colors.textHigh,
    marginTop: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  providerText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  providerLogo: {
    width: 30,
    height: 30,
    marginRight: spacing.xs,
    resizeMode: 'contain',
  },
  movieTagline: {
    ...typography.label,
    color: colors.accentSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  movieOverview: {
    ...typography.body,
    color: colors.textBody,
    marginBottom: spacing.md,
  },
  metaInfo: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  recommendBtn: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accentSecondary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 44,
  },
  recommendBtnPressed: {
    opacity: 0.85,
  },
  recommendBtnText: {
    ...typography.button,
    color: colors.accentSecondary,
  },
  certificationBox: {
    ...typography.caption,
    color: colors.textHigh,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textBody,
    marginLeft: spacing.xs,
  },
  castList: {
    paddingLeft: spacing.md,
  },
  castListContent: {
    paddingRight: spacing.md,
  },
  castMemberContainer: {
    width: 100,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    resizeMode: 'cover',
    backgroundColor: colors.surface,
  },
  castName: {
    ...typography.bodySm,
    color: colors.textHigh,
    textAlign: 'center',
    marginBottom: 2,
  },
  castCharacter: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    margin: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
  },
  errorBannerText: {
    ...typography.body,
    color: colors.textHigh,
  },
});

export default DetailScreen;
