import {
  AuthError,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';

import { auth } from './config';

// Type alias for Firebase User - can be extended in the future if needed
export type AuthUser = User;

export interface SignInResult {
  user: AuthUser | null;
  error: AuthError | null;
}

export interface SignUpResult {
  user: AuthUser | null;
  error: AuthError | null;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<SignUpResult> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<{ error: AuthError | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }
    await updateProfile(user, updates);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): AuthUser | null {
  return auth.currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}
