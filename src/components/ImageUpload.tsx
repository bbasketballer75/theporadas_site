import React, { useState } from 'react';

import { imageProcessingService } from '../services/api';

interface ImageUploadProps {
  onImageProcessed?: (processedUrl: string) => void;
  maxFileSizeMB?: number;
  acceptedTypes?: string[];
}

export function ImageUpload({
  onImageProcessed,
  maxFileSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Please select a valid image file (${acceptedTypes.join(', ')})`;
    }

    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxFileSizeMB}MB`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setProcessedUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const result = await imageProcessingService.processImage(selectedFile);
      setProcessedUrl(result.processedUrl);

      if (onImageProcessed) {
        onImageProcessed(result.processedUrl);
      }
    } catch (err) {
      setError('Failed to process image. Please try again.');
      console.error('Error processing image:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    if (!processedUrl) return;

    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = `processed-${selectedFile?.name || 'image'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setProcessedUrl(null);
    setError(null);
  };

  return (
    <div className="image-upload" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Upload and Process Image</h3>

      {/* File Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="file-input"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#4ecdc4',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Choose Image
        </label>
        <input
          id="file-input"
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {selectedFile && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            color: 'red',
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#ffe6e6',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !processedUrl && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            backgroundColor: uploading ? '#ccc' : '#4ecdc4',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginRight: '10px',
          }}
        >
          {uploading ? 'Processing...' : 'Process Image'}
        </button>
      )}

      {/* Reset Button */}
      {(selectedFile || processedUrl) && (
        <button
          onClick={resetUpload}
          style={{
            backgroundColor: '#666',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      )}

      {/* Image Preview */}
      {selectedFile && !processedUrl && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#555' }}>Original Image:</h4>
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Original"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
      )}

      {/* Processed Image */}
      {processedUrl && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#555' }}>Processed Image:</h4>
          <img
            src={processedUrl}
            alt="Processed"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={handleDownload}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Download Processed Image
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#666',
        }}
      >
        <strong>Instructions:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Select an image file (JPEG, PNG, GIF, or WebP)</li>
          <li>Maximum file size: {maxFileSizeMB}MB</li>
          <li>Click &quot;Process Image&quot; to apply enhancements</li>
          <li>Download the processed image when ready</li>
        </ul>
      </div>
    </div>
  );
}
