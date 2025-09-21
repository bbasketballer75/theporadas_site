import React from 'react';

import { GalleryItemBase } from '../gallery/loader';

interface InternalItem extends GalleryItemBase {
  loaded?: boolean;
  category?: string;
  videoLink?: string;
}

interface GalleryModalProps {
  active: InternalItem | null;
  modalImageState: string;
  handleModalImageLoad: () => void;
  handleModalImageError: () => void;
  handleModalImageTimeout: () => void;
  startModalImageLoad: () => void;
  measureClick: (
    id: string,
    handler?: (event: React.MouseEvent) => void,
  ) => (event: React.MouseEvent) => void;
  setActive: (item: InternalItem | null) => void;
  modalRef: React.RefObject<HTMLDialogElement | null>;
  retryModalImage: () => void;
}

export function GalleryModal({
  active,
  modalImageState,
  handleModalImageLoad,
  handleModalImageError,
  handleModalImageTimeout: _unusedHandleModalImageTimeout,
  startModalImageLoad: _unusedStartModalImageLoad,
  measureClick,
  setActive,
  modalRef,
  retryModalImage,
}: GalleryModalProps) {
  if (!active) return null;
  // Intentionally unused hooks provided by parent for future extensibility

  return (
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
        onClick={measureClick('gallery-modal-backdrop', () => setActive(null))}
        aria-label="Close gallery modal"
        type="button"
      />
      <div className="gallery-modal-content">
        <button
          className="gallery-close"
          onClick={measureClick('gallery-modal-close', () => setActive(null))}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        {modalImageState === 'loading' && (
          <div className="gallery-loading-overlay">
            <div className="gallery-loading-spinner" />
            <span className="gallery-loading-text">Loading image...</span>
          </div>
        )}
        {(modalImageState === 'error' || modalImageState === 'timeout') && (
          <div className="gallery-error-overlay">
            <span className="gallery-error-text">
              {modalImageState === 'timeout' ? 'Image load timeout' : 'Failed to load image'}
            </span>
            <button onClick={retryModalImage} className="gallery-error-retry">
              Retry
            </button>
          </div>
        )}
        <img
          src={active.src}
          alt={active.caption || ''}
          onLoad={handleModalImageLoad}
          onError={handleModalImageError}
          className={`modal-image ${modalImageState === 'loaded' ? 'is-loaded' : 'is-loading'}`}
        />
        {active.caption && (
          <p className="gallery-caption" data-testid="photo-caption">
            {active.caption}
          </p>
        )}
      </div>
    </dialog>
  );
}
