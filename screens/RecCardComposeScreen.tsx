/**
 * RecCardComposeScreen — Sprint 5b Stream B.
 *
 * Inline stack screen (NOT a native modal per Sprint 4 rules) reached
 * from DetailScreen's "Recommend" CTA or from FriendDetail's "Send rec".
 *
 * Layout:
 *   - Poster thumbnail for titleId (TMDB w185)
 *   - Friend picker using listFriends(uid) from Sprint 5a. If
 *     `friendUid` route param is set, that friend is preselected.
 *   - 3 AI suggestions — useRecCopy(). DotLoader up to 1500ms then 3
 *     tappable chips. Tap populates the note textarea (user edits freely).
 *   - Required note textarea (30-280 chars) + live char count.
 *   - Send button — enabled iff 30 <= note.length <= 280 AND a friend
 *     is picked. On tap: calls `createRec(toUid, titleId, note)` → on
 *     success, opens the native Share sheet; on failure, renders an
 *     inline banner (never Alert.alert, never native Modal).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Avatar from '../components/Avatar';
import DotLoader from '../components/DotLoader';
import { openRecShare } from '../components/RecCardShareSheet';
import { useRecCopy } from '../hooks/useRecCopy';
import { getDefaultLLMClient } from '../utils/ai/impl/AnthropicLLMClient';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import {
  createRec,
  listFriends,
  REC_NOTE_MAX_LEN,
  REC_NOTE_MIN_LEN,
  RecNoteLengthError,
  type FriendshipDoc,
} from '../utils/firebaseOperations';
import { fetchDetailsById, type TitleDetails } from '../services/api';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography } from '../theme';

type RecCardComposeRouteProp = RouteProp<HomeStackParamList, 'RecCardCompose'>;
type RecCardComposeNavProp = StackNavigationProp<
  HomeStackParamList,
  'RecCardCompose'
>;

interface FriendRow {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

const RecCardComposeScreen = (): React.ReactElement => {
  const route = useRoute<RecCardComposeRouteProp>();
  const navigation = useNavigation<RecCardComposeNavProp>();
  const { titleId, friendUid: preselectedFriend } = route.params;
  const userUid = auth.currentUser?.uid ?? null;

  const [titleDetails, setTitleDetails] = useState<TitleDetails | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(
    preselectedFriend ?? null,
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Load title details for the poster.
  useEffect(() => {
    if (!Number.isFinite(titleId) || titleId === 0) {
      setTitleDetails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await fetchDetailsById(titleId, 'movie');
        if (!cancelled) setTitleDetails(d);
      } catch {
        if (!cancelled) setTitleDetails(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [titleId]);

  // Load friend list + each public profile.
  useEffect(() => {
    if (!userUid) return;
    let cancelled = false;
    (async () => {
      try {
        const friendships: FriendshipDoc[] = await listFriends(userUid);
        const otherUids = friendships
          .map((f) => f.participants.find((p) => p !== userUid))
          .filter((u): u is string => Boolean(u));
        if (otherUids.length === 0) {
          if (!cancelled) setFriends([]);
          return;
        }
        // Each public profile is an onSnapshot subscription; for simplicity
        // on the compose flow we do one-shot reads at the subdoc path.
        const rows: FriendRow[] = await Promise.all(
          otherUids.map(async (uid) => {
            return new Promise<FriendRow>((resolve) => {
              const unsub = onSnapshot(
                doc(db, 'users', uid, 'public', 'profile'),
                (snap) => {
                  unsub();
                  const data = snap.data() as
                    | { displayName?: string; photoURL?: string | null }
                    | undefined;
                  resolve({
                    uid,
                    displayName: data?.displayName ?? null,
                    photoURL: data?.photoURL ?? null,
                  });
                },
                () => {
                  unsub();
                  resolve({ uid, displayName: null, photoURL: null });
                },
              );
            });
          }),
        );
        if (!cancelled) setFriends(rows);
      } catch (err) {
        console.warn('[RecCardCompose] friend load failed:', err);
        if (!cancelled) setFriends([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userUid]);

  // Wire the Stream C AI suggestions hook.
  const client = useMemo(() => getDefaultLLMClient(), []);
  const recInput = useMemo(
    () => ({
      title: {
        id: String(titleId),
        name: titleDetails?.title ?? titleDetails?.name ?? `Title ${titleId}`,
        year:
          Number.parseInt(
            (
              titleDetails?.release_date ??
              titleDetails?.first_air_date ??
              ''
            ).slice(0, 4),
            10,
          ) || new Date().getFullYear(),
        genres: (titleDetails?.genres ?? []).map((g) => g.name),
        runtime: titleDetails?.runtime,
      },
      sender: {
        tasteLabels: { common: 'texture', rare: 'signal' },
      },
      recipient: {
        tasteLabels: { common: 'texture', rare: 'signal' },
      },
      relationshipDepth: 2 as const,
    }),
    [titleId, titleDetails],
  );
  const recCopy = useRecCopy({ client, input: recInput });

  // Send enabled iff note length is in bounds AND friend is picked.
  const noteValid =
    note.length >= REC_NOTE_MIN_LEN && note.length <= REC_NOTE_MAX_LEN;
  const canSend = noteValid && !!selectedFriend && !sending;

  const handleSend = async (): Promise<void> => {
    if (!selectedFriend) return;
    console.log('[rec] send tapped — createRec starting');
    try {
      setError(null);
      setSending(true);
      // 10s timeout on the Firestore write — surfaces rule rejections /
      // network hangs instead of spinning forever in the UI.
      const result = await Promise.race([
        createRec(selectedFriend, titleId, note),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('createRec timed out after 10s')),
            10_000,
          ),
        ),
      ]);
      console.log('[rec] createRec ok — recId:', result.recId);
      const friendName =
        friends.find((f) => f.uid === selectedFriend)?.displayName ?? 'friend';
      // Reset the blocking state BEFORE opening the share sheet. The
      // native Share.share promise can hang on iOS if the user dismisses
      // without tapping an action — we don't want the compose UI stuck
      // behind it. Fire-and-forget; any share failure logs but doesn't
      // block UX.
      setSending(false);
      openRecShare(result.shareUrl, friendName)
        .then((r) => console.log('[rec] share sheet returned:', r))
        .catch((err) => console.warn('[rec] share sheet failed:', err));
      navigation.goBack();
    } catch (err) {
      console.warn('[rec] send failed:', err);
      if (err instanceof RecNoteLengthError) {
        setError(
          `Note must be between ${err.minLength} and ${err.maxLength} characters.`,
        );
      } else if (err instanceof Error && err.message.includes('timed out')) {
        setError(
          'Send is taking too long. Check your connection and try again.',
        );
      } else {
        setError('We could not send that rec. Try again.');
      }
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kbAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // iOS bottom-tab bar + stack header offset. 80 clears both so the
      // note textarea lifts above the keyboard when focused.
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          {titleDetails?.poster_path ? (
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w185${titleDetails.poster_path}`,
              }}
              style={styles.poster}
            />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]} />
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.titleText} numberOfLines={2}>
              {titleDetails?.title ?? titleDetails?.name ?? `Title ${titleId}`}
            </Text>
            <Text style={styles.subText}>Send a rec</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>To</Text>
          {friends.length === 0 ? (
            <Text style={styles.emptyFriendsLine}>
              No friends yet — add one first.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {friends.map((f) => (
                <Pressable
                  key={f.uid}
                  accessibilityRole="button"
                  accessibilityLabel={`Pick ${f.displayName ?? f.uid}`}
                  onPress={() => setSelectedFriend(f.uid)}
                  style={({ pressed }) => [
                    styles.friendChip,
                    selectedFriend === f.uid ? styles.friendChipActive : null,
                    pressed ? styles.friendChipPressed : null,
                  ]}
                >
                  <Avatar
                    photoURL={f.photoURL}
                    displayName={f.displayName}
                    size="sm"
                  />
                  <Text style={styles.friendChipText} numberOfLines={1}>
                    {f.displayName ?? f.uid.slice(0, 6)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>3 AI suggestions</Text>
          {recCopy.loading ? (
            <View style={styles.suggestionsLoading}>
              <DotLoader
                size="sm"
                accessibilityLabel="Generating suggestions"
              />
            </View>
          ) : (
            <View style={styles.suggestionList}>
              {recCopy.variants.map((v, i) => (
                <Pressable
                  key={`${i}-${v.slice(0, 10)}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Use suggestion ${i + 1}`}
                  onPress={() => setNote(v)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    pressed ? styles.suggestionChipPressed : null,
                  ]}
                >
                  <Text style={styles.suggestionText} numberOfLines={3}>
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={REC_NOTE_MAX_LEN + 20}
            placeholder="Why this one, in your own words"
            placeholderTextColor={colors.textTertiary}
            style={styles.textarea}
            accessibilityLabel="Rec note"
          />
          <Text
            style={[
              styles.charCount,
              noteValid ? styles.charCountOk : styles.charCountBad,
            ]}
          >
            {note.length} / {REC_NOTE_MAX_LEN} (min {REC_NOTE_MIN_LEN})
          </Text>
        </View>

        {error ? (
          <View
            style={styles.errorBanner}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send rec"
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendBtn,
            !canSend ? styles.sendBtnDisabled : null,
            pressed ? styles.sendBtnPressed : null,
          ]}
        >
          {sending ? (
            <DotLoader size="sm" accessibilityLabel="Sending" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kbAvoid: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  posterPlaceholder: {
    backgroundColor: colors.borderStrong,
  },
  headerMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    ...typography.titleSm,
    color: colors.textHigh,
  },
  subText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyFriendsLine: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginRight: spacing.xs,
    gap: spacing.xs,
  },
  friendChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  friendChipPressed: {
    opacity: 0.8,
  },
  friendChipText: {
    ...typography.label,
    color: colors.textHigh,
    maxWidth: 120,
  },
  suggestionsLoading: {
    paddingVertical: spacing.md,
  },
  suggestionList: {
    gap: spacing.sm,
  },
  suggestionChip: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  suggestionChipPressed: {
    opacity: 0.85,
  },
  suggestionText: {
    ...typography.body,
    color: colors.textBody,
  },
  textarea: {
    ...typography.body,
    color: colors.textHigh,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
  charCountOk: {
    color: colors.textSecondary,
  },
  charCountBad: {
    color: colors.error,
  },
  errorBanner: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.textHigh,
  },
  sendBtn: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sendBtnDisabled: {
    backgroundColor: colors.borderStrong,
  },
  sendBtnPressed: {
    opacity: 0.85,
  },
  sendBtnText: {
    ...typography.button,
    color: colors.accentForeground,
  },
});

export default RecCardComposeScreen;
