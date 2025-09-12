import React, { useState, useEffect } from 'react';

import { getInstallStatus } from '../utils/pwa';

export const InstallPrompt: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstallStatus = () => {
      const status = getInstallStatus();
      setCanInstall(status.canInstall);
      setIsInstalled(status.isInstalled);
    };

    // Check initial status
    checkInstallStatus();

    // Listen for changes
    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <button
      onClick={() => {
        // The install prompt is handled by the PWA utility
        // This button just indicates the app can be installed
        console.log('[PWA] Install button clicked - prompt should appear');
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: '#4ecdc4',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#3bb8ae';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#4ecdc4';
      }}
      aria-label="Install app to home screen"
      title="Install Poradas Wedding app"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Install
    </button>
  );
};
