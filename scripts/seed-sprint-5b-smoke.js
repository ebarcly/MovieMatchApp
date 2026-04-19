/**
 * Sprint 5b smoke-data seeder — one-shot.
 *
 * Seeds the minimum Firestore state the 13-step manual iPhone smoke
 * needs on a single device (no parallel browsers / no 2nd phone):
 *
 *   - `/friendships/{lo_hi}` with status='accepted' between User A and
 *     User B (using the app's own rule flow: A creates pending, B accepts).
 *   - `interactedTitleIds` + `genres` + `streamingServices` on BOTH users'
 *     `/users/{uid}/public/profile` so `matchScore.ts` returns a non-zero
 *     score AND shares a non-empty top-3 title list for the FriendDetail
 *     "Top shared titles" row.
 *   - A pre-made `/queues/{smoke-test-queue}` with both participants and
 *     3 titles, so Stream D's QueueStrip + QueueDetailScreen have
 *     something to render without a "create queue" UI (deferred to Sprint 6).
 *
 * Usage:
 *   node --env-file=.env scripts/seed-sprint-5b-smoke.js
 *
 *   You'll be prompted for:
 *     - User A password  (A's email is hardcoded below)
 *     - User B email
 *     - User B password
 *
 *   Env overrides (optional, skip prompts):
 *     SEED_A_PASSWORD, SEED_B_EMAIL, SEED_B_PASSWORD
 *
 * The script is idempotent:
 *   - If the friendship doc exists, skips re-create (A's phase).
 *   - If already accepted, skips re-update (B's phase).
 *   - If the queue doc exists, skips re-create.
 *   - Public-profile writes always merge, so re-running is safe.
 *
 * The script exits non-zero on any auth / rule / schema failure with a
 * clear [seed] prefix so you can tell what broke.
 */

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { initializeApp } = require('firebase/app');
const {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} = require('firebase/auth');
const {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} = require('firebase/firestore');

// --- Config (from .env via `node --env-file=.env`) ---------------------

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey) {
  console.error(
    '[seed] Firebase config missing. Run with: node --env-file=.env scripts/seed-sprint-5b-smoke.js',
  );
  process.exit(1);
}

// --- Fixtures (hardcoded to the UIDs you pasted in chat) ---------------

const A_UID = 'aWubmgPkgNgcHEhMOMynFeZ02fo1';
const B_UID = 'Xt2Bhinf2aeBiyjdlam1RDVpSRz1';
const A_EMAIL = 'new1@gmail.com';

// Lex-sort per friendship schema (uppercase 'X' < lowercase 'a' in ASCII,
// so B_UID sorts BEFORE A_UID).
const [LO_UID, HI_UID] = [A_UID, B_UID].sort();
const FRIENDSHIP_ID = `${LO_UID}_${HI_UID}`;

// Overlap fixtures — TMDB IDs for movies with reliable posters.
// Sharing these between A and B produces a non-empty matchScore.sharedTitleIds,
// a non-empty overlap in shared genres, and a non-zero matchScore.score.
const SHARED_TITLE_IDS = [550, 13, 680, 155, 27205];
// Fight Club, Forrest Gump, Pulp Fiction, The Dark Knight, Inception.

const A_PROFILE_SEED = {
  interactedTitleIds: SHARED_TITLE_IDS,
  genres: ['sci-fi', 'drama', 'thriller'],
  streamingServices: ['netflix', 'hbo-max'],
  updatedAt: serverTimestamp(),
};

const B_PROFILE_SEED = {
  interactedTitleIds: SHARED_TITLE_IDS,
  genres: ['sci-fi', 'noir', 'thriller'],
  streamingServices: ['netflix', 'prime'],
  updatedAt: serverTimestamp(),
};

const QUEUE_ID = 'smoke-test-queue';
const QUEUE_SEED = {
  participants: [LO_UID, HI_UID],
  name: 'Smoke test queue',
  orderedTitleIds: [550, 13, 680],
  reactions: {},
  nextPickUid: A_UID,
  createdAt: serverTimestamp(),
};

// --- Small prompt helper ------------------------------------------------

