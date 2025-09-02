import React, { useEffect, useRef, useState, useCallback } from 'react';

import { GalleryItemBase, loadGallery } from '../gallery/loader';

import { ImageUpload } from './ImageUpload';
import { detectBrowser } from '../utils/browserDetection';

interface GalleryProps {
  headingId?: string;
  maxInitial?: number;
}

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
}

type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'timeout';

interface ImageState {
  [key: string]: ImageLoadState;
}

// Extract category grouping logic
function groupItemsByCategory(items: InternalItem[]) {
  return items.reduce(
    (acc, item) => {
      const category = item.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, InternalItem[]>,
  );
}

// Extract responsive image logic
function generateSrcSet(src: string) {
  if (
    src.endsWith('.jpg') ||
    src.endsWith('.jpeg') ||
    src.endsWith('.png') ||
    src.endsWith('.webp')
  ) {
    const baseName = src.replace(/^.*\//, '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
    const widths = [320, 640, 960, 1280];
    return widths.map((w) => `/assets/wedding/${w}/${baseName}.webp ${w}w`).join(', ');
  }
  return undefined;
}

// Extract focus trap logic
function useFocusTrap(
  active: InternalItem | null,
  modalRef: React.RefObject<HTMLDialogElement | null>,
  openerRef: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (active) {
      // Focus the close button after modal mounts
      const closeBtn = modalRef.current?.querySelector<HTMLButtonElement>('button.gallery-close');
      closeBtn?.focus();

      const handleKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        const isShift = e.shiftKey;
        const activeEl = document.activeElement as HTMLElement | null;

        // Prevent tabbing out of modal by wrapping focus
        if (!isShift && activeEl === last) {
          // Tab from last element -> wrap to first
          e.preventDefault();
          first.focus();
        } else if (isShift && activeEl === first) {
          // Shift+Tab from first element -> wrap to last
          e.preventDefault();
          last.focus();
        }
      };
      document.addEventListener('keydown', handleKey, true);
      return () => document.removeEventListener('keydown', handleKey, true);
    } else if (openerRef.current) {
      openerRef.current.focus();
    }
  }, [active, modalRef, openerRef]);
}

// Extract intersection observer logic
function useProgressiveImageLoading(
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemsLength: number,
  setLoadedIds: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setLoadedIds((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).dataset.id;
              if (id) next.add(id);
            }
          }
          return next;
        });
      },
      { rootMargin: '200px' },
    );

    const targets = el.querySelectorAll('[data-role="gallery-item"]');
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [containerRef, itemsLength, setLoadedIds]);
}

