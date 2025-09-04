import React, { useRef } from 'react';

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
  measureClick: (id: string, handler: () => void) => () => void;
  setActive: (item: InternalItem | null) => void;
  modalRef: React.RefObject<HTMLDialogElement | null>;
  retryModalImage: () => void;
}

export function GalleryModal({
  active,
  modalImageState,
  handleModalImageLoad,
  handleModalImageError,
  handleModalImageTimeout,
  startModalImageLoad,
  measureClick,
  setActive,
  modalRef,
  retryModalImage,
}: GalleryModalProps) {

  if (!active) return null;

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
          aria-label="Close gallery modal"
          type="button"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 1000,
          }}
        >
          ×
        </button>
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
              onClick={retryModalImage}
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
        {active.caption && (
          <p className="gallery-caption" data-testid="photo-caption">
            {active.caption}
          </p>
        )}
      </div>
    </dialog>
  );
}