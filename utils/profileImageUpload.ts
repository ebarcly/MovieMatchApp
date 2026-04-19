import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Sprint 5a — profile image upload pipeline.
 *
 * Responsibilities:
 *
 *   1. Validate client-side: ≤2MB, image/* mime only. Reject fast with
 *      a typed error so the caller can show an inline banner (Sprint 4
 *      rule — no modal dialogs).
 *   2. Upload the selected asset's bytes to Firebase Storage at
 *      `/profileImages/{uid}/{timestamp}.jpg`.
 *   3. Write the resulting download URL to `/users/{uid}/public/profile`
 *      (so Sprint 5b friend-card surfaces read a ready-to-render URL
 *      and never touch the private root doc).
 *
 * Size + mime guards are mirrored on the server (storage.rules). The
 * client-side check is a UX shortcut — it keeps a giant upload from
 * burning seconds of wall time only to be rejected at the end. The
 * authoritative guard is the rule.
 *
 * 800×800 on-device resize is left to the image-picker's `allowsEditing`
 * + `quality` flags at the caller site. Baking a Skia/jimp resize into
 * this utility would introduce a heavy native dep; deferring to the
 * picker is the simplest valid implementation.
 */

/** 2 * 1024 * 1024 = 2097152 bytes (2MB). Mirrored in storage.rules. */
export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

export class ProfileImageError extends Error {
  readonly kind: 'too-large' | 'bad-mime' | 'fetch-failed' | 'upload-failed';
  constructor(
    kind: 'too-large' | 'bad-mime' | 'fetch-failed' | 'upload-failed',
    message: string,
  ) {
    super(message);
    this.name = 'ProfileImageError';
    this.kind = kind;
  }
}

export interface UploadedImage {
  url: string;
  storagePath: string;
}

export interface UploadInput {
  /** Local file URI as returned by expo-image-picker (`file://...`). */
  localUri: string;
  /** Mime type string. MUST begin with `image/`. */
  mimeType: string;
  /** Byte size from the picker. */
  sizeBytes: number;
}

/**
 * Validate + upload a profile image to Firebase Storage; write the
 * resulting photoURL to `/users/{uid}/public/profile` on success.
 *
 * Throws `ProfileImageError` on any guard failure so the caller can
 * map `.kind` to an inline-banner copy.
 */
export async function uploadProfileImage(
  userId: string,
  input: UploadInput,
): Promise<UploadedImage> {
  if (!userId) {
    throw new Error('uploadProfileImage: empty userId');
  }
  validateImageInput(input);

  // 1. Pull bytes from the local URI.
  let bytes: Blob;
  try {
    const response = await fetch(input.localUri);
    bytes = await response.blob();
  } catch (err) {
    throw new ProfileImageError(
      'fetch-failed',
      `Could not read local image: ${(err as Error).message}`,
    );
  }

  // 2. Upload to Firebase Storage under /profileImages/{uid}/{ts}.jpg.
  const timestamp = Date.now();
  const extension = extensionFromMime(input.mimeType);
  const storagePath = `profileImages/${userId}/${timestamp}.${extension}`;
  const fileRef = storageRef(getStorage(), storagePath);

  try {
    await uploadBytes(fileRef, bytes, { contentType: input.mimeType });
  } catch (err) {
    throw new ProfileImageError(
      'upload-failed',
      `Storage upload failed: ${(err as Error).message}`,
    );
  }

  const url = await getDownloadURL(fileRef);

  // 3. Write the photoURL to the public profile subcollection.
  const publicRef = doc(db, 'users', userId, 'public', 'profile');
  await setDoc(
    publicRef,
    { photoURL: url, updatedAt: serverTimestamp() },
    { merge: true },
  );

  return { url, storagePath };
}

/** Exported for unit tests; throws `ProfileImageError` on bad input. */
export function validateImageInput(input: UploadInput): void {
  if (!input || typeof input.localUri !== 'string' || !input.localUri) {
    throw new ProfileImageError(
      'fetch-failed',
      'uploadProfileImage: missing localUri',
    );
  }
  if (
    typeof input.mimeType !== 'string' ||
    !input.mimeType.startsWith('image/')
  ) {
    throw new ProfileImageError(
      'bad-mime',
      `Only image files are supported (got ${input.mimeType}).`,
    );
  }
  if (typeof input.sizeBytes !== 'number' || input.sizeBytes <= 0) {
    throw new ProfileImageError(
      'too-large',
      'uploadProfileImage: invalid size',
    );
  }
  if (input.sizeBytes > MAX_PROFILE_IMAGE_BYTES) {
    throw new ProfileImageError(
      'too-large',
      `Image too large — max 2MB, got ${Math.round(input.sizeBytes / 1024)} KB.`,
    );
  }
}

function extensionFromMime(mime: string): string {
  // We only accept image/* so the second segment is a reasonable
  // extension approximation. Firebase Storage doesn't care about the
  // filename — the contentType stored on the object is what governs
  // downstream rendering.
  const [, subtype] = mime.toLowerCase().split('/');
  if (subtype === 'jpeg') return 'jpg';
  return subtype ?? 'bin';
}
