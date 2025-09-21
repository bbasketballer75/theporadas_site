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

  const browserInfo = detectBrowserNameAndVersion(ua);
  const platformInfo = detectPlatform(platform, ua);
  const featureSupport = detectFeatureSupport();

  return {
    ...browserInfo,
    ...platformInfo,
    ...featureSupport,
  };
}

/**
 * Detect browser name and version from user agent
 */
function detectBrowserNameAndVersion(ua: string): Pick<BrowserInfo, 'name' | 'version'> {
  let name: BrowserInfo['name'] = 'unknown';
  let version = '0';

  if (isChrome(ua)) {
    name = 'chrome';
    version = extractVersion(ua, /Chrome\/(\d+)/);
  } else if (isFirefox(ua)) {
    name = 'firefox';
    version = extractVersion(ua, /Firefox\/(\d+)/);
  } else if (isSafari(ua)) {
    name = 'safari';
    version = extractVersion(ua, /Version\/(\d+)/);
  } else if (isEdge(ua)) {
    name = 'edge';
    version = extractVersion(ua, /Edg\/(\d+)/);
  } else if (isOpera(ua)) {
    name = 'opera';
    version = extractVersion(ua, /(?:Opera|OPR)\/(\d+)/);
  }

  return { name, version };
}

/**
 * Check if user agent indicates Chrome
 */
function isChrome(ua: string): boolean {
  return ua.includes('Chrome') && !ua.includes('Edg');
}

/**
 * Check if user agent indicates Firefox
 */
function isFirefox(ua: string): boolean {
  return ua.includes('Firefox');
}

/**
 * Check if user agent indicates Safari
 */
function isSafari(ua: string): boolean {
  return ua.includes('Safari') && !ua.includes('Chrome');
}

/**
 * Check if user agent indicates Edge
 */
function isEdge(ua: string): boolean {
  return ua.includes('Edg');
}

/**
 * Check if user agent indicates Opera
 */
function isOpera(ua: string): boolean {
  return ua.includes('Opera') || ua.includes('OPR');
}

/**
 * Extract version from user agent using regex
 */
function extractVersion(ua: string, regex: RegExp): string {
  const match = ua.match(regex);
  return match ? match[1] : '0';
}

/**
 * Detect platform information
 */
function detectPlatform(
  platform: string,
  ua: string,
): Pick<BrowserInfo, 'isMobile' | 'isIOS' | 'isAndroid'> {
  const isIOS =
    /iPad|iPhone|iPod/.test(platform) ||
    ((navigator.maxTouchPoints ?? 0) > 2 && /MacIntel/.test(platform));
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Android/i.test(ua);

  return { isMobile, isIOS, isAndroid };
}

/**
 * Detect feature support
 */
function detectFeatureSupport(): Pick<
  BrowserInfo,
  | 'supportsWebGL'
  | 'supportsWebRTC'
  | 'supportsWebAudio'
  | 'supportsVideoCodecs'
  | 'supportsAudioCodecs'
> {
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

  const supportsVideoCodecs = detectVideoCodecs();
  const supportsAudioCodecs = detectAudioCodecs();

  return {
    supportsWebGL,
    supportsWebRTC,
    supportsWebAudio,
    supportsVideoCodecs,
    supportsAudioCodecs,
  };
}
function detectVideoCodecs(): BrowserInfo['supportsVideoCodecs'] {
  const video = document.createElement('video');
  return {
    h264: !!(
      video.canPlayType && video.canPlayType('video/mp4; codecs="avc1.42E01E"').replace(/no/, '')
    ),
    webm: !!(
      video.canPlayType && video.canPlayType('video/webm; codecs="vp8, vorbis"').replace(/no/, '')
    ),
    ogg: !!(video.canPlayType && video.canPlayType('video/ogg; codecs="theora"').replace(/no/, '')),
  };
}

/**
 * Detect audio codec support
 */
function detectAudioCodecs(): BrowserInfo['supportsAudioCodecs'] {
  const audio = document.createElement('audio');
  return {
    mp3: !!(audio.canPlayType && audio.canPlayType('audio/mpeg;').replace(/no/, '')),
    aac: !!(audio.canPlayType && audio.canPlayType('audio/aac;').replace(/no/, '')),
    ogg: !!(audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')),
    webm: !!(
      audio.canPlayType && audio.canPlayType('audio/webm; codecs="vorbis"').replace(/no/, '')
    ),
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
