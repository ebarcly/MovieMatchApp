import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator as _ActivityIndicator,
} from 'react-native';
import { MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import { auth } from '../firebaseConfig';
import { fetchTMDBImage } from '../services/api';
import {
  writeTasteProfile,
  fetchTasteProfile,
  type TasteProfile,
  type TasteAxis,
} from '../utils/firebaseOperations';
import DotLoader from '../components/DotLoader';
import { springs } from '../theme/motion';
import { colors, spacing, radii, typography, shadows } from '../theme';
import type { ProfileSetupStackParamList } from '../navigation/types';

// Prevent a dead-code lint warning on the unused ActivityIndicator alias —
// we alias-import it so a future `ActivityIndicator` accidental usage in
// this file is still lint-visible. (We never render it — DotLoader is the
// one motion motif.)
void _ActivityIndicator;

/**
 * TasteQuizScreen — 7 poster A/B pairs over 8 taste axes. No Likert, no
 * tiebreak. Progress indicator appears at pair 4 (dopamine brief Rule
 * #1). Each pick fires Haptics.selectionAsync and lifts the chosen
 * poster on z-axis (scale 1.04 + shadows.lg) while the unchosen dims
 * to 0.4 opacity over 180ms — springs.snappy for both.
 *
 * On completion, computes the 8 axis vector + picks two identity labels
 * (one common / one rare) using a template, writes to Firestore via
 * writeTasteProfile, shows a 1-sentence Letterboxd-voice read-back,
 * holds ~800ms, then surfaces a "Let's go" CTA (springs.gentle
 * fade-in). CTA routes the user back to Main via nav state reset — the
 * user's tasteProfile doc is the predicate AppNavigator watches.
 */

type NavProp = StackNavigationProp<ProfileSetupStackParamList, 'TasteQuiz'>;

type Side = 'A' | 'B';

interface PosterRef {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
}

interface Pair {
  /** Which of the 8 axes this pair scores. Last pair can score two. */
  axes: readonly [TasteAxis] | readonly [TasteAxis, TasteAxis];
  /** posterA encodes -1 on each scored axis; posterB encodes +1. */
  posterA: PosterRef;
  posterB: PosterRef;
  /** Optional label each choice contributes toward. */
  labelA?: string;
  labelB?: string;
  /** Render caption under the poster pair. */
  prompt: string;
}

// 7 A/B pairs. Pair 7 covers two axes (runtime + mood) so we still hit
// all 8 axes in 7 pairs. TMDB ids are classic anchor titles where the
// poster art is instantly readable — no obscurities.
const PAIRS: readonly Pair[] = [
  {
    axes: ['pacing'] as const,
    prompt: 'Pick the one you would rewatch tonight.',
    posterA: { tmdbId: 414906, type: 'movie', title: 'The Batman' }, // slow, brooding
    posterB: { tmdbId: 603692, type: 'movie', title: 'John Wick 4' }, // relentless
    labelA: 'slow',
    labelB: 'breakneck',
  },
  {
    axes: ['era'] as const,
    prompt: 'Which cover pulls you in faster?',
    posterA: { tmdbId: 238, type: 'movie', title: 'The Godfather' }, // classic
    posterB: { tmdbId: 1022789, type: 'movie', title: 'Inside Out 2' }, // modern
    labelA: 'old-soul',
    labelB: 'modern',
  },
  {
    axes: ['mood'] as const,
    prompt: 'Pick your Sunday night.',
    posterA: { tmdbId: 105, type: 'movie', title: 'Back to the Future' }, // warm
    posterB: { tmdbId: 694, type: 'movie', title: 'The Shining' }, // eerie
    labelA: 'warm',
    labelB: 'eerie',
  },
  {
    axes: ['stakes'] as const,
    prompt: 'Which do you want to live inside for two hours?',
    posterA: { tmdbId: 500, type: 'movie', title: 'Reservoir Dogs' }, // interior/quiet-stakes
    posterB: { tmdbId: 299536, type: 'movie', title: 'Avengers: Infinity War' }, // cosmic stakes
    labelA: 'low-stakes',
    labelB: 'cosmic',
  },
  {
    axes: ['tone'] as const,
    prompt: 'First instinct — which cover feels like you today?',
    posterA: { tmdbId: 508442, type: 'movie', title: 'Soul' }, // earnest
    posterB: {
      tmdbId: 569094,
      type: 'movie',
      title: 'Spider-Man: Across the Spider-Verse',
    }, // playful
    labelA: 'earnest',
    labelB: 'playful',
  },
  {
    axes: ['genreFluency', 'realism'] as const,
    prompt: 'Which would you send a friend without a warning?',
    posterA: { tmdbId: 637, type: 'movie', title: 'Life Is Beautiful' }, // grounded, naturalist
    posterB: { tmdbId: 286217, type: 'movie', title: 'The Martian' }, // genre, speculative
    labelA: 'grounded',
    labelB: 'speculative',
  },
  {
    axes: ['runtime', 'mood'] as const,
    prompt: 'Pick the brick you would stay up for.',
    posterA: { tmdbId: 24428, type: 'movie', title: 'The Avengers' }, // normal runtime
    posterB: {
      tmdbId: 122,
      type: 'movie',
      title: 'The Lord of the Rings: The Return of the King',
    }, // long epic
    labelA: 'feature',
    labelB: 'epic',
  },
] as const;

const TOTAL = PAIRS.length;
// Progress indicator appears starting at pair 4 per the dopamine brief.
const PROGRESS_REVEAL_AT_INDEX = 3;

type AxisScoreMap = Partial<Record<TasteAxis, number>>;

const emptyAxisVector = (): Record<TasteAxis, number> => ({
  pacing: 0,
  era: 0,
  mood: 0,
  stakes: 0,
  tone: 0,
  genreFluency: 0,
  realism: 0,
  runtime: 0,
});

/**
 * Build an 8-axis tasteProfile + two identity labels from the accrued
 * picks. Every axis is scored as the mean of its accumulated picks, so
 * values stay in [-1, 1]. Labels: the "common" tribal label is the
 * pick-label most often selected; the "rare" distinctiveness label is
 * the least-selected label that still collected at least one pick.
 */
const buildProfileFromPicks = (
  picks: readonly { pair: Pair; side: Side }[],
): TasteProfile => {
  const axisAccumulator: Record<TasteAxis, number[]> = {
    pacing: [],
    era: [],
    mood: [],
    stakes: [],
    tone: [],
    genreFluency: [],
    realism: [],
    runtime: [],
  };
  const labelCount: Record<string, number> = {};

  for (const { pair, side } of picks) {
    const value = side === 'A' ? -1 : 1;
    for (const axis of pair.axes) {
      axisAccumulator[axis].push(value);
    }
    const chosenLabel = side === 'A' ? pair.labelA : pair.labelB;
    if (chosenLabel) {
      labelCount[chosenLabel] = (labelCount[chosenLabel] ?? 0) + 1;
    }
  }

  const axes = emptyAxisVector();
  for (const a of Object.keys(axisAccumulator) as TasteAxis[]) {
    const samples = axisAccumulator[a];
    if (samples.length > 0) {
      const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
      axes[a] = Number.parseFloat(mean.toFixed(2));
    }
  }

  const sortedLabels = Object.entries(labelCount).sort((x, y) => y[1] - x[1]);
  const common = sortedLabels[0]?.[0] ?? 'late-night';
  const rare =
    sortedLabels.length > 1
      ? sortedLabels[sortedLabels.length - 1][0]
      : 'strange';

  return { axes, labels: { common, rare } };
};

const readbackSentence = (labels: { common: string; rare: string }): string =>
  `You lean ${labels.common} and ${labels.rare}. Let's find you some people.`;

void ({} as AxisScoreMap);

const TasteQuizScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavProp>();
  const [pairIndex, setPairIndex] = useState(0);
  const [picks, setPicks] = useState<{ pair: Pair; side: Side }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [posterAUri, setPosterAUri] = useState<string | null>(null);
  const [posterBUri, setPosterBUri] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);

  const currentPair = PAIRS[pairIndex];

  // Idempotent entry guard — if the user already has a tasteProfile,
  // skip the quiz. AppNavigator will move them to Main on the next
  // watcher tick once their user doc satisfies the predicate.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      const existing = await fetchTasteProfile(user.uid);
      if (existing && !cancelled) {
        // Parent stack's onSnapshot on users/{uid} will advance to Main;
        // we just sit tight. Setting completed:true surfaces the CTA
        // immediately so the user isn't stuck on pair 1 if they landed
        // here by mistake.
        setProfile(existing);
        setCompleted(true);
        setShowCta(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy-fetch TMDB poster URIs for the current pair. Falls back to
  // null (ink placeholder) if fetch fails.
  useEffect(() => {
    if (completed) return;
    let cancelled = false;
    const loadPosters = async (): Promise<void> => {
      setPosterAUri(null);
      setPosterBUri(null);
      try {
        const [a, b] = await Promise.all([
          fetchTMDBImage(currentPair.posterA.tmdbId, currentPair.posterA.type),
          fetchTMDBImage(currentPair.posterB.tmdbId, currentPair.posterB.type),
        ]);
        if (!cancelled) {
          setPosterAUri(a);
          setPosterBUri(b);
        }
      } catch (err) {
        console.warn('Poster fetch failed, falling back to ink tile:', err);
      }
    };
    loadPosters();
    return () => {
      cancelled = true;
    };
  }, [pairIndex, completed, currentPair]);

  const handlePick = useCallback(
    (side: Side): void => {
      if (selectedSide || submitting) return;
      setSelectedSide(side);
      void Haptics.selectionAsync();
      const nextPicks = [...picks, { pair: currentPair, side }];
      // Hold the lift briefly so the user can see the selection animate
      // before we advance. 280ms ≈ spring resolution for snappy.
      setTimeout(async () => {
        if (pairIndex < TOTAL - 1) {
          setPicks(nextPicks);
          setPairIndex(pairIndex + 1);
          setSelectedSide(null);
          return;
        }
        // Completed: build profile, show read-back, write async.
        setPicks(nextPicks);
        const built = buildProfileFromPicks(nextPicks);
        setProfile(built);
        setCompleted(true);
        setSubmitting(true);
        const user = auth.currentUser;
        if (user) {
          try {
            await writeTasteProfile(user.uid, built);
          } catch (e) {
            console.error('writeTasteProfile failed on quiz completion:', e);
          }
        }
        setSubmitting(false);
        // Hold ~800ms for the read-back peak before surfacing the CTA.
        setTimeout(() => setShowCta(true), 800);
      }, 280);
    },
    [currentPair, pairIndex, picks, selectedSide, submitting],
  );

  const progressLabel = useMemo(() => {
    if (pairIndex < PROGRESS_REVEAL_AT_INDEX) return null;
    return `${pairIndex + 1} of ${TOTAL}`;
  }, [pairIndex]);

  const handleDone = useCallback((): void => {
    // Parent AppNavigator's onSnapshot on /users/{uid} sees the new
    // tasteProfile field and routes to Main automatically. Popping
    // back to ProfileSetupInitial is a no-op safety net for the edge
    // case where the user re-entered mid-flow.
    navigation.popToTop();
  }, [navigation]);

  if (completed && profile) {
    return (
      <View style={styles.screen}>
        <View style={styles.readbackWrap}>
          <Text style={styles.readbackEyebrow}>your taste</Text>
          <Text style={styles.readback}>
            {readbackSentence(profile.labels)}
          </Text>
          {submitting ? (
            <View style={styles.readbackSaving}>
              <DotLoader size="sm" accessibilityLabel="Saving taste profile" />
            </View>
          ) : null}
          {showCta ? (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', ...springs.gentle }}
              style={styles.ctaWrap}
            >
              <Pressable
                onPress={handleDone}
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.ctaPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open MovieMatch"
              >
                <Text style={styles.ctaText}>Let&apos;s go</Text>
              </Pressable>
            </MotiView>
          ) : null}
        </View>
      </View>
    );
  }

  const renderPoster = (
    side: Side,
    poster: PosterRef,
    uri: string | null,
  ): React.ReactElement => {
    const isChosen = selectedSide === side;
    const isDimmed = selectedSide !== null && selectedSide !== side;
    return (
      <MotiView
        animate={{
          scale: isChosen ? 1.04 : 1,
          opacity: isDimmed ? 0.4 : 1,
        }}
        transition={{
          type: 'spring',
          ...springs.snappy,
        }}
        style={[styles.posterWrap, isChosen && styles.posterChosen]}
      >
        <Pressable
          onPress={() => handlePick(side)}
          style={styles.posterPressable}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${poster.title}`}
          accessibilityHint={`Selects ${poster.title} for this prompt`}
          accessibilityState={{ selected: isChosen }}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.posterImage} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterTitle} numberOfLines={3}>
                {poster.title}
              </Text>
            </View>
          )}
        </Pressable>
      </MotiView>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick taste check</Text>
        {progressLabel ? (
          <Text style={styles.progress}>{progressLabel}</Text>
        ) : null}
      </View>
      <Text style={styles.prompt}>{currentPair.prompt}</Text>
      <View style={styles.posterRow}>
        {renderPoster('A', currentPair.posterA, posterAUri)}
        {renderPoster('B', currentPair.posterB, posterBUri)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginBottom: spacing.xxs,
  },
  progress: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  prompt: {
    ...typography.titleSm,
    color: colors.textHigh,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  posterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  posterWrap: {
    flex: 1,
    aspectRatio: 2 / 3,
    marginHorizontal: spacing.xs,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  posterChosen: {
    ...shadows.lg,
  },
  posterPressable: {
    flex: 1,
  },
  posterImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  posterTitle: {
    ...typography.titleSm,
    color: colors.textHigh,
    textAlign: 'center',
  },
  readbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  readbackEyebrow: {
    ...typography.caption,
    color: colors.accentSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  readback: {
    ...typography.titleLg,
    color: colors.textHigh,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  readbackSaving: {
    marginTop: spacing.md,
  },
  ctaWrap: {
    marginTop: spacing.lg,
  },
  ctaButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minHeight: 52,
    minWidth: 172,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    backgroundColor: colors.accentHover,
  },
  ctaText: {
    ...typography.button,
    color: colors.accentForeground,
  },
});

export default TasteQuizScreen;
