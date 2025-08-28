import React, { useCallback, useEffect, useRef, useState } from 'react';

import { loadGallery, GalleryItemBase } from '../gallery/loader';

interface GalleryProps {
  headingId?: string;
  maxInitial?: number;
}

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
}

export function Gallery({ headingId, maxInitial = 24 }: GalleryProps) {
  const all = loadGallery();
  const items: InternalItem[] = all.slice(0, maxInitial).map((g) => ({ ...g }));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<InternalItem | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver for progressive loading of real src replacing thumb
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
  }, [items.length]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!active) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setActive(null);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = items.findIndex((i) => i.id === active.id);
        if (idx !== -1) {
          const nextIdx =
            e.key === 'ArrowRight'
              ? (idx + 1) % items.length
              : (idx - 1 + items.length) % items.length;
          setActive(items[nextIdx]);
        }
      }
    },
    [active, items],
  );

  useEffect(() => {
    if (active) {
      const onDoc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setActive(null);
      };
      document.addEventListener('keydown', onDoc);
      return () => document.removeEventListener('keydown', onDoc);
    }
  }, [active]);

  // Focus trap & restore logic
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
        if (!isShift && activeEl === last) {
          e.preventDefault();
          first.focus();
        } else if (isShift && activeEl === first) {
          e.preventDefault();
          last.focus();
        }
      };
      document.addEventListener('keydown', handleKey, true);
      return () => document.removeEventListener('keydown', handleKey, true);
    } else if (openerRef.current) {
      openerRef.current.focus();
    }
  }, [active]);

  return (
    <div className="gallery" ref={containerRef} aria-labelledby={headingId}>
      <ul className="gallery-grid">
        {items.map((it) => {
          const showFull = loadedIds.has(it.id);
          const imgSrc = showFull ? it.src : it.thumb || it.src;
          // Derive srcSet from responsive image pipeline if file matches pattern
          let srcSet: string | undefined;
          if (it.src.endsWith('.jpg') || it.src.endsWith('.jpeg') || it.src.endsWith('.png')) {
            const baseName = it.src.replace(/^.*\//, '').replace(/\.(jpg|jpeg|png)$/i, '');
            const widths = [320, 640, 960, 1280];
            srcSet = widths.map((w) => `/public_images/${w}/${baseName}.webp ${w}w`).join(', ');
          }
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
                    ? { srcSet, sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw' }
                    : {})}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <form
        aria-describedby="upload-help"
        className="gallery-upload-stub"
        onSubmit={(e) => e.preventDefault()}
      >
        <fieldset disabled>
          <legend>Contribute a Photo (Coming Soon)</legend>
          <input type="file" aria-label="Choose image" />
          <button type="submit">Upload</button>
          <p id="upload-help">
            Uploads are not enabled yet. This placeholder will be replaced with the contributor form
            workflow.
          </p>
        </fieldset>
      </form>
      {active && (
        <div
          className="gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || 'Image'}
          onKeyDown={onKeyDown}
          ref={modalRef}
        >
          <div className="gallery-modal-backdrop" onClick={() => setActive(null)} />
          <div className="gallery-modal-content">
            <img src={active.src} alt={active.caption || ''} />
            {active.caption && <p className="gallery-caption">{active.caption}</p>}
            <button
              type="button"
              className="gallery-close"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
