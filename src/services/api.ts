// API service layer for Cloud Run backend
const API_BASE_URL = 'https://wedding-functions-956393407443.us-central1.run.app';

type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
  signal?: AbortSignal;
};

// Family tree data types (same as Firebase version)
export interface FamilyMember {
  id?: string;
  name: string;
  relationship: string;
  birthDate?: string;
  photoUrl?: string;
  description?: string;
  parentIds: string[];
  childrenIds: string[];
  spouseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTree {
  id: string;
  name: string;
  members: FamilyMember[];
  createdAt: Date;
  updatedAt: Date;
}

// Guest message types
export interface GuestMessage {
  id?: string;
  name: string;
  email?: string;
  message: string;
  createdAt: Date;
}

// API helper functions
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 3,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw createHttpError(response, endpoint);
      }

      return response.json();
    } catch (error) {
      if (attempt === retries) {
        throw normalizeError(error);
      }

      const delay = calculateRetryDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unexpected error in API request');
}

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
  return new Error(`Request failed: ${response.status} ${response.statusText}`);
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error('Network error occurred');
}

function calculateRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 5000);
}

// Family Members CRUD operations
export const familyMembersService = {
  // Get all family members
  async getAll(): Promise<FamilyMember[]> {
    const data = await apiRequest<{ members: FamilyMember[] }>('/family-member');
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
    const data = await apiRequest<{ messages: GuestMessage[] }>('/guest-messages');
    return data.messages.map((message) => ({
      ...message,
      createdAt: new Date(message.createdAt),
    }));
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
    });

    if (!response.ok) {
      throw new Error(`Image processing failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};
