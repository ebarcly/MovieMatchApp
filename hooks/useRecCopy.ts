/**
 * useRecCopy — Sprint 5b Stream C UI hook.
 *
 * Non-streaming per ratified 2026-04-18 decision. The LLMClient returns
 * all 3 variants together; this hook exposes them as `variants: string[]`
 * along with the same DotLoader policy as useWhyYouMatch:
 *   - DotLoader up to 1500ms.
 *   - At 1500ms, swap to the deterministic fallback trio.
 *   - If the real response arrives within <=2000ms, accept it and
 *     cross-fade. Never swap after 2000ms.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LLMClient,
  RecCopyInput,
  RecCopyOutput,
} from '../utils/ai/LLMClient';
import { recCopyFallback } from '../utils/ai/fallbacks';
import {
  DOT_LOADER_FALLBACK_AT_MS,
  LATE_SWAP_CUTOFF_MS,
  CROSS_FADE_MS,
} from './useWhyYouMatch';

export interface UseRecCopyOptions {
  client: LLMClient;
  input: RecCopyInput;
}

export interface UseRecCopyState {
  variants: string[];
  loading: boolean;
  degraded: boolean;
}

export function useRecCopy(opts: UseRecCopyOptions): UseRecCopyState {
  const { client, input } = opts;

  const fallbackTrio = useMemo(
    () =>
      recCopyFallback({
        depth: input.relationshipDepth,
        titleName: input.title.name,
        titleYear: input.title.year,
      }),
    [input.relationshipDepth, input.title.name, input.title.year],
  );

  const [state, setState] = useState<UseRecCopyState>({
    variants: [],
    loading: true,
    degraded: false,
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
        setState({ variants: fallbackTrio, loading: false, degraded: true });
      }, DOT_LOADER_FALLBACK_AT_MS);
    };

    const apply = (variants: string[], degraded: boolean) => {
      if (cancelled || !mountedRef.current) return;
      const elapsed = Date.now() - startedAt;
      if (fallbackShown && elapsed > LATE_SWAP_CUTOFF_MS) return;
      setState({ variants, loading: false, degraded });
    };

    scheduleFallback();
    (async () => {
      let result: RecCopyOutput;
      try {
        result = await client.recCopy(input);
      } catch {
        return;
      }
      apply(result.variants, result.degraded);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    })();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client,
    input.title.id,
    input.title.name,
    input.relationshipDepth,
    fallbackTrio,
  ]);

  return state;
}

// Re-export for consumers who want the cross-fade timing constant.
export { CROSS_FADE_MS };
