import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import React from 'react';
import {
  useFamilyMembers,
  useFamilyMember,
  useFamilyMembersByRelationship,
  useGuestMessages,
  useAddGuestMessage,
  useAddFamilyMember,
  useUpdateFamilyMember,
  useDeleteFamilyMember,
  type FamilyMember,
  type GuestMessage,
} from '../../src/hooks/useApi';

// Mock server setup
const server = setupServer();

// Test data
const mockMember: FamilyMember = {
  id: '1',
  name: 'John Doe',
  relationship: 'Father',
  birthDate: '1980-01-01',
  photoUrl: 'https://example.com/photo.jpg',
  description: 'Family patriarch',
  parentIds: [],
  childrenIds: ['2'],
  spouseId: undefined,
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  updatedAt: new Date('2023-01-01T00:00:00.000Z'),
};

const mockMessage: GuestMessage = {
  id: '1',
  name: 'John Guest',
  email: 'john@example.com',
  message: 'Congratulations!',
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
};

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('React Query Hooks Integration Tests', () => {
  beforeEach(() => {
    // Set up mock API base URL for tests
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001');

    // Configure MSW handlers
    server.use(
      // Family Members endpoints
      http.post('http://localhost:3001/family-member', async ({ request }) => {
        const body = await request.json();
        if (body && Object.keys(body).length === 0) {
          // GET all request (POST with empty body)
          return HttpResponse.json({ members: [mockMember] });
        }
        // ADD request
        return HttpResponse.json({ id: 'new-id' });
      }),

      http.get('http://localhost:3001/family-member/:id', ({ params }) => {
        const { id } = params;
        if (id === '1') {
          return HttpResponse.json(mockMember);
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),

      http.put('http://localhost:3001/family-member/:id', () => {
        return HttpResponse.json({});
      }),

      http.delete('http://localhost:3001/family-member/:id', () => {
        return HttpResponse.json({});
      }),

      http.get('http://localhost:3001/family-member', ({ request }) => {
        const url = new URL(request.url);
        const relationship = url.searchParams.get('relationship');
        if (relationship === 'Father') {
          return HttpResponse.json({ members: [mockMember] });
        }
        return HttpResponse.json({ members: [] });
      }),

      // Guest Messages endpoints
      http.get('http://localhost:3001/guest-messages', () => {
        return HttpResponse.json({ messages: [mockMessage] });
      }),

      http.post('http://localhost:3001/guest-message', () => {
        return HttpResponse.json({ id: 'new-message-id' });
      }),
    );

    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('useFamilyMembers', () => {
    it('should fetch family members successfully', async () => {
      const { result } = renderHook(() => useFamilyMembers(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockMember]);
      expect(result.current.error).toBeNull();
    });

    it('should handle error states', async () => {
      server.use(
        http.post('http://localhost:3001/family-member', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useFamilyMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useFamilyMember', () => {
    it('should fetch single family member successfully', async () => {
      const { result } = renderHook(() => useFamilyMember('1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMember);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when id is undefined', async () => {
      const { result } = renderHook(() => useFamilyMember(undefined as any), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle 404 errors gracefully', async () => {
      const { result } = renderHook(() => useFamilyMember('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useFamilyMembersByRelationship', () => {
    it('should fetch family members by relationship successfully', async () => {
      const { result } = renderHook(() => useFamilyMembersByRelationship('Father'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockMember]);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when relationship is undefined', async () => {
      const { result } = renderHook(() => useFamilyMembersByRelationship(undefined as any), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle empty results', async () => {
      const { result } = renderHook(() => useFamilyMembersByRelationship('Unknown'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useGuestMessages', () => {
    it('should fetch guest messages successfully', async () => {
      const { result } = renderHook(() => useGuestMessages(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockMessage]);
      expect(result.current.error).toBeNull();
    });

    it('should handle server errors with custom error message', async () => {
      server.use(
        http.get('http://localhost:3001/guest-messages', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useGuestMessages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Unable to load guest messages');
    });
  });

  describe('useAddGuestMessage', () => {
    it('should add guest message and invalidate queries', async () => {
      const { result } = renderHook(() => useAddGuestMessage(), {
        wrapper: createWrapper(),
      });

      const newMessage = {
        name: 'Jane Guest',
        email: 'jane@example.com',
        message: 'Best wishes!',
      };

      expect(result.current.isIdle).toBe(true);

      result.current.mutate(newMessage);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('new-message-id');
      expect(result.current.error).toBeNull();
    });

    it('should handle mutation errors', async () => {
      server.use(
        http.post('http://localhost:3001/guest-message', () => {
          return HttpResponse.json({ error: 'Validation failed' }, { status: 400 });
        }),
      );

      const { result } = renderHook(() => useAddGuestMessage(), {
        wrapper: createWrapper(),
      });

      const newMessage = {
        name: '',
        message: '',
      };

      result.current.mutate(newMessage);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useAddFamilyMember', () => {
    it('should add family member and invalidate queries', async () => {
      const { result } = renderHook(() => useAddFamilyMember(), {
        wrapper: createWrapper(),
      });

      const newMember = {
        name: 'Jane Doe',
        relationship: 'Mother',
        parentIds: [],
        childrenIds: [],
        spouseId: undefined,
      };

      expect(result.current.isIdle).toBe(true);

      result.current.mutate(newMember);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('new-id');
      expect(result.current.error).toBeNull();
    });
  });

  describe('useUpdateFamilyMember', () => {
    it('should update family member and invalidate queries', async () => {
      const { result } = renderHook(() => useUpdateFamilyMember(), {
        wrapper: createWrapper(),
      });

      const updateParams = {
        id: '1',
        updates: { name: 'Updated Name' },
      };

      expect(result.current.isIdle).toBe(true);

      result.current.mutate(updateParams);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });
  });

  describe('useDeleteFamilyMember', () => {
    it('should delete family member and invalidate queries', async () => {
      const { result } = renderHook(() => useDeleteFamilyMember(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isIdle).toBe(true);

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Query Invalidation and Cache Management', () => {
    it('should invalidate family members query after adding new member', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      });

      // Pre-populate cache
      queryClient.setQueryData(['family-members'], [mockMember]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result: addResult } = renderHook(() => useAddFamilyMember(), {
        wrapper,
      });

      const newMember = {
        name: 'Jane Doe',
        relationship: 'Mother',
        parentIds: [],
        childrenIds: [],
        spouseId: undefined,
      };

      addResult.current.mutate(newMember);

      await waitFor(() => {
        expect(addResult.current.isSuccess).toBe(true);
      });

      // Check that the query was invalidated
      expect(queryClient.getQueryState(['family-members'])?.isInvalidated).toBe(true);
    });

    it('should invalidate guest messages query after adding new message', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      });

      // Pre-populate cache
      queryClient.setQueryData(['guest-messages'], [mockMessage]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result: addResult } = renderHook(() => useAddGuestMessage(), {
        wrapper,
      });

      const newMessage = {
        name: 'Jane Guest',
        message: 'Hello!',
      };

      addResult.current.mutate(newMessage);

      await waitFor(() => {
        expect(addResult.current.isSuccess).toBe(true);
      });

      // Check that the query was invalidated
      expect(queryClient.getQueryState(['guest-messages'])?.isInvalidated).toBe(true);
    });
  });

  describe('Loading and Error States', () => {
    it('should handle loading states correctly', async () => {
      const { result } = renderHook(() => useFamilyMembers(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetching).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle error states with proper error messages', async () => {
      server.use(
        http.post('http://localhost:3001/family-member', () => {
          return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
        }),
      );

      const { result } = renderHook(() => useFamilyMembers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toContain('Access denied');
      });
    });
  });
});