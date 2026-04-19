import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Share,
  type ListRenderItemInfo,
} from 'react-native';
import { AddressBook, ShareNetwork, UserPlus } from 'phosphor-react-native';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import type { StackScreenProps } from '@react-navigation/stack';
import { auth } from '../firebaseConfig';
import {
  normalizePhone,
  normalizeEmail,
  hashContact,
} from '../utils/contactHashing';
import { sendFriendRequest, friendshipId } from '../utils/firebaseOperations';
import Avatar from '../components/Avatar';
import DotLoader from '../components/DotLoader';
import { useToast } from '../components/Toast';
import { colors, spacing, radii, typography, shadows } from '../theme';
import type { MatchesStackParamList } from '../navigation/types';

/**
 * Sprint 5a — ContactOnboardingScreen.
 *
 * Opt-in contact match flow (privacy contract in
 * docs/research/sprint-4-social-product.md):
 *
 *   1. User lands on the screen via the Matches-tab empty state
 *      "Find friends" CTA. No permission is requested on mount —
 *      the user must explicitly tap "Match my contacts".
 *   2. On consent: expo-contacts reads phone numbers + emails. We
 *      normalize each to E.164 / lowercase and SHA-256 hash ON-DEVICE.
 *      Raw strings never leave the device.
 *   3. We query public profile subcollections (users.{uid}.public.profile)
 *      with array-contains-any on contactHashes — up to 10 hashes per
 *      query, batched in parallel. Firestore returns up-to-N candidate
 *      public profiles.
 *   4. Candidates render as friend-candidate cards with an "Add" CTA
 *      that sends a friend request via sendFriendRequest(). `curated:
 *      false` distinguishes them from Sprint 4's pseudoFriend seeds.
 *   5. Denied permission → share-link fallback (Linking/Share.share).
 *
 * Country default is US for now; Sprint 6 can introduce per-user
 * country selection. Dominican Republic numbers (+1 809/829/849) work
 * out-of-the-box because they share the NANP +1 prefix with US.
 */

type Props = StackScreenProps<MatchesStackParamList, 'ContactOnboarding'>;

type ConsentState =
  | 'idle'
  | 'scanning'
  | 'matched'
  | 'awaiting-index'
  | 'denied'
  | 'error';

interface FriendCandidate {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  tasteLabels: { common: string; rare: string } | null;
  /** Sprint 4 pseudo-friend flag — explicitly `false` for real matches. */
  curated: false;
}

const DEFAULT_COUNTRY = 'US';

