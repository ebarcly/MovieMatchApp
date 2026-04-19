/**
 * useWhyYouMatch — Sprint 5b Stream C UI hook.
 *
 * Wires the `LLMClient.whyYouMatch` call into the React tree.
 * DotLoader policy (brief §5 + ratified 2026-04-18):
 *   - Show DotLoader up to 1500ms.
 *   - At 1500ms, if the real response hasn't resolved, render the
 *     deterministic fallback.
 *   - If the real response arrives within the next 500ms window
 *     (<=2000ms total), cross-fade in (180ms).
 *   - Never swap after 2000ms — mid-read replacement is jarring.
 *
 * Strict PII: this hook takes the REAL friend displayName as a
 * parameter and substitutes it INTO the `{displayLabel}` placeholder
 * AFTER the LLM returns. The name NEVER leaves the device boundary
 * into the prompt pipeline (validated in AnthropicLLMClient + pii.ts).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LLMClient,
  WhyYouMatchInput,
  WhyYouMatchOutput,
} from '../utils/ai/LLMClient';
import { whyYouMatchFallback } from '../utils/ai/fallbacks';
import { buildCacheKey, getFromCache, setInCache } from '../utils/ai/cache';

export const DOT_LOADER_FALLBACK_AT_MS = 1500;
export const LATE_SWAP_CUTOFF_MS = 2000;
export const CROSS_FADE_MS = 180;

export interface UseWhyYouMatchOptions {
  client: LLMClient;
  input: WhyYouMatchInput;
  /** Real friend first name — substituted into `{displayLabel}` locally. */
  friendDisplayName: string;
  /** Both participant uids — used for the Firestore cache key only. */
  uidPair: [string, string];
}

export interface UseWhyYouMatchState {
  /** Human-ready sentence (placeholder already substituted). */
  text: string;
  loading: boolean;
  degraded: boolean;
  fromCache: boolean;
}

export function substituteDisplayLabel(
  raw: string,
  friendDisplayName: string,
): string {
  // Defensive: if the model forgot the placeholder, we at least don't
  // leak anything — render as-is.
  return raw.replace(/\{displayLabel\}/g, friendDisplayName);
}

export function useWhyYouMatch(
  opts: UseWhyYouMatchOptions,
): UseWhyYouMatchState {
  const { client, input, friendDisplayName, uidPair } = opts;

  const fallbackRaw = useMemo(
    () =>
      whyYouMatchFallback({
        signalTier: input.overlap.signalTier,
        sharedGenre: input.overlap.sharedGenres[0],
        sharedMood: input.overlap.sharedMoods[0],
      }),
    [
      input.overlap.signalTier,
      input.overlap.sharedGenres,
      input.overlap.sharedMoods,
    ],
  );

  const [state, setState] = useState<UseWhyYouMatchState>({
    text: '',
    loading: true,
    degraded: false,
    fromCache: false,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackShown = false;

    const scheduleFallback = () => {
      fallbackTimer = setTimeout(() => {
        if (cancelled || !mountedRef.current) return;
        fallbackShown = true;
        setState({
          text: substituteDisplayLabel(fallbackRaw, friendDisplayName),
          loading: false,
          degraded: true,
          fromCache: false,
        });
      }, DOT_LOADER_FALLBACK_AT_MS);
    };

    const apply = (raw: string, degraded: boolean, fromCache: boolean) => {
      if (cancelled || !mountedRef.current) return;
      const elapsed = Date.now() - startedAt;
      // Never swap after 2000ms — mid-read replacement is jarring.
      if (fallbackShown && elapsed > LATE_SWAP_CUTOFF_MS) return;
      setState({
        text: substituteDisplayLabel(raw, friendDisplayName),
        loading: false,
        degraded,
        fromCache,
      });
    };

    scheduleFallback();

    (async () => {
      // 1) Cache lookup (PII-free uid-pair hash).
      try {
        const hash = await buildCacheKey({ kind: 'why-you-match', uidPair });
        const cached = await getFromCache(hash);
        if (cached.hit && typeof cached.payload === 'string') {
          apply(cached.payload, false, true);
          if (fallbackTimer) clearTimeout(fallbackTimer);
          return;
        }
      } catch {
        // Ignore cache errors — proceed to live call.
      }

      // 2) Live LLM call.
      let result: WhyYouMatchOutput;
      try {
        result = await client.whyYouMatch(input);
      } catch {
        return; // Fallback timer already handles this path.
      }
      apply(result.text, result.degraded, false);
      if (fallbackTimer) clearTimeout(fallbackTimer);

      // 3) Populate cache on success.
      if (!result.degraded) {
        try {
          const hash = await buildCacheKey({ kind: 'why-you-match', uidPair });
          await setInCache(hash, {
            kind: 'why-you-match',
            payload: result.text,
            costCents: result.costCents,
          });
        } catch {
          // Best-effort.
        }
      }
    })();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client,
    friendDisplayName,
    uidPair[0],
    uidPair[1],
    fallbackRaw,
    input.overlap.signalTier,
  ]);

  return state;
}