export function Gallery({ headingId, maxInitial = 24 }: GalleryProps) {
  const all = loadGallery();
  const items: InternalItem[] = all.slice(0, maxInitial).map((g) => ({ ...g }));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<InternalItem | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [imageStates, setImageStates] = useState<ImageState>({});
  const [modalImageState, setModalImageState] = useState<ImageLoadState>('idle');
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Browser detection for compatibility fixes
  const browserInfo = React.useMemo(() => detectBrowser(), []);

  // Image loading handlers
  const handleImageLoad = useCallback((imageId: string) => {
    setImageStates(prev => ({ ...prev, [imageId]: 'loaded' }));
    setLoadedIds(prev => new Set(prev).add(imageId));
    if (timeoutRefs.current[imageId]) {
      clearTimeout(timeoutRefs.current[imageId]);
      delete timeoutRefs.current[imageId];
    }
  }, []);

  const handleImageError = useCallback((imageId: string) => {
    setImageStates(prev => ({ ...prev, [imageId]: 'error' }));
    if (timeoutRefs.current[imageId]) {
      clearTimeout(timeoutRefs.current[imageId]);
      delete timeoutRefs.current[imageId];
    }
  }, []);

  const handleImageTimeout = useCallback((imageId: string) => {
    setImageStates(prev => ({ ...prev, [imageId]: 'timeout' }));
    delete timeoutRefs.current[imageId];
  }, []);

  const startImageLoad = useCallback((imageId: string, src: string) => {
    if (imageStates[imageId] === 'idle') {
      setImageStates(prev => ({ ...prev, [imageId]: 'loading' }));
      timeoutRefs.current[imageId] = setTimeout(() => handleImageTimeout(imageId), 8000);
    }
  }, [imageStates, handleImageTimeout]);

  const retryImageLoad = useCallback((imageId: string) => {
    setImageStates(prev => ({ ...prev, [imageId]: 'idle' }));
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

  // Group items by category
  const groupedItems = groupItemsByCategory(items);

  // Category display names
  const categoryNames: Record<string, string> = {
    engagement: 'Engagement',
    rings: 'Wedding Rings',
    wedding_party: 'Wedding Party',
    parents: 'Parents',
    austin_jordyn: 'Austin & Jordyn',
    shared: 'Shared Gallery',
    other: 'Other',
  };

  // Use custom hooks for complex logic
  useProgressiveImageLoading(containerRef, items.length, setLoadedIds);
  useFocusTrap(active, modalRef, openerRef);

  useEffect(() => {
    if (active) {
      const onDoc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setActive(null);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const currentIndex = items.findIndex((item) => item.id === active.id);
          if (currentIndex !== -1) {
            const nextIndex =
              e.key === 'ArrowRight'
                ? (currentIndex + 1) % items.length
                : (currentIndex - 1 + items.length) % items.length;
            setActive(items[nextIndex]);
          }
        }
      };
      document.addEventListener('keydown', onDoc);
      return () => document.removeEventListener('keydown', onDoc);
    }
  }, [active, items]);

  return (
    <div className="gallery" ref={containerRef} aria-labelledby={headingId}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .gallery-item {
          position: relative;
          overflow: hidden;
        }
      `}</style>
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <section key={category} className="gallery-section">
          <h3 className="gallery-section-title">{categoryNames[category] || category}</h3>
          <ul className="gallery-grid">
            {categoryItems.map((it) => {
              const showFull = loadedIds.has(it.id);
              const imgSrc = showFull ? it.src : it.thumb || it.src;
              // Derive srcSet from responsive image pipeline if file matches pattern
              const srcSet = generateSrcSet(it.src);
              return (
                <li key={it.id} className="gallery-grid-item">
                  <button
                     data-id={it.id}
                     data-role="gallery-item"
                     type="button"
                     className="gallery-item"
                     onClick={(e) => {
                       openerRef.current = e.currentTarget;
                       setActive(it);
                     }}
                     aria-label={it.caption ? `${it.caption}` : 'Image'}
                     data-testid="photo"
                   >
                     <img
                       src={imgSrc}
                       data-full={it.src}
                       alt={it.caption || ''}
                       loading="lazy"
                       className={showFull ? 'loaded' : 'placeholder'}
                       onLoad={() => handleImageLoad(it.id)}
                       onError={() => handleImageError(it.id)}
                       data-loading={imageStates[it.id] === 'loading' ? 'true' : 'false'}
                       data-error={imageStates[it.id] === 'error' || imageStates[it.id] === 'timeout' ? 'true' : 'false'}
                       {...(srcSet
                         ? {
                             srcSet,
                             sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
                           }
                         : {})}
                     />
                     {!showFull && (
                       <div
                         style={{
                           position: 'absolute',
                           top: '50%',
                           left: '50%',
                           transform: 'translate(-50%, -50%)',
                           display: 'flex',
                           flexDirection: 'column',
                           alignItems: 'center',
                           gap: '8px',
                         }}
                       >
                         <div
                           style={{
                             width: '24px',
                             height: '24px',
                             border: '2px solid #f3f3f3',
                             borderTop: '2px solid #4ecdc4',
                             borderRadius: '50%',
                             animation: 'spin 1s linear infinite',
                           }}
                         />
                         <span style={{ fontSize: '12px', color: '#666' }}>Loading...</span>
                       </div>
                     )}
                   </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="gallery-upload">
        <ImageUpload
          onImageProcessed={(processedUrl: string) => {
            // Here you could add logic to refresh the gallery or show a success message
            console.log('Image processed:', processedUrl);
          }}
        />
      </div>
      {active && (
        <dialog
          className="gallery-modal"
          aria-label={active.caption || 'Image'}
          ref={modalRef}
          open
          aria-modal="true"
          data-testid="photo-modal"
        >
          <button
            className="gallery-modal-backdrop"
            onClick={() => setActive(null)}
            aria-label="Close gallery modal"
            type="button"
          />
          <div className="gallery-modal-content">
            {modalImageState === 'loading' && (
               <div
                 style={{
                   position: 'absolute',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%)',
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   gap: '8px',
                   zIndex: 10,
                 }}
               >
                 <div
                   style={{
                     width: '32px',
                     height: '32px',
                     border: '3px solid #f3f3f3',
                     borderTop: '3px solid #4ecdc4',
                     borderRadius: '50%',
                     animation: 'spin 1s linear infinite',
                   }}
                 />
                 <span style={{ fontSize: '14px', color: '#666' }}>Loading image...</span>
               </div>
             )}
             {(modalImageState === 'error' || modalImageState === 'timeout') && (
               <div
                 style={{
                   position: 'absolute',
                   top: '50%',
                   left: '50%',
                   transform: 'translate(-50%, -50%)',
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   gap: '12px',
                   zIndex: 10,
                   backgroundColor: 'rgba(255, 255, 255, 0.9)',
                   padding: '20px',
                   borderRadius: '8px',
                 }}
               >
                 <span style={{ fontSize: '16px', color: '#666' }}>
                   {modalImageState === 'timeout' ? 'Image load timeout' : 'Failed to load image'}
                 </span>
                 <button
                   onClick={() => {
                     setModalImageState('idle');
                     startModalImageLoad();
                   }}
                   style={{
                     padding: '8px 16px',
                     backgroundColor: '#4ecdc4',
                     color: 'white',
                     border: 'none',
                     borderRadius: '4px',
                     cursor: 'pointer',
                   }}
                 >
                   Retry
                 </button>
               </div>
             )}
             <img
               src={active.src}
               alt={active.caption || ''}
               onLoad={handleModalImageLoad}
               onError={handleModalImageError}
               style={{
                 opacity: modalImageState === 'loaded' ? 1 : 0.3,
                 transition: 'opacity 0.3s ease-in-out',
               }}
             />
             {active.caption && <p className="gallery-caption" data-testid="photo-caption">{active.caption}</p>}
          </div>
        </dialog>
      )}
    </div>
  );
}
