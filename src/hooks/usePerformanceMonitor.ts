import React, { useEffect, useRef } from 'react';

import { usePerformanceMonitor as useMonitor } from '../utils/performance';

export function usePerformanceMonitor(componentName: string) {
  const monitor = useMonitor();
  const renderStartRef = useRef<number | null>(null);

  useEffect(() => {
    // Track component mount time
    const _mountTime = Date.now();
    monitor.startTiming(`${componentName}-mount`);

    return () => {
      // Track component unmount time
      const _unmountTime = Date.now();
      monitor.endTiming(`${componentName}-mount`);
    };
  }, [componentName, monitor]);

  useEffect(() => {
    // Track render time
    if (renderStartRef.current != null) {
      const _renderTime = Date.now() - renderStartRef.current;
      monitor.startTiming(`${componentName}-render`);
      monitor.endTiming(`${componentName}-render`);
    }
    renderStartRef.current = Date.now();
  });

  const measureInteraction = (interactionName: string, callback: () => void) => {
    monitor.startTiming(`${componentName}-${interactionName}`);
    try {
      const result = callback();
      monitor.endTiming(`${componentName}-${interactionName}`);
      return result;
    } catch (error) {
      monitor.endTiming(`${componentName}-${interactionName}`);
      throw error;
    }
  };

  const measureAsyncInteraction = async (
    interactionName: string,
    callback: () => Promise<unknown>,
  ) => {
    monitor.startTiming(`${componentName}-${interactionName}`);
    try {
      const result = await callback();
      monitor.endTiming(`${componentName}-${interactionName}`);
      return result;
    } catch (error) {
      monitor.endTiming(`${componentName}-${interactionName}`);
      throw error;
    }
  };

  return {
    measureInteraction,
    measureAsyncInteraction,
    startTiming: (name: string) => monitor.startTiming(`${componentName}-${name}`),
    endTiming: (name: string) => monitor.endTiming(`${componentName}-${name}`),
  };
}

// Hook for monitoring route changes
export function useRoutePerformance() {
  const monitor = useMonitor();

  useEffect(() => {
    const handleRouteChange = () => {
      monitor.startTiming('route-change');
      // Use requestAnimationFrame to measure after the route change is complete
      requestAnimationFrame(() => {
        monitor.endTiming('route-change');
      });
    };

    // Listen for hash changes (since this app uses hash navigation)
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, [monitor]);
}

// Hook for monitoring user interactions
export function useInteractionPerformance() {
  const monitor = useMonitor();

  const measureClick = (elementName: string, callback?: (event: React.MouseEvent) => void) => {
    return (event: React.MouseEvent) => {
      monitor.startTiming(`click-${elementName}`);
      if (callback) {
        callback(event);
      }
      // Use setTimeout to measure after the click handler completes
      setTimeout(() => {
        monitor.endTiming(`click-${elementName}`);
      }, 0);
    };
  };

  const measureKeyPress = (elementName: string, callback?: () => void) => {
    return (_event: React.KeyboardEvent) => {
      monitor.startTiming(`keypress-${elementName}`);
      if (callback) {
        callback();
      }
      setTimeout(() => {
        monitor.endTiming(`keypress-${elementName}`);
      }, 0);
    };
  };

  const measureScroll = (elementName: string, callback?: () => void) => {
    return (_event: React.UIEvent) => {
      monitor.startTiming(`scroll-${elementName}`);
      if (callback) {
        callback();
      }
      setTimeout(() => {
        monitor.endTiming(`scroll-${elementName}`);
      }, 0);
    };
  };

  return {
    measureClick,
    measureKeyPress,
    measureScroll,
  };
}

// Hook for monitoring API calls
export function useApiPerformance() {
  const monitor = useMonitor();

  const measureApiCall = async <T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> => {
    monitor.startTiming(`api-${endpoint}`);
    try {
      const result = await apiCall();
      monitor.endTiming(`api-${endpoint}`);
      return result;
    } catch (error) {
      monitor.endTiming(`api-${endpoint}`);
      throw error;
    }
  };

  return { measureApiCall };
}

// Hook for monitoring media loading
export function useMediaPerformance() {
  const monitor = useMonitor();

  const measureMediaLoad = (mediaType: string, src: string) => {
    monitor.startTiming(`${mediaType}-load-${src}`);

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        monitor.endTiming(`${mediaType}-load-${src}`);
        resolve();
      };
      img.onerror = () => {
        monitor.endTiming(`${mediaType}-load-${src}`);
        resolve(); // Still resolve on error to not break the app
      };
      img.src = src;
    });
  };

  const measureVideoLoad = (videoElement: HTMLVideoElement) => {
    return new Promise<void>((resolve) => {
      const handleLoad = () => {
        monitor.endTiming('video-load');
        videoElement.removeEventListener('loadeddata', handleLoad);
        resolve();
      };

      monitor.startTiming('video-load');
      videoElement.addEventListener('loadeddata', handleLoad);
    });
  };

  return {
    measureMediaLoad,
    measureVideoLoad,
  };
}
