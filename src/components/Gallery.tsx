import React, { useCallback, useEffect, useRef, useState } from 'react';

import { GalleryItemBase, loadGallery } from '../gallery/loader';
import {
  useInteractionPerformance,
  useMediaPerformance,
  usePerformanceMonitor,
} from '../hooks/usePerformanceMonitor';
import { generateCaption } from '../utils/ollama';

import { ImageUpload } from './ImageUpload';
import { GalleryGrid } from './GalleryGrid';
import { GalleryModal } from './GalleryModal';
import { useImageLoading } from '../hooks/useImageLoading';
import { useModal } from '../hooks/useModal';
import { useKeyboard } from '../hooks/useKeyboard';

interface GalleryProps {
  headingId?: string;
  maxInitial?: number;
}

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
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
        if (!modalRef.current) return;
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
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
  // Performance monitoring hooks
  const performanceMonitor = usePerformanceMonitor('Gallery');
  const { measureClick } = useInteractionPerformance();
  const { measureMediaLoad } = useMediaPerformance();

  const all = loadGallery();
  const items: InternalItem[] = all.slice(0, maxInitial).map((g) => ({ ...g }));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [captions, setCaptions] = useState<{ [key: string]: string }>({});
  const [openerRef, setOpenerRef] = useState<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);

  // Custom hooks
  const { active, setActive } = useModal();
  const {
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
  } = useImageLoading({ items, performanceMonitor, active });
  useKeyboard({ active, items, setActive });


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


  const generateAICaption = async (imageId: string, description: string) => {
    const caption = await generateCaption(description);
    setCaptions((prev) => ({ ...prev, [imageId]: caption }));
  };

  return (
    <div className="gallery" ref={containerRef} aria-labelledby={headingId}>
      <GalleryGrid
        groupedItems={groupedItems}
        categoryNames={categoryNames}
        loadedIds={loadedIds}
        imageStates={imageStates}
        handleImageLoad={handleImageLoad}
        handleImageError={handleImageError}
        measureClick={measureClick}
        setActive={setActive}
        onOpenerRef={setOpenerRef}
      />
      <div className="gallery-upload">
        <ImageUpload
          onImageProcessed={(processedUrl: string) => {
            console.log('Image processed:', processedUrl);
          }}
        />
      </div>
      <GalleryModal
        active={active}
        modalImageState={modalImageState}
        handleModalImageLoad={handleModalImageLoad}
        handleModalImageError={handleModalImageError}
        handleModalImageTimeout={handleModalImageTimeout}
        startModalImageLoad={startModalImageLoad}
        measureClick={measureClick}
        setActive={setActive}
        modalRef={modalRef}
        retryModalImage={retryModalImage}
      />
    </div>
  );
}
