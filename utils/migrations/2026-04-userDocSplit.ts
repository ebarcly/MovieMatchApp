import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type { TasteProfile } from '../firebaseOperations';

/**
 * Sprint 5a — one-shot user-doc split migration.
 *
 * Pre-5a: `/users/{uid}` was a single mixed doc — email + tasteProfile +
 * interactedTitles + profileImage + displayName all in one place. Any
 * cross-user read for friend graph / match% would leak private fields.
 *
 * Post-5a split:
 *   - `/users/{uid}` stays the PRIVATE root (email, phone, tasteProfile,
 *     interactedTitles, genres, streamingServices, settings).
 *   - `/users/{uid}/public/profile` is the PUBLIC subcollection
 *     (displayName, photoURL, tasteLabels, contactHashes, timestamps).
 *     Sprint 5b match% + why-you-match MUST read from here and never
 *     join against the private doc.
 *
 * This migration is idempotent: on a second run the public doc exists,
 * we skip the write and return early. Missing private fields are
 * tolerated — we write whatever public-surface fields exist (defaulting
 * contactHashes to []). Safe to run before the user has a displayName
 * or photoURL set.
 *
 * A structured event is logged to `/migrations/{uid}` for debugging
 * rollouts; that doc doubles as the idempotence guard at the
 * server-side rule layer (5a doesn't need this, but 5b+ can lean on it).
 */

/** Shape of the public profile subcollection doc. */
export interface PublicProfile {
  displayName: string | null;
  photoURL: string | null;
  tasteLabels: TasteProfile['labels'] | null;
  contactHashes: string[];
  createdAt: unknown;
  updatedAt: unknown;
}

export interface MigrationResult {
  /** 'skipped' — public profile already exists. */
  /** 'migrated' — first run; public profile created. */
  status: 'skipped' | 'migrated';
  /** Present only when status === 'migrated'. */
  wrote?: Partial<PublicProfile>;
}

/**
 * Run the user-doc split migration for a single uid.
 *
 * Idempotent: if `/users/{uid}/public/profile` already exists, returns
 * `{ status: 'skipped' }` without writing. On first run, copies public
 * surfaces from `/users/{uid}` and creates the subcollection doc, then
 * writes `/migrations/{uid}` with `{ event: 'userDocSplit', migratedAt }`.
 */
export async function runUserDocSplitMigration(
  userId: string,
): Promise<MigrationResult> {
  if (!userId) {
    throw new Error('runUserDocSplitMigration: empty userId');
  }

  const publicRef = doc(db, 'users', userId, 'public', 'profile');
  const existing = await getDoc(publicRef);

  // Idempotent guard — if the public profile already exists, skip.
  if (existing.exists()) {
    return { status: 'skipped' };
  }

  // Pull the private doc for public-surface field extraction.
  const privateRef = doc(db, 'users', userId);
  const privateSnap = await getDoc(privateRef);
  const privateData = privateSnap.exists()
    ? ((privateSnap.data() ?? {}) as {
        profileName?: string;
        displayName?: string;
        photoURL?: string;
        tasteProfile?: TasteProfile;
      })
    : {};

  const publicPayload: Omit<PublicProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    displayName: privateData.displayName ?? privateData.profileName ?? null,
    photoURL: privateData.photoURL ?? null,
    tasteLabels: privateData.tasteProfile?.labels ?? null,
    contactHashes: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(publicRef, publicPayload);

  // Debug log. Best-effort — if this write fails, the migration itself
  // still succeeded and the next run will skip cleanly.
  try {
    const migrationRef = doc(db, 'migrations', userId);
    await setDoc(migrationRef, {
      event: 'userDocSplit',
      uid: userId,
      migratedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('migrations log write failed (non-fatal):', err);
  }

  return { status: 'migrated', wrote: publicPayload };
}
