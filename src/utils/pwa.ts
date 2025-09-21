/**
 * PWA Service Worker Registration and Installation Utilities
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptShown = false;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator && typeof navigator.serviceWorker !== 'undefined') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered:', registration.scope);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, show update prompt
              showUpdateNotification();
            }
          });
        }
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Service Worker message:', event.data);
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn('[PWA] Service Workers not supported in this environment');
    }
  }
}

/**
 * Show update notification when new service worker is available
 */
function showUpdateNotification(): void {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4ecdc4;
    color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 300px;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
      <span>🔄</span>
      <strong>Update Available</strong>
    </div>
    <p style="margin: 0 0 1rem 0; font-size: 0.9rem;">
      A new version is available. Refresh to update.
    </p>
    <div style="display: flex; gap: 0.5rem;">
      <button id="update-btn" style="
        background: white;
        color: #4ecdc4;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
      ">Update</button>
      <button id="dismiss-btn" style="
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      ">Later</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Handle update button click
  document.getElementById('update-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  // Handle dismiss button click
  document.getElementById('dismiss-btn')?.addEventListener('click', () => {
    notification.remove();
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Listen for install prompt and store it for later use
 */
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    console.log('[PWA] Install prompt available');
    event.preventDefault();
    deferredPrompt = event;

    // Show install button if not already shown
    if (!installPromptShown) {
      showInstallPrompt();
    }
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    hideInstallPrompt();
  });
}

/**
 * Show install prompt to user
 */
function showInstallPrompt(): void {
  installPromptShown = true;

  // Create install prompt element
  const prompt = document.createElement('div');
  prompt.id = 'pwa-install-prompt';
  prompt.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    padding: 1rem;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 400px;
    margin: 0 auto;
  `;

  prompt.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
      <img src="/icon-192.svg" alt="App Icon" style="width: 48px; height: 48px; border-radius: 8px;">
      <div>
        <h3 style="margin: 0; font-size: 1.1rem; color: #333;">Install Poradas Wedding</h3>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #666;">
          Add to your home screen for the best experience
        </p>
      </div>
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <button id="install-btn" style="
        flex: 1;
        background: #4ecdc4;
        color: white;
        border: none;
        padding: 0.75rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.9rem;
      ">Install</button>
      <button id="cancel-btn" style="
        flex: 1;
        background: #f8f9fa;
        color: #666;
        border: 1px solid #e0e0e0;
        padding: 0.75rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
      ">Not Now</button>
    </div>
  `;

  document.body.appendChild(prompt);

  // Handle install button click
  document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Install outcome:', outcome);
        deferredPrompt = null;
      } catch (error) {
        console.error('[PWA] Install prompt failed:', error);
      }
    }
    hideInstallPrompt();
  });

  // Handle cancel button click
  document.getElementById('cancel-btn')?.addEventListener('click', () => {
    hideInstallPrompt();
  });
}

/**
 * Hide install prompt
 */
function hideInstallPrompt(): void {
  const prompt = document.getElementById('pwa-install-prompt');
  if (prompt) {
    prompt.remove();
  }
  installPromptShown = false;
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/**
 * Get PWA installation status
 */
export function getInstallStatus(): {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
} {
  return {
    canInstall: !!deferredPrompt,
    isInstalled: isStandalone(),
    isStandalone: isStandalone(),
  };
}

// Initialize install prompt listener when module loads
if (typeof window !== 'undefined') {
  setupInstallPrompt();
}
