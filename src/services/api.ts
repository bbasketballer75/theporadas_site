/**
 * API service layer for Cloud Run backend
 * Provides comprehensive CRUD operations for family data, guest messages, and image processing
 * with built-in error handling, retries, and timeout management.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://wedding-functions-956393407443.us-central1.run.app';

/**
 * Represents a family member in the family tree
 * @interface FamilyMember
 */
export interface FamilyMember {
  /** Unique identifier for the family member */
  id?: string;
  /** Full name of the family member */
  name: string;
  /** Relationship to the primary family (e.g., 'parent', 'child', 'sibling') */
  relationship: string;
  /** Birth date in ISO string format */
  birthDate?: string;
  /** URL to the member's photo */
  photoUrl?: string;
  /** Additional description or biography */
  description?: string;
  /** Array of parent member IDs */
  parentIds: string[];
  /** Array of children member IDs */
  childrenIds: string[];
  /** Spouse member ID if applicable */
  spouseId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Represents a family tree structure
 * @interface FamilyTree
 */
export interface FamilyTree {
  /** Unique identifier for the family tree */
  id: string;
  /** Name of the family tree */
  name: string;
  /** Array of family members in this tree */
  members: FamilyMember[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Represents a guest message from the wedding website
 * @interface GuestMessage
 */
export interface GuestMessage {
  /** Unique identifier for the message */
  id?: string;
  /** Name of the guest who sent the message */
  name: string;
  /** Email address of the guest (optional) */
  email?: string;
  /** The message content */
  message: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Makes an API request with automatic retries, timeout handling, and error normalization
 * @template T - The expected response type
 * @param endpoint - API endpoint path (without base URL)
 * @param options - Fetch options including method, headers, body
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise resolving to the parsed JSON response
 * @throws Error with normalized error messages
 * @example
 * ```typescript
 * const data = await apiRequest<User[]>('/users', { method: 'GET' });
 * ```
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, retries: number = 3): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  if (process.env.NODE_ENV === 'development') {
    console.log('[KILO CODE DEBUG] API Request:', { endpoint, url, method: options.method || 'GET', retries });
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[KILO CODE DEBUG] Attempt ${attempt}/${retries} for ${endpoint}`);
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });

      // Create fetch promise
      const fetchPromise = fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        mode: 'cors',
        ...options,
      });

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (process.env.NODE_ENV === 'development') {
        console.log('[KILO CODE DEBUG] API Response:', {
          endpoint,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          attempt
        });
      }

      if (!response.ok) {
        throw createHttpError(response, endpoint);
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If we get HTML, it's likely a 404 or routing issue
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`API endpoint not found. Check that the backend service is running and the URL is correct.`);
        } else {
          const textResponse = await response.text();
          throw new Error(`Expected JSON response but received: ${contentType || 'unknown content type'}. Response: ${textResponse.substring(0, 200)}`);
        }
      }

      const result = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('[KILO CODE DEBUG] API Success:', { endpoint, result });
      }
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[KILO CODE DEBUG] API Error on attempt ${attempt}:`, { endpoint, error });
      }

      // Handle AbortError separately
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }

      // Handle timeout errors
      if (error instanceof Error && error.message === 'Request timeout') {
        throw new Error('Request timed out after 10 seconds');
      }

      // Do not retry on 4xx client errors, but retry on 5xx server errors
      if (error instanceof Error && error.message.includes('Request failed')) {
        throw error;
      }

      if (attempt === retries) {
        throw normalizeError(error);
      }

      const delay = calculateRetryDelay(attempt);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[KILO CODE DEBUG] Retrying ${endpoint} in ${delay}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unexpected error in API request');
}

/**
 * Creates a user-friendly error message based on HTTP response status
 * @param response - The fetch Response object
 * @param endpoint - The API endpoint that was called
 * @returns Error with appropriate message for the status code
 */
function createHttpError(response: Response, endpoint: string): Error {
  if (response.status === 404) {
    return new Error(`Resource not found: ${endpoint}`);
  }
  if (response.status === 429) {
    return new Error('Too many requests. Please try again later.');
  }
  if (response.status >= 500) {
    return new Error('Server error. Please try again later.');
  }
  if (response.status === 403) {
    return new Error('Access denied. Please check your permissions.');
  }
  if (response.status === 401) {
    return new Error('Authentication required. Please log in.');
  }
  return new Error(`Request failed: ${response.status} ${response.statusText}`);
}

/**
 * Normalizes any error type to a standard Error object
 * @param error - The error to normalize
 * @returns A standard Error object with a message
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error('Network error occurred');
}

/**
 * Calculates exponential backoff delay for retry attempts
 * @param attempt - The current attempt number (1-based)
 * @returns Delay in milliseconds (max 5000ms)
 */
function calculateRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 5000);
}

// Family Members CRUD operations
/**
 * Service for managing family member data through the API
 * Provides CRUD operations for family members with automatic data transformation
 * @namespace familyMembersService
 */
export const familyMembersService = {
  // Get all family members - changed to POST as per backend requirements
  async getAll(): Promise<FamilyMember[]> {
    const data = await apiRequest<{ members: FamilyMember[] }>('/family-member', {
      method: 'POST', // Changed from GET to POST
      body: JSON.stringify({}), // Empty body for POST request
    });
    return data.members.map((member) => ({
      ...member,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt),
    }));
  },

  // Get family member by ID
  async getById(id: string): Promise<FamilyMember | null> {
    try {
      const member = await apiRequest<FamilyMember>(`/family-member/${id}`);
      return {
        ...member,
        createdAt: new Date(member.createdAt),
        updatedAt: new Date(member.updatedAt),
      };
    } catch (error) {
      // If member not found, return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  // Add new family member
  async add(member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const data = await apiRequest<{ id: string }>('/family-member', {
      method: 'POST',
      body: JSON.stringify(member),
    });
    return data.id;
  },

  // Update family member
  async update(id: string, updates: Partial<FamilyMember>): Promise<void> {
    await apiRequest(`/family-member/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete family member
  async delete(id: string): Promise<void> {
    await apiRequest(`/family-member/${id}`, {
      method: 'DELETE',
    });
  },

  // Get family members by relationship
  async getByRelationship(relationship: string): Promise<FamilyMember[]> {
    const data = await apiRequest<{ members: FamilyMember[] }>(
      `/family-member?relationship=${encodeURIComponent(relationship)}`,
    );
    return data.members.map((member) => ({
      ...member,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt),
    }));
  },
};

// Family Trees CRUD operations
export const familyTreesService = {
  // Get all family trees
  async getAll(): Promise<FamilyTree[]> {
    const data = await apiRequest<{ trees: FamilyTree[] }>('/family-tree');
    return data.trees.map((tree) => ({
      ...tree,
      createdAt: new Date(tree.createdAt),
      updatedAt: new Date(tree.updatedAt),
      members: tree.members.map((member) => ({
        ...member,
        createdAt: new Date(member.createdAt),
        updatedAt: new Date(member.updatedAt),
      })),
    }));
  },

  // Get family tree by ID
  async getById(id: string): Promise<FamilyTree | null> {
    try {
      const tree = await apiRequest<FamilyTree>(`/family-tree/${id}`);
      return {
        ...tree,
        createdAt: new Date(tree.createdAt),
        updatedAt: new Date(tree.updatedAt),
        members: tree.members.map((member) => ({
          ...member,
          createdAt: new Date(member.createdAt),
          updatedAt: new Date(member.updatedAt),
        })),
      };
    } catch (error) {
      // If tree not found, return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  // Add new family tree
  async add(tree: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const data = await apiRequest<{ id: string }>('/family-tree', {
      method: 'POST',
      body: JSON.stringify(tree),
    });
    return data.id;
  },

  // Update family tree
  async update(id: string, updates: Partial<FamilyTree>): Promise<void> {
    await apiRequest(`/family-tree/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete family tree
  async delete(id: string): Promise<void> {
    await apiRequest(`/family-tree/${id}`, {
      method: 'DELETE',
    });
  },
};

// Guest Messages service
export const guestMessagesService = {
  // Get all guest messages
  async getAll(): Promise<GuestMessage[]> {
    try {
      const data = await apiRequest<{ messages: GuestMessage[] }>('/guest-messages');
      return data.messages.map((message) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      }));
    } catch (error) {
      // Enhanced error handling for 500 errors
      if (error instanceof Error && error.message.includes('Server error')) {
        throw new Error(
          'Unable to load guest messages at this time. The server may be experiencing issues. Please try again later.',
        );
      }
      throw error;
    }
  },

  // Add new guest message
  async add(message: Omit<GuestMessage, 'id' | 'createdAt'>): Promise<string> {
    const data = await apiRequest<{ id: string }>('/guest-message', {
      method: 'POST',
      body: JSON.stringify(message),
    });
    return data.id;
  },
};

// Image processing service
export const imageProcessingService = {
  // Process an image
  async processImage(imageFile: File): Promise<{ processedUrl: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/process-image`, {
      method: 'POST',
      body: formData,
      mode: 'cors', // Add CORS handling
    });

    if (!response.ok) {
      throw new Error(`Image processing failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};
