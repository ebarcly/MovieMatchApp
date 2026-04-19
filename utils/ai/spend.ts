/**
 * Daily LLM spend tracking — brief §4.4.
 *
 * /aiSpend/{yyyy-mm-dd} doc with `totalCents: number`, transactionally
 * incremented on every NON-cached LLM call. Cached calls don't incur
 * cost and don't touch this collection.
 *
 * Cap default: `$25/day` (ratified Sprint 5b decision, brief §4.4).
 * Env override: `EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD`. At 80% log.warn;
 * at 100% return `{ overBudget: true }` and the caller returns the
 * deterministic fallback.
 *
 * NO PII: uid/displayName/email are NEVER written to /aiSpend.
 */

import {
  doc,
  runTransaction,
  type DocumentReference,
  type Transaction,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// --- Config ------------------------------------------------------------

/** Default daily cap in USD. Ratified 2026-04-18. */
export const DEFAULT_MAX_DAILY_LLM_COST_USD = 25;

/**
 * Read the daily cap from env, default to $25. Exported so tests can
 * override via `process.env.EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD` and
 * the caller + spend.ts agree on the same source of truth.
 */
export function getMaxDailyLlmCostUsd(): number {
  const raw = process.env.EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD;
  if (!raw) return DEFAULT_MAX_DAILY_LLM_COST_USD;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    // Bad env value — fall back to default rather than silently allow
    // unbounded spend.
    return DEFAULT_MAX_DAILY_LLM_COST_USD;
  }
  return parsed;
}

/** UTC-day key in YYYY-MM-DD form. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Doc shape ---------------------------------------------------------

export interface AiSpendDoc {
  totalCents: number;
  // No uid/displayName/email here, by design.
}

function spendDocRef(dayKey: string): DocumentReference {
  return doc(db, 'aiSpend', dayKey);
}

// --- Pre-flight (no mutation) ----------------------------------------

export interface SpendStatus {
  /** Current day cents spent before this call. */
  currentCents: number;
  /** The configured cap in cents. */
  capCents: number;
  overBudget: boolean;
  warnThresholdHit: boolean;
}

export async function checkSpendStatus(
  dayKey: string = todayKey(),
): Promise<SpendStatus> {
  const capUsd = getMaxDailyLlmCostUsd();
  const capCents = Math.floor(capUsd * 100);
  try {
    const current = await readTotalCents(dayKey);
    return {
      currentCents: current,
      capCents,
      overBudget: current >= capCents,
      warnThresholdHit: current >= Math.floor(capCents * 0.8),
    };
  } catch (err) {
    console.warn('[ai/spend] checkSpendStatus error', err);
    return {
      currentCents: 0,
      capCents,
      overBudget: false,
      warnThresholdHit: false,
    };
  }
}

async function readTotalCents(dayKey: string): Promise<number> {
  const ref = spendDocRef(dayKey);
  try {
    return await runTransaction(db, async (tx: Transaction) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 0;
      const data = snap.data() as AiSpendDoc | undefined;
      return typeof data?.totalCents === 'number' ? data.totalCents : 0;
    });
  } catch (err) {
    console.warn('[ai/spend] readTotalCents error', err);
    return 0;
  }
}

// --- Increment (atomic) -----------------------------------------------

export interface IncrementResult {
  totalCents: number;
  /** True iff AFTER this increment, the daily cap has been reached. */
  overBudget: boolean;
  warnThresholdHit: boolean;
}

/**
 * Transactionally increment today's spend doc by `costCents`. If the
 * increment would CROSS 80% of the cap, logs a warning. If the
 * increment crosses 100%, logs warning and returns `overBudget: true`.
 *
 * Callers SHOULD check `overBudget` BEFORE making the LLM call (via
 * `checkSpendStatus`) to avoid the fire-then-degrade race; this
 * function is the authoritative gate for whether the UI should take
 * the fallback path on the NEXT call.
 */
export async function incrementSpend(
  costCents: number,
  dayKey: string = todayKey(),
): Promise<IncrementResult> {
  const capUsd = getMaxDailyLlmCostUsd();
  const capCents = Math.floor(capUsd * 100);
  if (!Number.isFinite(costCents) || costCents < 0) {
    costCents = 0;
  }
  const ref = spendDocRef(dayKey);
  let newTotal = 0;
  try {
    await runTransaction(db, async (tx: Transaction) => {
      const snap = await tx.get(ref);
      const existing = snap.exists()
        ? ((snap.data() as AiSpendDoc).totalCents ?? 0)
        : 0;
      newTotal = existing + costCents;
      const body: AiSpendDoc = { totalCents: newTotal };
      tx.set(ref, body, { merge: true });
    });
  } catch (err) {
    console.warn('[ai/spend] incrementSpend error', err);
    return { totalCents: 0, overBudget: false, warnThresholdHit: false };
  }
  const warnCents = Math.floor(capCents * 0.8);
  const warnThresholdHit = newTotal >= warnCents;
  const overBudget = newTotal >= capCents;
  if (overBudget) {
    // reason: MAX_DAILY_LLM_COST_USD has been reached; rest of the UTC day degrades to fallbacks.
    console.warn(
      `[ai/spend] daily LLM cap reached: ${newTotal}¢ / ${capCents}¢ (MAX_DAILY_LLM_COST_USD=$${capUsd})`,
    );
  } else if (warnThresholdHit) {
    console.warn(
      `[ai/spend] >=80% of daily cap: ${newTotal}¢ / ${capCents}¢ (MAX_DAILY_LLM_COST_USD=$${capUsd})`,
    );
  }
  return { totalCents: newTotal, overBudget, warnThresholdHit };
}