const ContactOnboardingScreen = (_props: Props): React.ReactElement => {
  const toast = useToast();
  const [state, setState] = useState<ConsentState>('idle');
  const [candidates, setCandidates] = useState<FriendCandidate[]>([]);
  const [hashedCount, setHashedCount] = useState<number>(0);
  const [pendingSends, setPendingSends] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Wipe any cached hashes from memory on unmount. Not strictly
      // necessary — JS GCs once the component unmounts — but a visible
      // signal that nothing persists.
      setCandidates([]);
    };
  }, []);

  const handleStart = useCallback(async () => {
    setErrorMessage(null);
    setState('scanning');
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErrorMessage('Please sign in again.');
      setState('error');
      return;
    }

    // 1. Permission request.
    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      setState('denied');
      return;
    }

    // 2. Read contacts; normalize + hash on-device.
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });

    const hashes = new Set<string>();
    for (const contact of data) {
      for (const phone of contact.phoneNumbers ?? []) {
        const raw = phone.number;
        if (!raw) continue;
        try {
          const normalized = normalizePhone(raw, DEFAULT_COUNTRY);
          const hashed = await hashContact(normalized);
          hashes.add(hashed);
        } catch {
          // Malformed number — skip quietly.
        }
      }
      for (const email of contact.emails ?? []) {
        const raw = email.email;
        if (!raw) continue;
        try {
          const normalized = normalizeEmail(raw);
          const hashed = await hashContact(normalized);
          hashes.add(hashed);
        } catch {
          // skip
        }
      }
    }

    // 3. Hand-off to the 5b surface.
    //
    // Cross-user contact matching lives in Sprint 5b: it needs a Firestore
    // collectionGroup('public') query + a composite index to scan every
    // user's /public/profile subcollection against the hashed contact set
    // with `array-contains-any` batches. The index + collectionGroup
    // query aren't in 5a scope. Rather than run a degraded query against
    // the private /users collection (which the rules would reject in
    // production AND doesn't hold contactHashes anyway), we stop at the
    // hashing step and surface an honest "awaiting-index" state so the
    // user can still invite friends via the share-link fallback.
    //
    // 5b generator: restore the matching pipeline here. `hashedCount`
    // + the 'awaiting-index' state branch are the seams to remove.
    setCandidates([]);
    setHashedCount(hashes.size);
    setState('awaiting-index');
  }, []);

  const handleInvite = useCallback(async () => {
    try {
      // TODO(5b): swap placeholder for the real deep-link URL once the
      // Firebase Hosting universal-link surface is live.
      await Share.share({
        message:
          'Join me on MovieMatch — the invisible wall between what friends watch is about to come down. https://moviematch.app/invite',
      });
    } catch (err) {
      console.warn('Share.share failed', err);
    }
  }, []);

  const handleSendRequest = useCallback(
    async (candidate: FriendCandidate) => {
      const fromUid = auth.currentUser?.uid;
      if (!fromUid) return;
      const id = friendshipId(fromUid, candidate.uid);
      setPendingSends((s) => new Set(s).add(id));
      try {
        await sendFriendRequest(fromUid, candidate.uid);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        toast.show({
          type: 'success',
          title: 'Request sent',
          body: `We pinged ${candidate.displayName ?? 'them'}.`,
        });
      } catch (err) {
        console.error('sendFriendRequest failed', err);
        // Rollback optimistic state.
        setPendingSends((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        toast.show({
          type: 'error',
          title: 'Send failed',
          body: 'Check your connection and try again.',
        });
      }
    },
    [toast],
  );

  const renderCandidate = useCallback(
    ({ item }: ListRenderItemInfo<FriendCandidate>) => {
      const fromUid = auth.currentUser?.uid ?? '';
      const id = fromUid ? friendshipId(fromUid, item.uid) : '';
      const isPending = pendingSends.has(id);
      return (
        <View style={styles.candidateCard}>
          <Avatar
            photoURL={item.photoURL}
            displayName={item.displayName}
            size="md"
          />
          <View style={styles.candidateBody}>
            <Text style={styles.candidateName} numberOfLines={1}>
              {item.displayName ?? 'New friend'}
            </Text>
            {item.tasteLabels ? (
              <Text style={styles.candidateLabels} numberOfLines={1}>
                {item.tasteLabels.common} · {item.tasteLabels.rare}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Send friend request to ${
              item.displayName ?? 'contact'
            }`}
            accessibilityHint="Adds this person to your friend graph once they accept"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={() => handleSendRequest(item)}
            style={({ pressed }) => [
              styles.addCta,
              pressed && styles.addCtaPressed,
              isPending && styles.addCtaPending,
            ]}
          >
            {isPending ? (
              <Text style={styles.addCtaTextPending}>Sent</Text>
            ) : (
              <>
                <UserPlus
                  size={16}
                  color={colors.accentForeground}
                  weight="regular"
                />
                <Text style={styles.addCtaText}>Add</Text>
              </>
            )}
          </Pressable>
        </View>
      );
    },
    [pendingSends, handleSendRequest],
  );

  const renderBody = (): React.ReactElement => {
    if (state === 'idle') {
      return (
        <View style={styles.heroCentered}>
          <View style={styles.iconCircle}>
            <AddressBook size={36} color={colors.accent} weight="regular" />
          </View>
          <Text style={styles.heroTitle}>Find your people</Text>
          <Text style={styles.heroBody}>
            We hash your contacts on your phone. Raw numbers never leave.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Match my contacts"
            accessibilityHint="Requests contacts permission on this device"
            onPress={handleStart}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && styles.primaryCtaPressed,
            ]}
          >
            <Text style={styles.primaryCtaText}>Match my contacts</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share an invite link instead"
            accessibilityHint="Opens the system share sheet without reading contacts"
            onPress={handleInvite}
            style={styles.secondaryCta}
          >
            <ShareNetwork
              size={16}
              color={colors.accentSecondary}
              weight="regular"
            />
            <Text style={styles.secondaryCtaText}>Share a link instead</Text>
          </Pressable>
        </View>
      );
    }

    if (state === 'scanning') {
      return (
        <View style={styles.heroCentered}>
          <DotLoader size="lg" accessibilityLabel="Matching contacts" />
          <Text style={styles.loaderText}>Hashing and matching…</Text>
        </View>
      );
    }

    if (state === 'denied') {
      return (
        <View style={styles.heroCentered}>
          <View style={styles.iconCircle}>
            <ShareNetwork
              size={36}
              color={colors.accentSecondary}
              weight="regular"
            />
          </View>
          <Text style={styles.heroTitle}>Share a link instead</Text>
          <Text style={styles.heroBody}>
            No contacts access. Send friends a link when you are ready.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share an invite link"
            onPress={handleInvite}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && styles.primaryCtaPressed,
            ]}
          >
            <Text style={styles.primaryCtaText}>Share invite link</Text>
          </Pressable>
        </View>
      );
    }

    if (state === 'error') {
      return (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.errorBanner}
        >
          <Text style={styles.errorBannerText}>
            {errorMessage ?? 'Something went wrong.'}
          </Text>
        </View>
      );
    }

    if (state === 'awaiting-index') {
      const contactWord = hashedCount === 1 ? 'contact' : 'contacts';
      return (
        <View style={styles.heroCentered}>
          <View style={styles.iconCircle}>
            <AddressBook size={36} color={colors.accent} weight="regular" />
          </View>
          <Text style={styles.heroTitle}>
            {hashedCount > 0
              ? `${hashedCount} ${contactWord} hashed`
              : 'No contacts to hash'}
          </Text>
          <Text style={styles.heroBody}>
            Cross-user matching lands in the next release.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share an invite link"
            onPress={handleInvite}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && styles.primaryCtaPressed,
            ]}
          >
            <Text style={styles.primaryCtaText}>Share invite link</Text>
          </Pressable>
        </View>
      );
    }

    // matched
    if (candidates.length === 0) {
      return (
        <View style={styles.heroCentered}>
          <View style={styles.iconCircle}>
            <AddressBook size={36} color={colors.accent} weight="regular" />
          </View>
          <Text style={styles.heroTitle}>No matches yet</Text>
          <Text style={styles.heroBody}>
            Share an invite so friends can join.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share an invite link"
            onPress={handleInvite}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && styles.primaryCtaPressed,
            ]}
          >
            <Text style={styles.primaryCtaText}>Share invite link</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList<FriendCandidate>
        data={candidates}
        keyExtractor={(item) => item.uid}
        renderItem={renderCandidate}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Already on MovieMatch</Text>
            <Text style={styles.listSubtitle}>
              Tap Add to send a friend request.
            </Text>
          </View>
        }
      />
    );
  };

  return <View style={styles.container}>{renderBody()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: spacing.lg,
  },
  heroCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.titleLg,
    color: colors.textHigh,
    textAlign: 'center',
  },
  heroBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    minHeight: 48,
    minWidth: 220,
    ...shadows.md,
  },
  primaryCtaPressed: {
    backgroundColor: colors.accentHover,
  },
  primaryCtaText: {
    ...typography.button,
    color: colors.accentForeground,
  },
  secondaryCta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  secondaryCtaText: {
    ...typography.button,
    color: colors.accentSecondary,
  },
  loaderText: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  listTitle: {
    ...typography.titleMd,
    color: colors.textHigh,
  },
  listSubtitle: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  candidateBody: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  candidateName: {
    ...typography.titleSm,
    color: colors.textHigh,
  },
  candidateLabels: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },
  addCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    minHeight: 36,
    minWidth: 64,
    justifyContent: 'center',
  },
  addCtaPressed: {
    backgroundColor: colors.accentHover,
  },
  addCtaPending: {
    backgroundColor: colors.surfaceRaised,
  },
  addCtaText: {
    ...typography.label,
    color: colors.accentForeground,
  },
  addCtaTextPending: {
    ...typography.label,
    color: colors.textSecondary,
  },
  errorBanner: {
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

export default ContactOnboardingScreen;
