import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { colors, spacing, radii, typography } from '../theme';

/**
 * StoriesStrip — horizontal strip above the HomeScreen deck.
 *
 * Sprint 4 social-product brief + dopamine brief rule: when the user has
 * no friends yet (Sprint 5 friend-graph not shipped), DO NOT render a
 * literal "no stories" empty state. Instead, render ONE self-referential
 * card: the user's own avatar letter + their two taste labels. Tapping
 * it is a no-op for now (the contract allows a re-enter-deck handler).
 *
 * When a real friend-activity shape lands in Sprint 5 this component
 * switches to the persistent-activity source of truth (NOT a 24h-decay
 * Instagram-style ephemeral pattern — social-product brief Rule #3).
 */

interface TasteLabels {
  common: string;
  rare: string;
}

interface UserDocShape {
  profileName?: string;
  tasteProfile?: { labels?: TasteLabels };
}

type StripItem =
  | { kind: 'self'; initial: string; labels: TasteLabels }
  | { kind: 'placeholder'; initial: string };

const FALLBACK_LABELS: TasteLabels = {
  common: 'late-night',
  rare: 'slow cinema',
};

const StoriesStrip = (): React.ReactElement => {
  const [doc1, setDoc1] = useState<UserDocShape | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setDoc1((snap.data() as UserDocShape | undefined) ?? null);
    });
    return () => unsubscribe();
  }, []);

  const initial =
    doc1?.profileName?.trim()?.charAt(0)?.toUpperCase() ??
    auth.currentUser?.displayName?.charAt(0)?.toUpperCase() ??
    'Y';
  const labels = doc1?.tasteProfile?.labels ?? FALLBACK_LABELS;

  const data: StripItem[] = [{ kind: 'self', initial, labels }];

  const renderItem = ({
    item,
  }: ListRenderItemInfo<StripItem>): React.ReactElement => {
    if (item.kind === 'self') {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Your taste: ${item.labels.common} and ${item.labels.rare}`}
          accessibilityHint="Your own self-referential story. Friend activity will show up here."
          style={styles.card}
        >
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{item.initial}</Text>
            </View>
          </View>
          <Text style={styles.labelCommon} numberOfLines={1}>
            {item.labels.common}
          </Text>
          <Text style={styles.labelRare} numberOfLines={1}>
            {item.labels.rare}
          </Text>
        </Pressable>
      );
    }
    return <View />;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(_item, i) => `strip-${i}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 56 avatar + 4 marginBottom + 2× 16 caption line-height + 16 paddingVertical
    // = 108 min; 120 gives the rare/common labels room to breathe without clip.
    height: 120,
    paddingVertical: spacing.xs,
    backgroundColor: 'transparent',
  },
  list: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  card: {
    width: 72,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.titleSm,
    color: colors.accent,
  },
  labelCommon: {
    ...typography.caption,
    color: colors.textHigh,
    textAlign: 'center',
  },
  labelRare: {
    ...typography.caption,
    color: colors.accentSecondary,
    textAlign: 'center',
  },
});

export default StoriesStrip;
