/**
 * Sprint 5a — user-doc split migration tests.
 *
 * Asserts:
 *   - First run creates /users/{uid}/public/profile from private fields.
 *   - Second run (public profile already exists) is a no-op.
 *   - Missing private doc is tolerated (empty fields get defaulted).
 *   - tasteProfile.labels is copied across; other fields are NOT.
 *   - Log doc at /migrations/{uid} is written on first run.
 */

import { runUserDocSplitMigration } from '../utils/migrations/2026-04-userDocSplit';
import * as firestore from 'firebase/firestore';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

describe('userDocSplit migration (Sprint 5a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('first run: creates public/profile from private doc fields', async () => {
    // Public doc does NOT exist yet; private doc has all public-surface fields.
    mocked(firestore.getDoc)
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          profileName: 'Maya',
          photoURL: 'https://example.com/a.jpg',
          email: 'maya@example.com', // private — MUST NOT cross over
          tasteProfile: {
            axes: { pacing: 0 },
            labels: { common: 'late-night', rare: 'slow cinema' },
          },
        }),
      });

    const result = await runUserDocSplitMigration('user-maya');

    expect(result.status).toBe('migrated');

    // The public/profile write call.
    expect(mocked(firestore.setDoc)).toHaveBeenCalled();
    const publicWrite = mocked(firestore.setDoc).mock.calls[0];
    expect(publicWrite[1]).toMatchObject({
      displayName: 'Maya',
      photoURL: 'https://example.com/a.jpg',
      tasteLabels: { common: 'late-night', rare: 'slow cinema' },
      contactHashes: [],
    });
    // Email must NOT have leaked across.
    expect(publicWrite[1]).not.toHaveProperty('email');

    // /migrations/{uid} log doc was written too.
    const anyMigrationWrite = mocked(firestore.setDoc).mock.calls.some(
      (c) =>
        c[1] &&
        typeof c[1] === 'object' &&
        'event' in c[1] &&
        (c[1] as { event: string }).event === 'userDocSplit',
    );
    expect(anyMigrationWrite).toBe(true);
  });

  it('second run: public/profile already exists — no-op', async () => {
    // Public doc already exists → migration must skip.
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ displayName: 'Maya', photoURL: null }),
    });

    const result = await runUserDocSplitMigration('user-maya');

    expect(result.status).toBe('skipped');
    // No setDoc calls means no duplicate writes — idempotent.
    expect(mocked(firestore.setDoc)).not.toHaveBeenCalled();
  });

  it('tolerates a missing private doc (defaults to nulls + empty hashes)', async () => {
    // Public doesn't exist; private also doesn't exist (edge case: very
    // fresh account mid-signup). Migration should still succeed and
    // write a public doc with null/empty defaults.
    mocked(firestore.getDoc)
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      })
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      });

    const result = await runUserDocSplitMigration('user-fresh');

    expect(result.status).toBe('migrated');
    const publicWrite = mocked(firestore.setDoc).mock.calls[0];
    expect(publicWrite[1]).toMatchObject({
      displayName: null,
      photoURL: null,
      tasteLabels: null,
      contactHashes: [],
    });
  });

  it('throws on empty userId', async () => {
    await expect(runUserDocSplitMigration('')).rejects.toThrow(/empty userId/);
  });

  it('second run is truly idempotent — tolerates repeated invocations', async () => {
    // First call: public exists → skip.
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({}),
    });
    const first = await runUserDocSplitMigration('user-repeat');
    expect(first.status).toBe('skipped');

    // Second call: same — still a skip.
    mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({}),
    });
    const second = await runUserDocSplitMigration('user-repeat');
    expect(second.status).toBe('skipped');

    // Across both invocations: zero writes. Pure observer.
    expect(mocked(firestore.setDoc)).not.toHaveBeenCalled();
  });
});
