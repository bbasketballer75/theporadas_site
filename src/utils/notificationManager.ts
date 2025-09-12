export interface NotificationConfig {
  enabled: boolean;
  soundEnabled: boolean;
  soundType: 'success' | 'error' | 'warning' | 'info';
  duration: number; // in       this.listeners = this.listeners.filter((listener) => listener !== listener);illiseconds
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

export class NotificationManager {
  private config: NotificationConfig = {
    enabled: true,
    soundEnabled: true,
    soundType: 'success',
    duration: 5000,
    position: 'top-right',
  };

  private notifications: NotificationMessage[] = [];
  private listeners: ((notifications: NotificationMessage[]) => void)[] = [];
  private audioContext: AudioContext | null = null;

  constructor() {
    this.loadConfig();
    this.initAudio();
  }

  // Configuration management
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  // Notification management
  show(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): string {
    if (!this.config.enabled) return '';

    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: NotificationMessage = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration || this.config.duration,
    };

    this.notifications.unshift(fullNotification);
    this.notifyListeners();

    // Play sound if enabled
    if (this.config.soundEnabled) {
      this.playSound(notification.type);
    }

    // Auto-remove after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, fullNotification.duration);
    }

    return id;
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notifyListeners();
  }

  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications(): NotificationMessage[] {
    return [...this.notifications];
  }

  // Success notifications
  success(title: string, message: string, action?: NotificationMessage['action']): string {
    return this.show({
      type: 'success',
      title,
      message,
      action,
    });
  }

  // Error notifications
  error(title: string, message: string, action?: NotificationMessage['action']): string {
    return this.show({
      type: 'error',
      title,
      message,
      action,
    });
  }

  // Warning notifications
  warning(title: string, message: string, action?: NotificationMessage['action']): string {
    return this.show({
      type: 'warning',
      title,
      message,
      action,
    });
  }

  // Info notifications
  info(title: string, message: string, action?: NotificationMessage['action']): string {
    return this.show({
      type: 'info',
      title,
      message,
      action,
    });
  }

  // Task completion notifications
  taskCompleted(taskName: string, details?: string): string {
    return this.success(
      'Task Completed',
      `${taskName} has been completed successfully${details ? `: ${details}` : ''}`,
      {
        label: 'View Details',
        callback: () => {
          console.log(`Task ${taskName} completed with details:`, details);
        },
      },
    );
  }

  taskFailed(taskName: string, error?: string): string {
    return this.error('Task Failed', `${taskName} failed${error ? `: ${error}` : ''}`, {
      label: 'Retry',
      callback: () => {
        console.log(`Retrying task: ${taskName}`);
      },
    });
  }

  // Event subscription
  subscribe(listener: (notifications: NotificationMessage[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getNotifications()));
  }

  private initAudio(): void {
    try {
      const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = w.AudioContext || w.webkitAudioContext;
      if (Ctor) {
        this.audioContext = new Ctor();
      }
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  private playSound(type: NotificationMessage['type']): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different frequencies for different notification types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 500,
      };

      oscillator.frequency.setValueAtTime(frequencies[type], this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('kilo_notification_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification config:', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('kilo_notification_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save notification config:', error);
    }
  }
}

// Global notification manager instance
export const notificationManager = new NotificationManager();
