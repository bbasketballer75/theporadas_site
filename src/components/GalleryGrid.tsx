import React from 'react';

import { GalleryItemBase } from '../gallery/loader';

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
}

interface GalleryGridProps {
  groupedItems: Record<string, InternalItem[]>;
  categoryNames: Record<string, string>;
  loadedIds: Set<string>;
  imageStates: { [key: string]: string };
  handleImageLoad: (imageId: string) => void;
  handleImageError: (imageId: string) => void;
  measureClick: (
    id: string,
    handler?: (event: React.MouseEvent) => void,
  ) => (event: React.MouseEvent) => void;
  setActive: (item: InternalItem) => void;
  onOpenerRef: (ref: HTMLButtonElement) => void;
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

export function GalleryGrid({
  groupedItems,
  categoryNames,
  loadedIds,
  imageStates,
  handleImageLoad,
  handleImageError,
  measureClick,
  setActive,
  onOpenerRef,
}: GalleryGridProps) {
  return (
    <>
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
                    onClick={measureClick(`gallery-item-${it.id}`, (e) => {
                      onOpenerRef(e.currentTarget as HTMLButtonElement);
                      setActive(it);
                    })}
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
                      data-error={
                        imageStates[it.id] === 'error' || imageStates[it.id] === 'timeout'
                          ? 'true'
                          : 'false'
                      }
                      {...(srcSet
                        ? {
                            srcSet,
                            sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
                          }
                        : {})}
                    />
                    {!showFull && (
                      <div className="gallery-thumb-overlay">
                        <div className="gallery-thumb-spinner" />
                        <span className="gallery-thumb-text">Loading...</span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
