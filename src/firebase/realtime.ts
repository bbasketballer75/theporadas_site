import { off, onValue, push, ref, set, update } from 'firebase/database';

import { realtimeDb } from './config';

// Real-time guest interaction data types
export interface GuestMessage {
  id?: string;
  guestName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'question' | 'well_wish';
  isRead: boolean;
}

export interface GuestReaction {
  id?: string;
  guestName: string;
  reactionType: 'heart' | 'thumbs_up' | 'celebrate' | 'laugh';
  targetId: string; // ID of the item being reacted to
  timestamp: number;
}

export interface LiveStats {
  totalGuests: number;
  activeGuests: number;
  totalMessages: number;
  totalReactions: number;
  lastUpdated: number;
}

// Real-time database paths
const MESSAGES_PATH = 'guestMessages';
const REACTIONS_PATH = 'guestReactions';
const STATS_PATH = 'liveStats';

// Guest Messages service
export const guestMessagesService = {
  // Send a new message
  async sendMessage(message: Omit<GuestMessage, 'id' | 'timestamp' | 'isRead'>): Promise<string> {
    const messagesRef = ref(realtimeDb, MESSAGES_PATH);
    const newMessageRef = push(messagesRef);
    const messageData: GuestMessage = {
      ...message,
      id: newMessageRef.key!,
      timestamp: Date.now(),
      isRead: false,
    };
    await set(newMessageRef, messageData);
    return newMessageRef.key!;
  },

  // Listen to new messages
  onNewMessage(callback: (message: GuestMessage) => void): () => void {
    const messagesRef = ref(realtimeDb, MESSAGES_PATH);
    onValue(messagesRef, (snapshot) => {
      const messages: GuestMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key!,
          ...childSnapshot.val(),
        });
      });
      // Call callback with the latest message
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        callback(latestMessage);
      }
    });

    // Return unsubscribe function
    return () => off(messagesRef);
  },

  // Mark message as read
  async markAsRead(messageId: string): Promise<void> {
    const messageRef = ref(realtimeDb, `${MESSAGES_PATH}/${messageId}`);
    await update(messageRef, { isRead: true });
  },

  // Get all messages
  async getAllMessages(): Promise<GuestMessage[]> {
    return new Promise((resolve) => {
      const messagesRef = ref(realtimeDb, MESSAGES_PATH);
      onValue(
        messagesRef,
        (snapshot) => {
          const messages: GuestMessage[] = [];
          snapshot.forEach((childSnapshot) => {
            messages.push({
              id: childSnapshot.key!,
              ...childSnapshot.val(),
            });
          });
          resolve(messages);
          // Unsubscribe after getting data
          off(messagesRef);
        },
        { onlyOnce: true },
      );
    });
  },
};

// Guest Reactions service
export const guestReactionsService = {
  // Send a new reaction
  async sendReaction(reaction: Omit<GuestReaction, 'id' | 'timestamp'>): Promise<string> {
    const reactionsRef = ref(realtimeDb, REACTIONS_PATH);
    const newReactionRef = push(reactionsRef);
    const reactionData: GuestReaction = {
      ...reaction,
      id: newReactionRef.key!,
      timestamp: Date.now(),
    };
    await set(newReactionRef, reactionData);
    return newReactionRef.key!;
  },

  // Listen to new reactions
  onNewReaction(callback: (reaction: GuestReaction) => void): () => void {
    const reactionsRef = ref(realtimeDb, REACTIONS_PATH);
    onValue(reactionsRef, (snapshot) => {
      const reactions: GuestReaction[] = [];
      snapshot.forEach((childSnapshot) => {
        reactions.push({
          id: childSnapshot.key!,
          ...childSnapshot.val(),
        });
      });
      // Call callback with the latest reaction
      if (reactions.length > 0) {
        const latestReaction = reactions[reactions.length - 1];
        callback(latestReaction);
      }
    });

    // Return unsubscribe function
    return () => off(reactionsRef);
  },

  // Get reactions by target ID
  async getReactionsByTarget(targetId: string): Promise<GuestReaction[]> {
    return new Promise((resolve) => {
      const reactionsRef = ref(realtimeDb, REACTIONS_PATH);
      onValue(
        reactionsRef,
        (snapshot) => {
          const reactions: GuestReaction[] = [];
          snapshot.forEach((childSnapshot) => {
            const reaction: GuestReaction = {
              id: childSnapshot.key!,
              ...childSnapshot.val(),
            };
            if (reaction.targetId === targetId) {
              reactions.push(reaction);
            }
          });
          resolve(reactions);
          // Unsubscribe after getting data
          off(reactionsRef);
        },
        { onlyOnce: true },
      );
    });
  },
};

// Live Stats service
export const liveStatsService = {
  // Update live stats
  async updateStats(stats: Partial<LiveStats>): Promise<void> {
    const statsRef = ref(realtimeDb, STATS_PATH);
    const currentStats = await this.getStats();
    const updatedStats: LiveStats = {
      ...currentStats,
      ...stats,
      lastUpdated: Date.now(),
    };
    await set(statsRef, updatedStats);
  },

  // Get current live stats
  async getStats(): Promise<LiveStats> {
    return new Promise((resolve) => {
      const statsRef = ref(realtimeDb, STATS_PATH);
      onValue(
        statsRef,
        (snapshot) => {
          const stats = snapshot.val() || {
            totalGuests: 0,
            activeGuests: 0,
            totalMessages: 0,
            totalReactions: 0,
            lastUpdated: Date.now(),
          };
          resolve(stats);
          // Unsubscribe after getting data
          off(statsRef);
        },
        { onlyOnce: true },
      );
    });
  },

  // Listen to stats updates
  onStatsUpdate(callback: (stats: LiveStats) => void): () => void {
    const statsRef = ref(realtimeDb, STATS_PATH);
    onValue(statsRef, (snapshot) => {
      const stats = snapshot.val() || {
        totalGuests: 0,
        activeGuests: 0,
        totalMessages: 0,
        totalReactions: 0,
        lastUpdated: Date.now(),
      };
      callback(stats);
    });

    // Return unsubscribe function
    return () => off(statsRef);
  },
};
