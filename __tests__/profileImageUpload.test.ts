/**
 * Sprint 5a — profile image upload tests.
 *
 * Asserts:
 *   - too-large file is rejected with kind='too-large'
 *   - non-image mime is rejected with kind='bad-mime'
 *   - happy path writes photoURL to /users/{uid}/public/profile
 *   - empty localUri rejected
 *   - empty userId rejected
 *   - fetch failure propagates as ProfileImageError
 */

import {
  uploadProfileImage,
  validateImageInput,
  ProfileImageError,
  MAX_PROFILE_IMAGE_BYTES,
} from '../utils/profileImageUpload';
import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

type FetchFn = typeof fetch;

describe('profileImageUpload (Sprint 5a)', () => {
  const originalFetch: FetchFn | undefined = (globalThis as { fetch?: FetchFn })
    .fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch to return a Blob so the upload pipeline can proceed.
    (globalThis as { fetch?: FetchFn }).fetch = jest.fn(async () => ({
      blob: async () => new Blob(['x'], { type: 'image/jpeg' }),
    })) as unknown as FetchFn;
  });

  afterAll(() => {
    (globalThis as { fetch?: FetchFn }).fetch = originalFetch;
  });

  describe('validateImageInput', () => {
    it('rejects a too-large file (>2MB) with kind=too-large', () => {
      expect(() =>
        validateImageInput({
          localUri: 'file:///x.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 3 * 1024 * 1024, // 3MB
        }),
      ).toThrow(ProfileImageError);
      try {
        validateImageInput({
          localUri: 'file:///x.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 3 * 1024 * 1024,
        });
      } catch (err) {
        expect((err as ProfileImageError).kind).toBe('too-large');
        expect((err as Error).message).toMatch(/too large/i);
      }
    });

    it('exposes the 2MB limit as a constant', () => {
      expect(MAX_PROFILE_IMAGE_BYTES).toBe(2 * 1024 * 1024);
    });

    it('rejects non-image mime (bad-mime)', () => {
      try {
        validateImageInput({
          localUri: 'file:///x.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1000,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect((err as ProfileImageError).kind).toBe('bad-mime');
      }
    });

    it('accepts a valid image under the 2MB limit', () => {
      expect(() =>
        validateImageInput({
          localUri: 'file:///x.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 500 * 1024,
        }),
      ).not.toThrow();
    });

    it('rejects missing localUri', () => {
      expect(() =>
        validateImageInput({
          localUri: '',
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
        }),
      ).toThrow(ProfileImageError);
    });
  });

  describe('uploadProfileImage', () => {
    it('rejects empty userId', async () => {
      await expect(
        uploadProfileImage('', {
          localUri: 'file:///x.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
        }),
      ).rejects.toThrow(/empty userId/);
    });

    it('happy path — writes photoURL to /users/{uid}/public/profile', async () => {
      mocked(storage.getDownloadURL).mockResolvedValueOnce(
        'https://example.com/profileImages/user-a/42.jpg',
      );

      const result = await uploadProfileImage('user-a', {
        localUri: 'file:///a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 800 * 1024,
      });

      expect(result.url).toBe(
        'https://example.com/profileImages/user-a/42.jpg',
      );
      expect(result.storagePath).toMatch(/^profileImages\/user-a\/\d+\.jpg$/);

      // Storage: uploadBytes was called once.
      expect(mocked(storage.uploadBytes)).toHaveBeenCalledTimes(1);

      // Firestore: setDoc was called once on the public profile path
      // with photoURL + merge.
      expect(mocked(firestore.setDoc)).toHaveBeenCalled();
      const setDocCall = mocked(firestore.setDoc).mock.calls[0];
      expect(setDocCall[1]).toMatchObject({
        photoURL: 'https://example.com/profileImages/user-a/42.jpg',
      });
      expect(setDocCall[2]).toEqual({ merge: true });

      // Path: /users/{uid}/public/profile.
      expect(mocked(firestore.doc)).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'user-a',
        'public',
        'profile',
      );
    });

    it('too-large input surfaces as ProfileImageError before fetch', async () => {
      await expect(
        uploadProfileImage('user-a', {
          localUri: 'file:///a.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 5 * 1024 * 1024, // 5MB
        }),
      ).rejects.toThrow(/too large/i);
      expect(mocked(storage.uploadBytes)).not.toHaveBeenCalled();
    });

    it('non-image mime surfaces as ProfileImageError (bad-mime)', async () => {
      await expect(
        uploadProfileImage('user-a', {
          localUri: 'file:///doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1000,
        }),
      ).rejects.toThrow(/image files are supported/i);
      expect(mocked(storage.uploadBytes)).not.toHaveBeenCalled();
    });

    it('fetch failure surfaces as fetch-failed', async () => {
      (globalThis as { fetch?: FetchFn }).fetch = jest.fn(async () => {
        throw new Error('network down');
      }) as unknown as FetchFn;
      try {
        await uploadProfileImage('user-a', {
          localUri: 'file:///a.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect((err as ProfileImageError).kind).toBe('fetch-failed');
      }
    });
  });
});
