import {
  deleteObject,
  FullMetadata,
  getDownloadURL,
  listAll,
  ListResult,
  ref,
  StorageError,
  StorageReference,
  uploadBytes,
} from 'firebase/storage';

import { storage } from './config';

export interface UploadResultData {
  downloadURL: string;
  ref: StorageReference;
  metadata?: FullMetadata;
}

export interface StorageErrorData {
  code: string;
  message: string;
  name: string;
}

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
  path: string,
  file: File | Blob | Uint8Array,
  metadata?: FullMetadata,
): Promise<{ result: UploadResultData | null; error: StorageErrorData | null }> {
  try {
    const storageRef = ref(storage, path);
    const result = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(result.ref);

    return {
      result: {
        downloadURL,
        ref: result.ref,
        metadata: result.metadata,
      },
      error: null,
    };
  } catch (error) {
    const storageError = error as StorageError;
    return {
      result: null,
      error: {
        code: storageError.code,
        message: storageError.message,
        name: storageError.name,
      },
    };
  }
}

/**
 * Get download URL for a file
 */
export async function getFileURL(
  path: string,
): Promise<{ url: string | null; error: StorageErrorData | null }> {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return { url, error: null };
  } catch (error) {
    const storageError = error as StorageError;
    return {
      url: null,
      error: {
        code: storageError.code,
        message: storageError.message,
        name: storageError.name,
      },
    };
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<{ error: StorageErrorData | null }> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { error: null };
  } catch (error) {
    const storageError = error as StorageError;
    return {
      error: {
        code: storageError.code,
        message: storageError.message,
        name: storageError.name,
      },
    };
  }
}

/**
 * List all files in a directory
 */
export async function listFiles(
  path: string,
): Promise<{ items: StorageReference[]; error: StorageErrorData | null }> {
  try {
    const storageRef = ref(storage, path);
    const result: ListResult = await listAll(storageRef);
    return { items: result.items, error: null };
  } catch (error) {
    const storageError = error as StorageError;
    return {
      items: [],
      error: {
        code: storageError.code,
        message: storageError.message,
        name: storageError.name,
      },
    };
  }
}

/**
 * Create a storage reference
 */
export function createStorageRef(path: string): StorageReference {
  return ref(storage, path);
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  path: string,
): Promise<{ metadata: FullMetadata | null; error: StorageErrorData | null }> {
  try {
    const storageRef = ref(storage, path);
    const { getMetadata } = await import('firebase/storage');
    const metadata = await getMetadata(storageRef);
    return { metadata, error: null };
  } catch (error) {
    const storageError = error as StorageError;
    return {
      metadata: null,
      error: {
        code: storageError.code,
        message: storageError.message,
        name: storageError.name,
      },
    };
  }
}
