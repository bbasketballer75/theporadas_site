/**
 * API service layer for Cloud Run backend
 * Provides comprehensive CRUD operations for family data, guest messages, and image processing
 * with built-in error handling, retries, and timeout management.
 */
function getApiBaseUrl(): string {
  // Prefer process.env in Node/test contexts so vi.stubEnv works reliably
  const nodeEnvVal = (
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })?.process
      ?.env || {}
  ).VITE_API_BASE_URL;
  if (typeof nodeEnvVal === 'string' && nodeEnvVal.trim() !== '') {
    return nodeEnvVal;
  }
  // Prefer runtime env if defined (even if empty string), otherwise fallback
  const viteVal = (
    import.meta as unknown as {
      env?: Record<string, string | undefined>;
    }
  ).env?.VITE_API_BASE_URL;
  if (typeof viteVal === 'string' && viteVal.trim() !== '') {
    return viteVal;
  }
  // In Node/test environments, prefer an absolute base to satisfy undici fetch
  if (typeof window === 'undefined') {
    return 'http://localhost';
  }
  // In the browser, allow relative requests to same-origin by default
  return '';
}

function isDev(): boolean {
  return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
}

function isTestEnv(): boolean {
  // Prefer robust detection in Node/Vitest contexts
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    ?.process?.env;
  if (env) {
    if (env.VITEST === '1' || env.NODE_ENV === 'test' || env.JEST_WORKER_ID) return true;
  }
  return Boolean((import.meta as unknown as { vitest?: boolean }).vitest);
}

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
type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown | null;
};

function getMaxRetries(): number {
  // Respect explicit env override even in tests
  const envMax =
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })?.process
      ?.env?.VITE_API_MAX_RETRIES ??
    (
      import.meta as unknown as {
        env?: Record<string, string | undefined>;
      }
    ).env?.VITE_API_MAX_RETRIES;
  const parsed = envMax !== undefined && envMax !== null ? Number(envMax) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  // In tests without override, avoid internal retries so hooks report errors deterministically
  if (isTestEnv()) return 1;
  return 3;
}

function getTimeoutMs(): number {
  const envTimeout =
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })?.process
      ?.env?.VITE_API_TIMEOUT ??
    (
      import.meta as unknown as {
        env?: Record<string, string | undefined>;
      }
    ).env?.VITE_API_TIMEOUT;
  const parsed = envTimeout !== undefined && envTimeout !== null ? Number(envTimeout) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10000;
}

