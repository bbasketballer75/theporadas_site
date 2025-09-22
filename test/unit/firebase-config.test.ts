import { describe, expect, it, vi } from 'vitest';

// Mock Firebase modules before importing the config
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ type: 'firestore' })),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ bucket: 'test' })),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({ type: 'realtime' })),
}));

describe('Firebase Configuration', () => {
  it('should be able to import Firebase config module', async () => {
    // Test that the module can be imported without throwing
    expect(async () => {
      await import('../src/firebase/config');
    }).not.toThrow();
  });

  it('should export expected Firebase services', async () => {
    const { auth, db, storage, realtimeDb, default: app } = await import('../src/firebase/config');

    // Test that the exports exist and are mocked objects
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
    expect(storage).toBeDefined();
    expect(realtimeDb).toBeDefined();
    expect(app).toBeDefined();
  });
});
