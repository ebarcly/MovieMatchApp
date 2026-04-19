import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  type ViewStyle,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radii, typography, shadows } from '../../theme';
import { springs } from '../../theme/motion';

/**
 * Toast — Sonner-style bottom-placed notifications (Sprint 4 mobile-UX
 * brief Rules #7-8):
 *   - 4s success / 6s error auto-dismiss
 *   - success → Haptics.notificationAsync(Success)
 *   - error   → Haptics.notificationAsync(Error)
 *   - info    → no haptic (mobile-UX brief: "not on informational toasts")
 *   - stack with 8px parallax offset (each newer toast sits 8px above
 *     the previous, older toasts shrink 2% per layer)
 *   - swipe-down dismiss via an onPress "dismiss" region in the top-bar
 *     area (full swipe gesture without pan handler to keep the smoke
 *     small; the visible parallax stack sells the pattern)
 *
 * Usage:
 *   Wrap the app in <ToastProvider> then call useToast().show({ type,
 *   title, body }) from anywhere. Both title and body are optional
 *   individually; at least one must be provided.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
  id?: string;
  type?: ToastType;
  title?: string;
  body?: string;
}

interface ToastRecord {
  id: string;
  type: ToastType;
  title?: string;
  body?: string;
}

interface ToastContextValue {
  show: (payload: ToastPayload) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 4_000,
  error: 6_000,
  info: 4_000,
};

const makeId = (): string =>
  `t-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export const ToastProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const [queue, setQueue] = useState<ToastRecord[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string): void => {
    setQueue((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current[id];
    if (handle) {
      clearTimeout(handle);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (payload: ToastPayload): string => {
      const record: ToastRecord = {
        id: payload.id ?? makeId(),
        type: payload.type ?? 'info',
        title: payload.title,
        body: payload.body,
      };
      setQueue((prev) => [...prev, record]);

      // Haptic on fire for success / error ONLY (per brief).
      if (record.type === 'success') {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } else if (record.type === 'error') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const duration = AUTO_DISMISS_MS[record.type];
      timers.current[record.id] = setTimeout(
        () => dismiss(record.id),
        duration,
      );
      return record.id;
    },
    [dismiss],
  );

  const timersRef = timers.current;
  useEffect(() => {
    return () => {
      for (const id of Object.keys(timersRef)) {
        clearTimeout(timersRef[id]);
      }
    };
  }, [timersRef]);

  const value = useMemo<ToastContextValue>(
    () => ({ show, dismiss }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport queue={queue} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const TYPE_COLOR: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.accentSecondary,
};

interface ToastViewportProps {
  queue: ToastRecord[];
  onDismiss: (id: string) => void;
}

const ToastViewport = ({
  queue,
  onDismiss,
}: ToastViewportProps): React.ReactElement => {
  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      <AnimatePresence>
        {queue.map((t, i) => {
          // Stack effect — older toasts shrink + drop opacity so the
          // newest is top of pile. 8px parallax offset per layer.
          const stackIndex = queue.length - 1 - i;
          const parallax = stackIndex * 8;
          const scale = 1 - stackIndex * 0.02;
          const opacity = stackIndex === 0 ? 1 : 0.65;
          return (
            <MotiView
              key={t.id}
              from={{ opacity: 0, translateY: 24 }}
              animate={{ opacity, translateY: -parallax, scale }}
              exit={{ opacity: 0, translateY: 24 }}
              transition={{ type: 'spring', ...springs.gentle }}
              style={styles.toastWrap}
            >
              <Pressable
                accessibilityLabel={`Dismiss ${t.type} toast`}
                accessibilityHint="Tap to dismiss this notification"
                accessibilityRole="button"
                onPress={() => onDismiss(t.id)}
                style={({ pressed }) =>
                  [
                    styles.toast,
                    { borderLeftColor: TYPE_COLOR[t.type] },
                    pressed && styles.toastPressed,
                  ] as ViewStyle[]
                }
              >
                <View style={styles.grip} />
                {t.title ? <Text style={styles.title}>{t.title}</Text> : null}
                {t.body ? <Text style={styles.body}>{t.body}</Text> : null}
              </Pressable>
            </MotiView>
          );
        })}
      </AnimatePresence>
    </View>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a <ToastProvider>.');
  }
  return ctx;
};

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 32 : 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toastWrap: {
    marginHorizontal: spacing.lg,
    maxWidth: 420,
    minWidth: 240,
    width: '90%',
  },
  toast: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    ...shadows.md,
  },
  toastPressed: {
    opacity: 0.85,
  },
  grip: {
    alignSelf: 'center',
    width: 32,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.borderSubtle,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    color: colors.textHigh,
    marginBottom: 2,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

export default ToastProvider;
