/**
 * Browser detection utilities for cross-browser compatibility
 */

export interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  version: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsWebGL: boolean;
  supportsWebRTC: boolean;
  supportsWebAudio: boolean;
  supportsVideoCodecs: {
    h264: boolean;
    webm: boolean;
    ogg: boolean;
  };
  supportsAudioCodecs: {
    mp3: boolean;
    aac: boolean;
    ogg: boolean;
    webm: boolean;
  };
}

/**
 * Detect browser information and capabilities
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform;

  // Browser detection
  let name: BrowserInfo['name'] = 'unknown';
  let version = '0';

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? match[1] : '0';
  } else if (ua.includes('Firefox')) {
    name = 'firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? match[1] : '0';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match ? match[1] : '0';
  } else if (ua.includes('Edg')) {
    name = 'edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? match[1] : '0';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    name = 'opera';
    const match = ua.match(/(?:Opera|OPR)\/(\d+)/);
    version = match ? match[1] : '0';
  }

  // Platform detection
  const isIOS =
    /iPad|iPhone|iPod/.test(platform) ||
    ((navigator.maxTouchPoints ?? 0) > 2 && /MacIntel/.test(platform));
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Android/i.test(ua);

  // Feature detection
  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch {
      return false;
    }
  })();

  const supportsWebRTC = !!(
    window.RTCPeerConnection ||
    (window as unknown as { webkitRTCPeerConnection?: unknown }).webkitRTCPeerConnection
  );
  const supportsWebAudio = !!(
    (window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown }).AudioContext ||
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext
  );

  // Video codec detection
  const video = document.createElement('video');
  const supportsVideoCodecs = {
    h264: !!(
      video.canPlayType && video.canPlayType('video/mp4; codecs="avc1.42E01E"').replace(/no/, '')
    ),
    webm: !!(
      video.canPlayType && video.canPlayType('video/webm; codecs="vp8, vorbis"').replace(/no/, '')
    ),
    ogg: !!(video.canPlayType && video.canPlayType('video/ogg; codecs="theora"').replace(/no/, '')),
  };

  // Audio codec detection
  const audio = document.createElement('audio');
  const supportsAudioCodecs = {
    mp3: !!(audio.canPlayType && audio.canPlayType('audio/mpeg;').replace(/no/, '')),
    aac: !!(audio.canPlayType && audio.canPlayType('audio/aac;').replace(/no/, '')),
    ogg: !!(audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')),
    webm: !!(
      audio.canPlayType && audio.canPlayType('audio/webm; codecs="vorbis"').replace(/no/, '')
    ),
  };

  return {
    name,
    version,
    isMobile,
    isIOS,
    isAndroid,
    supportsWebGL,
    supportsWebRTC,
    supportsWebAudio,
    supportsVideoCodecs,
    supportsAudioCodecs,
  };
}

/**
 * Check if browser supports a specific feature
 */
export function supportsFeature(feature: keyof BrowserInfo): boolean {
  const browser = detectBrowser();
  return Boolean(browser[feature]);
}

/**
 * Get browser-specific CSS class names
 */
export function getBrowserClasses(): string[] {
  const browser = detectBrowser();
  const classes = [`browser-${browser.name}`];

  if (browser.isMobile) classes.push('mobile');
  if (browser.isIOS) classes.push('ios');
  if (browser.isAndroid) classes.push('android');

  return classes;
}

/**
 * Apply browser-specific fixes
 */
export function applyBrowserFixes(): void {
  const browser = detectBrowser();

  // Firefox-specific fixes
  if (browser.name === 'firefox') {
    // Fix for Firefox video autoplay issues
    const style = document.createElement('style');
    style.textContent = `
      video {
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Safari-specific fixes
  if (browser.name === 'safari') {
    // Fix for Safari video controls
    const style = document.createElement('style');
    style.textContent = `
      video::-webkit-media-controls {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // iOS-specific fixes
  if (browser.isIOS) {
    // Prevent zoom on input focus
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport && !viewport.getAttribute('content')?.includes('user-scalable=no')) {
      viewport.setAttribute(
        'content',
        viewport.getAttribute('content')?.trim() + ', user-scalable=no',
      );
    }
  }
}
