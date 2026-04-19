import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Camera as CameraIcon } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import type { StackScreenProps } from '@react-navigation/stack';
import { auth } from '../firebaseConfig';
import {
  uploadProfileImage,
  ProfileImageError,
} from '../utils/profileImageUpload';
import Avatar from '../components/Avatar';
import DotLoader from '../components/DotLoader';
import { useToast } from '../components/Toast';
import { springs } from '../theme/motion';
import { colors, spacing, radii, typography, shadows } from '../theme';
import type { ProfileSetupStackParamList } from '../navigation/types';

/**
 * Sprint 5a — ProfilePhotoScreen.
 *
 * Flow:
 *   1. User sees a hero Avatar fallback (initial letter on tinted
 *      circle) with a "Choose a photo" primary CTA (accent-yellow pill)
 *      and a "Skip for now" secondary CTA.
 *   2. Tap the CTA → expo-image-picker opens (images-only, square crop,
 *      quality 0.7 for on-device compression).
 *   3. On select: DotLoader inline; uploadProfileImage validates +
 *      uploads + writes photoURL to /users/{uid}/public/profile.
 *   4. On success: toast.show({ type: 'success' }) + hero Avatar updates
 *      to the uploaded URL. The AppNavigator's public-profile onSnapshot
 *      fires and the user falls through to Main automatically.
 *   5. On failure: inline error banner (Sprint 4 rule — no modals).
 *
 * Props accept optional `onSkip` + `userIdOverride` so the AppNavigator
 * can mount this screen outside of a stack during the onboarding gate
 * (see ProfilePhotoGate in navigation/AppNavigator.tsx).
 */

type NavProps = StackScreenProps<ProfileSetupStackParamList, 'ProfilePhoto'>;
type Props = Partial<NavProps> & {
  onSkip?: () => void;
  userIdOverride?: string;
};

const ProfilePhotoScreen = ({
  onSkip,
  userIdOverride,
}: Props): React.ReactElement => {
  const toast = useToast();
  const userId = userIdOverride ?? auth.currentUser?.uid ?? '';
  const displayName = auth.currentUser?.displayName ?? null;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);

  const handlePick = useCallback(async () => {
    if (!userId) {
      setError('You need to be signed in to upload a photo.');
      return;
    }
    setError(null);

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Photo library access is off. Enable it in Settings.');
        return;
      }
    } catch (err) {
      console.warn('requestMediaLibraryPermissionsAsync failed', err);
      setError('Could not request photo permission.');
      return;
    }

    let asset: ImagePicker.ImagePickerAsset | undefined;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }
      asset = result.assets[0];
    } catch (err) {
      console.warn('launchImageLibraryAsync failed', err);
      setError('Could not open photo library.');
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadProfileImage(userId, {
        localUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        sizeBytes: asset.fileSize ?? 0,
      });
      setLocalPhotoURL(url);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        type: 'success',
        title: 'Photo saved',
        body: 'Your avatar is live.',
      });
    } catch (err) {
      const msg =
        err instanceof ProfileImageError
          ? err.message
          : 'Upload failed. Try another photo.';
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(false);
    }
  }, [userId, toast]);

  const handleSkip = useCallback(() => {
    if (onSkip) onSkip();
  }, [onSkip]);

  return (
    <View style={styles.container} accessibilityLabel="Profile photo setup">
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', ...springs.gentle }}
        style={styles.hero}
      >
        <Avatar
          photoURL={localPhotoURL}
          displayName={displayName}
          size="lg"
          accessibilityLabel={
            localPhotoURL ? 'Your uploaded photo' : 'Letter avatar fallback'
          }
        />
        <Text style={styles.title}>Add a photo</Text>
        <Text style={styles.body}>
          Friends spot you faster when your avatar matches your vibe.
        </Text>
      </MotiView>

      {error ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.errorBanner}
        >
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {uploading ? (
        <View style={styles.loaderRow} accessibilityLiveRegion="polite">
          <DotLoader size="md" accessibilityLabel="Uploading photo" />
          <Text style={styles.loaderText}>Uploading…</Text>
        </View>
      ) : (
        <View style={styles.ctaColumn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a photo"
            accessibilityHint="Opens your photo library to pick an avatar"
            onPress={handlePick}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && styles.primaryCtaPressed,
            ]}
          >
            <CameraIcon
              size={20}
              color={colors.accentForeground}
              weight="regular"
            />
            <Text style={styles.primaryCtaText}>Choose a photo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            accessibilityHint="Continue without uploading a photo"
            onPress={handleSkip}
            style={styles.skipCta}
          >
            <Text style={styles.skipCtaText}>Skip for now</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.titleLg,
    color: colors.textHigh,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    maxWidth: 320,
    textAlign: 'center',
  },
  ctaColumn: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
  skipCta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipCtaText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  errorBanner: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.surfaceRaised,
    alignSelf: 'stretch',
  },
  errorBannerText: {
    ...typography.body,
    color: colors.textHigh,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loaderText: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },
});

export default ProfilePhotoScreen;
