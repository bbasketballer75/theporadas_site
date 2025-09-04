import { useCallback, useEffect, useRef, useState } from 'react';

import { GalleryItemBase } from '../gallery/loader';

type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'timeout';

interface ImageState {
  [key: string]: ImageLoadState;
}

interface UseImageLoadingProps {
  items: GalleryItemBase[];
  performanceMonitor: any; // From usePerformanceMonitor
  active: any; // InternalItem | null
}

export function useImageLoading({ items, performanceMonitor, active }: UseImageLoadingProps) {
  const [imageStates, setImageStates] = useState<ImageState>({});
  const [modalImageState, setModalImageState] = useState<ImageLoadState>('idle');
  const timeoutRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const modalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add image preloading functionality
  const preloadImages = useCallback(
    (currentIndex: number, count: number = 3) => {
      for (let i = 1; i <= count; i++) {
        const nextIndex = (currentIndex + i) % items.length;
        const nextItem = items[nextIndex];
        if (nextItem && !(nextItem as any).loaded) {
          const img = new Image();
          img.src = nextItem.src;
          img.onload = () => {
            (nextItem as any).loaded = true;
          };
        }
      }
    },
    [items],
  );

  // Add compression detection functionality
  const detectImageCompression = useCallback(
    async (src: string): Promise<{ isCompressed: boolean; size?: number }> => {
      // Check format first
      const compressedFormats = ['.webp', '.jpg', '.jpeg', '.png'];
      const isCompressedFormat = compressedFormats.some((format) =>
        src.toLowerCase().endsWith(format),
      );

      if (!isCompressedFormat) {
        return { isCompressed: false };
      }

      // Try to fetch and check size
      try {
        const response = await fetch(src, { method: 'HEAD' });
        const size = parseInt(response.headers.get('content-length') || '0');
        // Consider images under 500KB as potentially compressed
        const isCompressed = size > 0 && size < 500000;
        return { isCompressed, size };
      } catch {
        // If fetch fails, assume compressed based on format
        return { isCompressed: true };
      }
    },
    [],
  );

  // Image loading handlers
  const handleImageLoad = useCallback(
    async (imageId: string) => {
      performanceMonitor.startTiming(`image-load-${imageId}`);

      setImageStates((prev) => ({ ...prev, [imageId]: 'loaded' }));
      if (timeoutRefs.current[imageId]) {
        clearTimeout(timeoutRefs.current[imageId]);
        delete timeoutRefs.current[imageId];
      }

      // Find the current item and preload next images
      const currentIndex = items.findIndex((item) => item.id === imageId);
      if (currentIndex !== -1) {
        preloadImages(currentIndex);

        // Check compression for the loaded image
        const currentItem = items[currentIndex];
        if (currentItem) {
          const compressionInfo = await detectImageCompression(currentItem.src);
          console.log(`Image ${imageId} compression info:`, compressionInfo);
        }
      }

      performanceMonitor.endTiming(`image-load-${imageId}`);
    },
    [preloadImages, detectImageCompression, items, performanceMonitor],
  );

  const handleImageError = useCallback((imageId: string) => {
    setImageStates((prev) => ({ ...prev, [imageId]: 'error' }));
    if (timeoutRefs.current[imageId]) {
      clearTimeout(timeoutRefs.current[imageId]);
      delete timeoutRefs.current[imageId];
    }
  }, []);

  const handleImageTimeout = useCallback((imageId: string) => {
    setImageStates((prev) => ({ ...prev, [imageId]: 'timeout' }));
    delete timeoutRefs.current[imageId];
  }, []);

  // Modal image handlers
  const handleModalImageLoad = useCallback(() => {
    setModalImageState('loaded');
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      modalTimeoutRef.current = null;
    }
  }, []);

  const handleModalImageError = useCallback(() => {
    setModalImageState('error');
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      modalTimeoutRef.current = null;
    }
  }, []);

  const handleModalImageTimeout = useCallback(() => {
    setModalImageState('timeout');
    modalTimeoutRef.current = null;
  }, []);

  const startModalImageLoad = useCallback(() => {
    setModalImageState('loading');
    modalTimeoutRef.current = setTimeout(handleModalImageTimeout, 8000);
  }, [handleModalImageTimeout]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
    };
  }, []);

  // Reset modal state when active changes
  useEffect(() => {
    if (active) {
      startModalImageLoad();
    } else {
      setModalImageState('idle');
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
    }
  }, [active, startModalImageLoad]);

  const retryModalImage = useCallback(() => {
    setModalImageState('idle');
    startModalImageLoad();
  }, [startModalImageLoad]);

  return {
    imageStates,
    modalImageState,
    handleImageLoad,
    handleImageError,
    handleImageTimeout,
    handleModalImageLoad,
    handleModalImageError,
    handleModalImageTimeout,
    startModalImageLoad,
    retryModalImage,
  };
}