async function fetchWithTimeout(
  url: string,
  init: RequestOptions,
  timeoutMs?: number,
): Promise<Response> {
  const effTimeout = typeof timeoutMs === 'number' ? timeoutMs : getTimeoutMs();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), effTimeout);
  try {
    const resp = await fetch(url, {
      ...(init as Record<string, unknown>),
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      // Only set CORS mode in real browser runtime (not Vitest/jsdom).
      ...(typeof window !== 'undefined' && !(import.meta as unknown as { vitest?: boolean }).vitest
        ? ({ mode: 'cors' as const } as Record<string, unknown>)
        : {}),
      signal: controller.signal,
    } as unknown as Parameters<typeof fetch>[1]);
    return resp;
  } finally {
    clearTimeout(id);
  }
}

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    if (contentType && contentType.includes('text/html')) {
      throw new Error(
        'API endpoint not found. Check that the backend service is running and the URL is correct.',
      );
    }
    const textResponse = await response.text();
    throw new Error(
      `Expected JSON response but received: ${contentType || 'unknown content type'}. Response: ${textResponse.substring(0, 200)}`,
    );
  }
  return response.json();
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
  retries = getMaxRetries(),
  timeoutMs?: number,
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${endpoint}`;
  if (isDev()) {
    console.log('[KILO CODE DEBUG] API Request:', {
      endpoint,
      url,
      method: options.method || 'GET',
      retries,
      timeoutMs: timeoutMs ?? getTimeoutMs(),
    });
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (isDev()) console.log(`[KILO CODE DEBUG] Attempt ${attempt}/${retries} for ${endpoint}`);
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (isDev())
        console.log('[KILO CODE DEBUG] API Response:', {
          endpoint,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          attempt,
        });
      if (!response.ok) throw createHttpError(response, endpoint);
      const result = (await parseJsonOrThrow(response)) as T;
      if (isDev()) console.log('[KILO CODE DEBUG] API Success:', { endpoint, result });
      return result;
    } catch (error) {
      if (isDev())
        console.error(`[KILO CODE DEBUG] API Error on attempt ${attempt}:`, {
          endpoint,
          error,
        });
      const err = error instanceof Error ? error : new Error(String(error));
      const isTimeout = err.name === 'AbortError';
      if (
        err.message.includes('Request failed') ||
        /Access denied|Authentication required|Resource not found|Too many requests/.test(
          err.message,
        )
      ) {
        throw err;
      }
      if (attempt === retries) {
        if (isTimeout) throw new Error('Request timed out');
        throw normalizeError(err);
      }
      const delay = calculateRetryDelay(attempt);
      if (isDev()) console.log(`[KILO CODE DEBUG] Retrying ${endpoint} in ${delay}ms`);
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
    const data = await apiRequest<{ members?: unknown[] }>('/family-member', {
      method: 'POST', // Changed from GET to POST
      body: JSON.stringify({}), // Empty body for POST request
    });
    const members = Array.isArray(data?.members) ? data.members : [];
    return members.map((member) => {
      const obj = ensureObject<Record<string, unknown>>(member);
      return {
        ...obj,
        createdAt: parseDate((obj as { createdAt?: unknown }).createdAt),
        updatedAt: parseDate((obj as { updatedAt?: unknown }).updatedAt),
      } as unknown as FamilyMember;
    });
  },

  // Get family member by ID
  async getById(id: string): Promise<FamilyMember | null> {
    try {
      const member = await apiRequest<FamilyMember>(`/family-member/${id}`);
      return {
        ...member,
        createdAt: parseDate((member as unknown as { createdAt?: unknown })?.createdAt),
        updatedAt: parseDate((member as unknown as { updatedAt?: unknown })?.updatedAt),
      };
    } catch (error) {
      // If member not found, return null
      if (error instanceof Error && /Resource not found/i.test(error.message)) {
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
    const data = await apiRequest<{ members?: unknown[] }>(
      `/family-member?relationship=${encodeURIComponent(relationship)}`,
    );
    const members = Array.isArray(data?.members) ? data.members : [];
    return members.map((member) => {
      const obj = ensureObject<Record<string, unknown>>(member);
      return {
        ...obj,
        createdAt: parseDate((obj as { createdAt?: unknown }).createdAt),
        updatedAt: parseDate((obj as { updatedAt?: unknown }).updatedAt),
      } as unknown as FamilyMember;
    });
  },
};

// Family Trees CRUD operations
export const familyTreesService = {
  // Get all family trees
  async getAll(): Promise<FamilyTree[]> {
    const data = await apiRequest<{ trees?: unknown[] }>('/family-tree');
    const trees = Array.isArray(data?.trees) ? data.trees : [];
    const mapped = trees.map((tree) => ({
      ...ensureObject<Record<string, unknown>>(tree),
      createdAt: parseDate((tree as { createdAt?: unknown }).createdAt),
      updatedAt: parseDate((tree as { updatedAt?: unknown }).updatedAt),
      members: (Array.isArray((tree as { members?: unknown[] }).members)
        ? (tree as { members?: unknown[] }).members!
        : []
      ).map((member) => ({
        ...ensureObject<Record<string, unknown>>(member),
        createdAt: parseDate((member as { createdAt?: unknown }).createdAt),
        updatedAt: parseDate((member as { updatedAt?: unknown }).updatedAt),
      })),
    }));
    return mapped as unknown as FamilyTree[];
  },

  // Get family tree by ID
  async getById(id: string): Promise<FamilyTree | null> {
    try {
      const tree = await apiRequest<FamilyTree>(`/family-tree/${id}`);
      return {
        ...ensureObject<Record<string, unknown>>(tree),
        createdAt: parseDate((tree as { createdAt?: unknown }).createdAt),
        updatedAt: parseDate((tree as { updatedAt?: unknown }).updatedAt),
        members: (Array.isArray((tree as { members?: unknown[] }).members)
          ? (tree as { members?: unknown[] }).members!
          : []
        ).map((member) => ({
          ...ensureObject<Record<string, unknown>>(member),
          createdAt: parseDate((member as { createdAt?: unknown }).createdAt),
          updatedAt: parseDate((member as { updatedAt?: unknown }).updatedAt),
        })),
      } as unknown as FamilyTree;
    } catch (error) {
      // If tree not found, return null
      if (error instanceof Error && /Resource not found/i.test(error.message)) {
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
      const data = await apiRequest<{ messages?: unknown[] }>('/guest-messages');
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const mapped = messages.map((message) => ({
        ...ensureObject<Record<string, unknown>>(message),
        createdAt: parseDate((message as { createdAt?: unknown }).createdAt),
      }));
      return mapped as unknown as GuestMessage[];
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

    const response = await fetch(`${getApiBaseUrl()}/process-image`, {
      method: 'POST',
      body: formData,
      ...(typeof window !== 'undefined' ? { mode: 'cors' as const } : {}),
    });

    if (!response.ok) {
      throw new Error(`Image processing failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date(NaN);
}

function ensureObject<T extends Record<string, unknown>>(value: unknown): T {
  return value && typeof value === 'object' ? (value as T) : ({} as T);
}
