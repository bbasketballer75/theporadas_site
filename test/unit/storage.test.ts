import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
  type FullMetadata,
  type StorageError,
  type StorageReference,
} from 'firebase/storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storage } from '../src/firebase/config';
import {
  createStorageRef,
  deleteFile,
  getFileMetadata,
  getFileURL,
  listFiles,
  uploadFile,
} from '../src/firebase/storage';

// Mock type for Firebase Storage
type MockFirebaseStorage = {
  bucket: string;
  maxOperationRetryTime: number;
  maxUploadRetryTime: number;
  app: {
    name: string;
    options: Record<string, unknown>;
    automaticDataCollectionEnabled: boolean;
  };
};

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
  listAll: vi.fn(),
  ref: vi.fn(),
  getMetadata: vi.fn(),
}));

// Mock Firebase config
vi.mock('../src/firebase/config', () => ({
  storage: {
    // Mock storage instance
  },
}));

describe('Firebase Storage Service', () => {
  const mockStorageRef: StorageReference = {
    bucket: 'test-bucket',
    fullPath: 'test/path/file.jpg',
    name: 'file.jpg',
    parent: null,
    root: {} as StorageReference,
    storage: {} as MockFirebaseStorage,
  };

  const mockFullMetadata: FullMetadata = {
    bucket: 'test-bucket',
    fullPath: 'test/path/file.jpg',
    generation: '1234567890',
    metageneration: '1',
    name: 'file.jpg',
    size: 1024,
    timeCreated: '2023-01-01T00:00:00Z',
    updated: '2023-01-01T00:00:00Z',
    md5Hash: 'mock-md5-hash',
    cacheControl: 'public, max-age=3600',
    contentDisposition: 'inline',
    contentEncoding: 'gzip',
    contentLanguage: 'en',
    contentType: 'image/jpeg',
    downloadTokens: ['mock-download-token'],
    customMetadata: {
      uploadedBy: 'test-user',
    },
  };

  const mockUploadResult = {
    ref: mockStorageRef,
    metadata: mockFullMetadata,
  };

  const mockListResult = {
    items: [mockStorageRef],
    prefixes: [],
    nextPageToken: undefined,
  };

  const mockStorageError = {
    code: 'storage/unknown',
    message: 'Mock storage error',
    name: 'StorageError',
    customData: {
      serverResponse: 'Mock server response',
    },
    status: 500,
    serverResponse: 'Mock server response',
    status_: 500,
  } as unknown as StorageError;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock ref to return our mock storage reference
    vi.mocked(ref).mockReturnValue(mockStorageRef);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('uploadFile', () => {
    const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const testPath = 'test/path/file.jpg';

    it('should upload file successfully', async () => {
      const mockDownloadURL = 'https://firebasestorage.googleapis.com/download-url';
      vi.mocked(uploadBytes).mockResolvedValue(mockUploadResult);
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL);

      const result = await uploadFile(testPath, testFile);

      expect(ref).toHaveBeenCalledWith(storage, testPath);
      expect(uploadBytes).toHaveBeenCalledWith(mockStorageRef, testFile, undefined);
      expect(getDownloadURL).toHaveBeenCalledWith(mockStorageRef);
      expect(result).toEqual({
        result: {
          downloadURL: mockDownloadURL,
          ref: mockStorageRef,
          metadata: mockFullMetadata,
        },
        error: null,
      });
    });

    it('should upload file with metadata successfully', async () => {
      const mockDownloadURL = 'https://firebasestorage.googleapis.com/download-url';
      const customMetadata: FullMetadata = {
        ...mockFullMetadata,
        customMetadata: { uploadedBy: 'test-user', category: 'wedding' },
      };
      const uploadResultWithMetadata = { ...mockUploadResult, metadata: customMetadata };

      vi.mocked(uploadBytes).mockResolvedValue(uploadResultWithMetadata);
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL);

      const result = await uploadFile(testPath, testFile, customMetadata);

      expect(uploadBytes).toHaveBeenCalledWith(mockStorageRef, testFile, customMetadata);
      expect(result.result?.metadata).toEqual(customMetadata);
    });

    it('should upload Blob successfully', async () => {
      const testBlob = new Blob(['test content'], { type: 'image/jpeg' });
      const mockDownloadURL = 'https://firebasestorage.googleapis.com/download-url';
      vi.mocked(uploadBytes).mockResolvedValue(mockUploadResult);
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL);

      const result = await uploadFile(testPath, testBlob);

      expect(uploadBytes).toHaveBeenCalledWith(mockStorageRef, testBlob, undefined);
      expect(result.result?.downloadURL).toBe(mockDownloadURL);
    });

    it('should upload Uint8Array successfully', async () => {
      const testUint8Array = new Uint8Array([1, 2, 3, 4, 5]);
      const mockDownloadURL = 'https://firebasestorage.googleapis.com/download-url';
      vi.mocked(uploadBytes).mockResolvedValue(mockUploadResult);
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL);

      const result = await uploadFile(testPath, testUint8Array);

      expect(uploadBytes).toHaveBeenCalledWith(mockStorageRef, testUint8Array, undefined);
      expect(result.result?.downloadURL).toBe(mockDownloadURL);
    });

    it('should handle upload error', async () => {
      vi.mocked(uploadBytes).mockRejectedValue(mockStorageError);

      const result = await uploadFile(testPath, testFile);

      expect(result).toEqual({
        result: null,
        error: {
          code: mockStorageError.code,
          message: mockStorageError.message,
          name: mockStorageError.name,
        },
      });
    });

    it('should handle getDownloadURL error after successful upload', async () => {
      vi.mocked(uploadBytes).mockResolvedValue(mockUploadResult);
      vi.mocked(getDownloadURL).mockRejectedValue(mockStorageError);

      const result = await uploadFile(testPath, testFile);

      expect(result).toEqual({
        result: null,
        error: {
          code: mockStorageError.code,
          message: mockStorageError.message,
          name: mockStorageError.name,
        },
      });
    });
  });

  describe('getFileURL', () => {
    const testPath = 'test/path/file.jpg';

    it('should get download URL successfully', async () => {
      const mockDownloadURL = 'https://firebasestorage.googleapis.com/download-url';
      vi.mocked(getDownloadURL).mockResolvedValue(mockDownloadURL);

      const result = await getFileURL(testPath);

      expect(ref).toHaveBeenCalledWith(storage, testPath);
      expect(getDownloadURL).toHaveBeenCalledWith(mockStorageRef);
      expect(result).toEqual({
        url: mockDownloadURL,
        error: null,
      });
    });

    it('should handle getDownloadURL error', async () => {
      vi.mocked(getDownloadURL).mockRejectedValue(mockStorageError);

      const result = await getFileURL(testPath);

      expect(result).toEqual({
        url: null,
        error: {
          code: mockStorageError.code,
          message: mockStorageError.message,
          name: mockStorageError.name,
        },
      });
    });
  });

  describe('deleteFile', () => {
    const testPath = 'test/path/file.jpg';

    it('should delete file successfully', async () => {
      vi.mocked(deleteObject).mockResolvedValue(undefined);

      const result = await deleteFile(testPath);

      expect(ref).toHaveBeenCalledWith(storage, testPath);
      expect(deleteObject).toHaveBeenCalledWith(mockStorageRef);
      expect(result).toEqual({ error: null });
    });

    it('should handle delete error', async () => {
      vi.mocked(deleteObject).mockRejectedValue(mockStorageError);

      const result = await deleteFile(testPath);

      expect(result).toEqual({
        error: {
          code: mockStorageError.code,
          message: mockStorageError.message,
          name: mockStorageError.name,
        },
      });
    });
  });

  describe('listFiles', () => {
    const testPath = 'test/path/';

    it('should list files successfully', async () => {
      vi.mocked(listAll).mockResolvedValue(mockListResult);

      const result = await listFiles(testPath);

      expect(ref).toHaveBeenCalledWith(storage, testPath);
      expect(listAll).toHaveBeenCalledWith(mockStorageRef);
      expect(result).toEqual({
        items: [mockStorageRef],
        error: null,
      });
    });

    it('should handle list error', async () => {
      vi.mocked(listAll).mockRejectedValue(mockStorageError);

      const result = await listFiles(testPath);

      expect(result).toEqual({
        items: [],
        error: {
          code: mockStorageError.code,
          message: mockStorageError.message,
          name: mockStorageError.name,
        },
      });
    });
  });

  describe('createStorageRef', () => {
    const testPath = 'test/path/file.jpg';

    it('should create storage reference', () => {
      const result = createStorageRef(testPath);

      expect(ref).toHaveBeenCalledWith(storage, testPath);
      expect(result).toBe(mockStorageRef);
    });
  });

  describe('getFileMetadata', () => {
    const testPath = 'test/path/file.jpg';

    it('should get file metadata successfully', async () => {
      vi.mocked(getMetadata).mockResolvedValue(mockFullMetadata);

      const result = await getFileMetadata(testPath);

      expect(ref).toHaveBeenCalledWith(storage, testPath);
      expect(getMetadata).toHaveBeenCalledWith(mockStorageRef);
      expect(result).toEqual({
        metadata: mockFullMetadata,
        error: null,
      });
    });

    it('should handle getMetadata error', async () => {
      vi.mocked(getMetadata).mockRejectedValue(mockStorageError);

      const result = await getFileMetadata(testPath);

      expect(result).toEqual({
        metadata: null,
        error: {
          code: mockStorageError.code,
          message: mockStorageError.message,
          name: mockStorageError.name,
        },
      });
    });
  });
});
