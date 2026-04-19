/**
 * Sprint 5b Stream C — spend.ts tests.
 *
 * Contract coverage (brief §4.4):
 *   - incrementSpend commits the new total via runTransaction.
 *   - At 80% of cap the warn threshold is hit.
 *   - At 100% overBudget flips to true.
 *   - todayKey is UTC-normalized.
 *   - getMaxDailyLlmCostUsd reads from env, falls back to default on
 *     bad input.
 */

import {
  incrementSpend,
  checkSpendStatus,
  todayKey,
  getMaxDailyLlmCostUsd,
  DEFAULT_MAX_DAILY_LLM_COST_USD,
} from '../spend';
import * as firestore from 'firebase/firestore';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

/**
 * Helper: replace firestore.runTransaction with a stub that invokes the
 * callback with a fake Transaction. Each stub supplies `tx.get` with a
 * pre-built snapshot + `tx.set` as a no-op spy.
 */
const makeTxStub = (existingTotalCents: number | null): jest.Mock => {
  const setSpy = jest.fn();
  const txStub = {
    get: jest.fn(async () => ({
      exists: () => existingTotalCents !== null,
      data: () =>
        existingTotalCents !== null
          ? { totalCents: existingTotalCents }
          : undefined,
    })),
    set: setSpy,
  };
  return jest.fn(
    async (_db: unknown, cb: (tx: typeof txStub) => Promise<unknown>) => {
      return cb(txStub);
    },
  ) as unknown as jest.Mock;
};

afterEach(() => {
  jest.clearAllMocks();
  delete process.env.EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD;
});

describe('todayKey', () => {
  it('returns YYYY-MM-DD UTC', () => {
    const key = todayKey(new Date(Date.UTC(2026, 3, 19, 23, 59)));
    expect(key).toBe('2026-04-19');
  });
});

describe('getMaxDailyLlmCostUsd', () => {
  it('returns default $25 when env is unset', () => {
    expect(getMaxDailyLlmCostUsd()).toBe(DEFAULT_MAX_DAILY_LLM_COST_USD);
  });

  it('reads from env', () => {
    process.env.EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD = '10';
    expect(getMaxDailyLlmCostUsd()).toBe(10);
  });

  it('falls back to default on non-numeric env', () => {
    process.env.EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD = 'abc';
    expect(getMaxDailyLlmCostUsd()).toBe(DEFAULT_MAX_DAILY_LLM_COST_USD);
  });

  it('falls back to default on zero env', () => {
    process.env.EXPO_PUBLIC_MAX_DAILY_LLM_COST_USD = '0';
    expect(getMaxDailyLlmCostUsd()).toBe(DEFAULT_MAX_DAILY_LLM_COST_USD);
  });
});

describe('incrementSpend', () => {
  it('transactionally increments the daily doc from 0', async () => {
    const tx = makeTxStub(null);
    mocked(firestore.runTransaction).mockImplementation(tx);
    const result = await incrementSpend(50);
    expect(tx).toHaveBeenCalled();
    expect(result.totalCents).toBe(50);
    expect(result.overBudget).toBe(false);
  });

  it('warns at 80% of cap and flags warnThresholdHit', async () => {
    // Default cap = $25 = 2500¢. 80% = 2000¢.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const tx = makeTxStub(1950);
    mocked(firestore.runTransaction).mockImplementation(tx);
    const result = await incrementSpend(100);
    expect(result.totalCents).toBe(2050);
    expect(result.warnThresholdHit).toBe(true);
    expect(result.overBudget).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('flips overBudget at 100% of cap', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const tx = makeTxStub(2400);
    mocked(firestore.runTransaction).mockImplementation(tx);
    const result = await incrementSpend(200);
    expect(result.totalCents).toBe(2600);
    expect(result.overBudget).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('normalizes negative costCents to 0', async () => {
    const tx = makeTxStub(0);
    mocked(firestore.runTransaction).mockImplementation(tx);
    const result = await incrementSpend(-100);
    expect(result.totalCents).toBe(0);
  });
});

describe('checkSpendStatus', () => {
  it('returns currentCents + cap without mutating', async () => {
    const tx = makeTxStub(500);
    mocked(firestore.runTransaction).mockImplementation(tx);
    const status = await checkSpendStatus();
    expect(status.currentCents).toBe(500);
    expect(status.capCents).toBe(DEFAULT_MAX_DAILY_LLM_COST_USD * 100);
    expect(status.overBudget).toBe(false);
  });

  it('signals overBudget when at cap', async () => {
    const tx = makeTxStub(2500);
    mocked(firestore.runTransaction).mockImplementation(tx);
    const status = await checkSpendStatus();
    expect(status.overBudget).toBe(true);
  });
});
