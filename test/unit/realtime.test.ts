import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  guestMessagesService,
  guestReactionsService,
  liveStatsService,
} from '../src/firebase/realtime';

// Mock Firebase config first
vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: null },
  db: { type: 'firestore' },
  storage: { bucket: 'test' },
  realtimeDb: { type: 'realtime' },
}));

// Mock Firebase modules before importing the services
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
  ref: vi.fn(() => ({ key: 'mock-ref' })),
  push: vi.fn(() => ({ key: 'new-item-id' })),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  onValue: vi.fn((ref, callback) => {
    // Immediately call callback with mock data
    callback({
      val: () => ({
        totalGuests: 0,
        activeGuests: 0,
        totalMessages: 0,
        totalReactions: 0,
        lastUpdated: Date.now(),
      }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      forEach: (cb: unknown) => {
        // Mock empty data for simplicity
      },
    });
    return vi.fn(); // Return unsubscribe function
  }),
  off: vi.fn(),
}));

describe('Realtime Database Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Guest Messages Service', () => {
    it('should send a new message', async () => {
      const messageData = {
        guestName: 'John Doe',
        message: 'Congratulations!',
        type: 'well_wish' as const,
      };

      const result = await guestMessagesService.sendMessage(messageData);

      expect(result).toBe('new-item-id');
    });

    it('should listen to new messages', () => {
      const mockCallback = vi.fn();
      const unsubscribe = guestMessagesService.onNewMessage(mockCallback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should mark message as read', async () => {
      await guestMessagesService.markAsRead('message-123');
      // Test passes if no error is thrown
    });

    it('should get all messages', async () => {
      const messages = await guestMessagesService.getAllMessages();
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('Guest Reactions Service', () => {
    it('should send a new reaction', async () => {
      const reactionData = {
        guestName: 'Jane Doe',
        reactionType: 'heart' as const,
        targetId: 'photo-123',
      };

      const result = await guestReactionsService.sendReaction(reactionData);
      expect(result).toBe('new-item-id');
    });

    it('should listen to new reactions', () => {
      const mockCallback = vi.fn();
      const unsubscribe = guestReactionsService.onNewReaction(mockCallback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should get reactions by target ID', async () => {
      const reactions = await guestReactionsService.getReactionsByTarget('photo-123');
      expect(Array.isArray(reactions)).toBe(true);
    });
  });

  describe('Live Stats Service', () => {
    it('should update live stats', async () => {
      const mockStats = {
        totalGuests: 150,
        activeGuests: 45,
      };

      await liveStatsService.updateStats(mockStats);
      // Test passes if no error is thrown
    });

    it('should get current live stats', async () => {
      const stats = await liveStatsService.getStats();
      expect(stats).toHaveProperty('totalGuests');
      expect(stats).toHaveProperty('activeGuests');
    });

    it('should listen to stats updates', () => {
      const mockCallback = vi.fn();
      const unsubscribe = liveStatsService.onStatsUpdate(mockCallback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});
