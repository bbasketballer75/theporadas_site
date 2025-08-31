import React, { useEffect, useRef, useState } from 'react';

import { GalleryItemBase, loadGallery } from '../gallery/loader';

import { ImageUpload } from './ImageUpload';

interface GalleryProps {
  headingId?: string;
  maxInitial?: number;
}

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
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
    return widths.map((w) => `/public_images/${w}/${baseName}.webp ${w}w`).join(', ');
  }
  return undefined;
}

export function Gallery({ headingId, maxInitial = 24 }: GalleryProps) {
  const all = loadGallery();
  const items: InternalItem[] = all.slice(0, maxInitial).map((g) => ({ ...g }));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<InternalItem | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDialogElement | null>(null);

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
                  >
                    <img
                      src={imgSrc}
                      data-full={it.src}
                      alt={it.caption || ''}
                      loading="lazy"
                      className={showFull ? 'loaded' : 'placeholder'}
                      {...(srcSet
                        ? {
                            srcSet,
                            sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
                          }
                        : {})}
                    />
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
        >
          <button
            className="gallery-modal-backdrop"
            onClick={() => setActive(null)}
            aria-label="Close gallery modal"
            type="button"
          />
          <div className="gallery-modal-content">
            <img src={active.src} alt={active.caption || ''} />
            {active.caption && <p className="gallery-caption">{active.caption}</p>}
            {active.videoLink && (
              <div className="gallery-video-container">
                <video
                  controls
                  className="gallery-video-player"
                  aria-label="Video message"
                  preload="metadata"
                >
                  <source src={active.videoLink} type="video/mp4" />
                  <track
                    kind="captions"
                    src="/media/videos/main-film-chapters.vtt"
                    srcLang="en"
                    label="English"
                    default
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            <button
              type="button"
              className="gallery-close"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
