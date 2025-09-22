import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type AuthError,
  type User,
} from 'firebase/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  resetPassword,
  signIn,
  signOutUser,
  signUp,
  updateUserProfile,
} from '../src/firebase/auth';
import { auth } from '../src/firebase/config';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

// Mock Firebase config
vi.mock('../src/firebase/config', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('Firebase Auth Service', () => {
  const mockUser: User = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2023-01-01T00:00:00Z',
      lastSignInTime: '2023-01-01T00:00:00Z',
    },
    providerData: [],
    refreshToken: 'mock-token',
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn(),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
  };

  const mockAuthError: AuthError = {
    code: 'auth/invalid-email',
    message: 'Invalid email address',
    name: 'FirebaseError',
    customData: {
      appName: 'test-app',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth currentUser
    (auth as { currentUser: User | null }).currentUser = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockResult = { user: mockUser, providerId: 'password', operationType: 'signIn' };
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue(mockResult);

      const result = await signIn('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'password123',
      );
      expect(result).toEqual({
        user: mockUser,
        error: null,
      });
    });

    it('should handle sign in error', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(mockAuthError);

      const result = await signIn('invalid-email', 'password');

      expect(result).toEqual({
        user: null,
        error: mockAuthError,
      });
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const mockResult = { user: mockUser, providerId: 'password', operationType: 'signIn' };
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(mockResult);

      const result = await signUp('test@example.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'password123',
      );
      expect(result).toEqual({
        user: mockUser,
        error: null,
      });
    });

    it('should handle sign up error', async () => {
      vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(mockAuthError);

      const result = await signUp('test@example.com', 'weak');

      expect(result).toEqual({
        user: null,
        error: mockAuthError,
      });
    });
  });

  describe('signOutUser', () => {
    it('should sign out user successfully', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined);

      await expect(signOutUser()).resolves.toBeUndefined();
      expect(signOut).toHaveBeenCalledWith(auth);
    });

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed');
      vi.mocked(signOut).mockRejectedValue(error);

      await expect(signOutUser()).rejects.toThrow('Sign out failed');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);

      const result = await resetPassword('test@example.com');

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'test@example.com');
      expect(result).toEqual({ error: null });
    });

    it('should handle password reset error', async () => {
      vi.mocked(sendPasswordResetEmail).mockRejectedValue(mockAuthError);

      const result = await resetPassword('invalid-email');

      expect(result).toEqual({ error: mockAuthError });
    });
  });

  describe('updateUserProfile', () => {
    beforeEach(() => {
      (auth as { currentUser: User | null }).currentUser = mockUser;
    });

    it('should update user profile successfully', async () => {
      const updates = { displayName: 'Updated Name', photoURL: 'new-photo.jpg' };
      vi.mocked(updateProfile).mockResolvedValue(undefined);

      const result = await updateUserProfile(updates);

      expect(updateProfile).toHaveBeenCalledWith(mockUser, updates);
      expect(result).toEqual({ error: null });
    });

    it('should handle update profile error', async () => {
      const updates = { displayName: 'Updated Name' };
      vi.mocked(updateProfile).mockRejectedValue(mockAuthError);

      const result = await updateUserProfile(updates);

      expect(result).toEqual({ error: mockAuthError });
    });

    it('should throw error when no user is signed in', async () => {
      (auth as { currentUser: User | null }).currentUser = null;
      const updates = { displayName: 'Updated Name' };

      const result = await updateUserProfile(updates);

      expect(result.error?.message).toBe('No user signed in');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when signed in', () => {
      (auth as { currentUser: User | null }).currentUser = mockUser;

      const result = getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user is signed in', () => {
      (auth as { currentUser: User | null }).currentUser = null;

      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('should set up auth state listener', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(onAuthStateChanged).mockReturnValue(mockUnsubscribe);

      const unsubscribe = onAuthStateChange(mockCallback);

      expect(onAuthStateChanged).toHaveBeenCalledWith(auth, mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is signed in', () => {
      (auth as { currentUser: User | null }).currentUser = mockUser;

      const result = isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no user is signed in', () => {
      (auth as { currentUser: User | null }).currentUser = null;

      const result = isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