async function prompt(question) {
  const rl = readline.createInterface({ input, output, terminal: true });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function promptOrEnv(envKey, question) {
  const v = process.env[envKey];
  if (v && v.length > 0) return v;
  return prompt(question);
}

// --- Main ---------------------------------------------------------------

async function main() {
  console.log('[seed] Sprint 5b smoke-data seeder');
  console.log(`[seed] A_UID           = ${A_UID}`);
  console.log(`[seed] B_UID           = ${B_UID}`);
  console.log(`[seed] FRIENDSHIP_ID   = ${FRIENDSHIP_ID}`);
  console.log(`[seed] QUEUE_ID        = ${QUEUE_ID}`);
  console.log(`[seed] shared titles   = ${SHARED_TITLE_IDS.join(', ')}`);
  console.log('');

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // --- Phase A: sign in as A -------------------------------------------

  const aPassword = await promptOrEnv(
    'SEED_A_PASSWORD',
    `Password for ${A_EMAIL} (User A): `,
  );
  const aCred = await signInWithEmailAndPassword(auth, A_EMAIL, aPassword);
  if (aCred.user.uid !== A_UID) {
    console.error(
      `[seed] signed-in uid ${aCred.user.uid} != expected A_UID ${A_UID}`,
    );
    process.exit(1);
  }
  console.log('[seed] signed in as A ✓');

  // Write A's public profile (merge — never clobbers displayName/photoURL/
  // tasteLabels/contactHashes that the app's onboarding wrote earlier).
  await setDoc(doc(db, 'users', A_UID, 'public', 'profile'), A_PROFILE_SEED, {
    merge: true,
  });
  console.log(
    '[seed] A /public/profile merged: interactedTitleIds + genres + streamingServices ✓',
  );

  // Create friendship — pending, initiatedBy=A. Idempotent.
  const friendshipRef = doc(db, 'friendships', FRIENDSHIP_ID);
  const friendshipSnap = await getDoc(friendshipRef);
  if (!friendshipSnap.exists()) {
    await setDoc(friendshipRef, {
      participants: [LO_UID, HI_UID],
      status: 'pending',
      createdAt: serverTimestamp(),
      initiatedBy: A_UID,
    });
    console.log('[seed] friendship created (pending) by A ✓');
  } else {
    console.log(
      `[seed] friendship ${FRIENDSHIP_ID} already exists (status=${friendshipSnap.data().status}), skipping create`,
    );
  }

  // Create the queue — idempotent deterministic ID.
  const queueRef = doc(db, 'queues', QUEUE_ID);
  const queueSnap = await getDoc(queueRef);
  if (!queueSnap.exists()) {
    await setDoc(queueRef, QUEUE_SEED);
    console.log(`[seed] queue ${QUEUE_ID} created ✓`);
  } else {
    console.log(`[seed] queue ${QUEUE_ID} already exists, skipping create`);
  }

  // --- Phase B: sign out, sign in as B ---------------------------------

  await signOut(auth);

  const bEmail = await promptOrEnv('SEED_B_EMAIL', 'User B email: ');
  const bPassword = await promptOrEnv(
    'SEED_B_PASSWORD',
    `Password for ${bEmail} (User B): `,
  );
  const bCred = await signInWithEmailAndPassword(auth, bEmail, bPassword);
  if (bCred.user.uid !== B_UID) {
    console.error(
      `[seed] signed-in uid ${bCred.user.uid} != expected B_UID ${B_UID}`,
    );
    process.exit(1);
  }
  console.log('[seed] signed in as B ✓');

  // B's public profile seed.
  await setDoc(doc(db, 'users', B_UID, 'public', 'profile'), B_PROFILE_SEED, {
    merge: true,
  });
  console.log(
    '[seed] B /public/profile merged: interactedTitleIds + genres + streamingServices ✓',
  );

  // Accept friendship as B — transitions pending → accepted.
  const friendshipSnap2 = await getDoc(friendshipRef);
  const currentStatus = friendshipSnap2.data()?.status;
  if (currentStatus === 'pending') {
    await updateDoc(friendshipRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
    });
    console.log('[seed] friendship accepted by B ✓');
  } else if (currentStatus === 'accepted') {
    console.log('[seed] friendship already accepted, skipping');
  } else {
    console.warn(
      `[seed] friendship status=${currentStatus} — not pending, cannot accept; may need manual intervention`,
    );
  }

  // --- Summary ---------------------------------------------------------

  console.log('');
  console.log('[seed] ============ DONE ============');
  console.log(`  friendshipId : ${FRIENDSHIP_ID}`);
  console.log(`  queueId      : ${QUEUE_ID}`);
  console.log(`  shared titles: ${SHARED_TITLE_IDS.join(', ')}`);
  console.log('');
  console.log('[seed] Next: sign back in as User A on iPhone Expo Go.');
  console.log(
    '[seed]       You should see User B in the Matches tab with a match% chip.',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] FATAL:', err);
  process.exit(1);
});
