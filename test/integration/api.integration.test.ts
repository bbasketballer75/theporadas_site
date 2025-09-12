import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  familyMembersService,
  familyTreesService,
  guestMessagesService,
  imageProcessingService,
  type FamilyMember,
  type FamilyTree,
  type GuestMessage,
} from '../../src/services/api';

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

const mockTree: FamilyTree = {
  id: '1',
  name: 'Doe Family Tree',
  members: [mockMember],
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

// Mock API responses
const mockApiResponses = {
  familyMembers: {
    getAll: { members: [mockMember] },
    getById: mockMember,
    add: { id: 'new-id' },
    update: {},
    delete: {},
    getByRelationship: { members: [mockMember] },
  },
  familyTrees: {
    getAll: { trees: [mockTree] },
    getById: mockTree,
    add: { id: 'new-tree-id' },
    update: {},
    delete: {},
  },
  guestMessages: {
    getAll: { messages: [mockMessage] },
    add: { id: 'new-message-id' },
  },
  imageProcessing: {
    processImage: { processedUrl: 'https://example.com/processed.jpg' },
  },
};

describe('API Integration Tests', () => {
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
          return HttpResponse.json(mockApiResponses.familyMembers.getAll);
        }
        // ADD request
        return HttpResponse.json(mockApiResponses.familyMembers.add);
      }),

      http.get('http://localhost:3001/family-member/:id', ({ params }) => {
        const { id } = params;
        if (id === '1') {
          return HttpResponse.json(mockApiResponses.familyMembers.getById);
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),

      http.put('http://localhost:3001/family-member/:id', () => {
        return HttpResponse.json(mockApiResponses.familyMembers.update);
      }),

      http.delete('http://localhost:3001/family-member/:id', () => {
        return HttpResponse.json(mockApiResponses.familyMembers.delete);
      }),

      http.get('http://localhost:3001/family-member', ({ request }) => {
        const url = new URL(request.url);
        const relationship = url.searchParams.get('relationship');
        if (relationship === 'Father') {
          return HttpResponse.json(mockApiResponses.familyMembers.getByRelationship);
        }
        return HttpResponse.json({ members: [] });
      }),

      // Family Trees endpoints
      http.get('http://localhost:3001/family-tree', () => {
        return HttpResponse.json(mockApiResponses.familyTrees.getAll);
      }),

      http.get('http://localhost:3001/family-tree/:id', ({ params }) => {
        const { id } = params;
        if (id === '1') {
          return HttpResponse.json(mockApiResponses.familyTrees.getById);
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),

      http.post('http://localhost:3001/family-tree', () => {
        return HttpResponse.json(mockApiResponses.familyTrees.add);
      }),

      http.put('http://localhost:3001/family-tree/:id', () => {
        return HttpResponse.json(mockApiResponses.familyTrees.update);
      }),

      http.delete('http://localhost:3001/family-tree/:id', () => {
        return HttpResponse.json(mockApiResponses.familyTrees.delete);
      }),

      // Guest Messages endpoints
      http.get('http://localhost:3001/guest-messages', () => {
        return HttpResponse.json(mockApiResponses.guestMessages.getAll);
      }),

      http.post('http://localhost:3001/guest-message', () => {
        return HttpResponse.json(mockApiResponses.guestMessages.add);
      }),

      // Image Processing endpoint
      http.post('http://localhost:3001/process-image', () => {
        return HttpResponse.json(mockApiResponses.imageProcessing.processImage);
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

  describe('familyMembersService Integration', () => {
    describe('getAll', () => {
      it('should successfully fetch all family members with proper data transformation', async () => {
        const result = await familyMembersService.getAll();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockMember);
        expect(result[0].createdAt).toBeInstanceOf(Date);
        expect(result[0].updatedAt).toBeInstanceOf(Date);
      });

      it('should handle empty response', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.json({ members: [] });
          }),
        );

        const result = await familyMembersService.getAll();
        expect(result).toEqual([]);
      });
    });

    describe('getById', () => {
      it('should successfully fetch member by ID', async () => {
        const result = await familyMembersService.getById('1');

        expect(result).toEqual(mockMember);
        expect(result?.createdAt).toBeInstanceOf(Date);
        expect(result?.updatedAt).toBeInstanceOf(Date);
      });

      it('should return null for non-existent member', async () => {
        const result = await familyMembersService.getById('999');
        expect(result).toBeNull();
      });
    });

    describe('add', () => {
      it('should successfully add new family member', async () => {
        const newMember = {
          name: 'Jane Doe',
          relationship: 'Mother',
          parentIds: [],
          childrenIds: [],
          spouseId: undefined,
        };

        const result = await familyMembersService.add(newMember);
        expect(result).toBe('new-id');
      });

      it('should handle validation errors', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.json({ error: 'Validation failed' }, { status: 400 });
          }),
        );

        const newMember = {
          name: '',
          relationship: 'Invalid',
          parentIds: [],
          childrenIds: [],
          spouseId: undefined,
        };

        await expect(familyMembersService.add(newMember)).rejects.toThrow();
      });
    });

    describe('update', () => {
      it('should successfully update family member', async () => {
        const updates = { name: 'Updated Name' };
        await expect(familyMembersService.update('1', updates)).resolves.toBeUndefined();
      });

      it('should handle update of non-existent member', async () => {
        server.use(
          http.put('http://localhost:3001/family-member/:id', () => {
            return HttpResponse.json({ error: 'Not found' }, { status: 404 });
          }),
        );

        const updates = { name: 'Updated Name' };
        await expect(familyMembersService.update('999', updates)).rejects.toThrow();
      });
    });

    describe('delete', () => {
      it('should successfully delete family member', async () => {
        await expect(familyMembersService.delete('1')).resolves.toBeUndefined();
      });

      it('should handle deletion of non-existent member', async () => {
        server.use(
          http.delete('http://localhost:3001/family-member/:id', () => {
            return HttpResponse.json({ error: 'Not found' }, { status: 404 });
          }),
        );

        await expect(familyMembersService.delete('999')).rejects.toThrow();
      });
    });

    describe('getByRelationship', () => {
      it('should successfully fetch members by relationship', async () => {
        const result = await familyMembersService.getByRelationship('Father');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockMember);
      });

      it('should handle URL encoding for special characters', async () => {
        const result = await familyMembersService.getByRelationship('Step-Father');
        expect(result).toEqual([]);
      });

      it('should return empty array for relationship with no members', async () => {
        const result = await familyMembersService.getByRelationship('Unknown');
        expect(result).toEqual([]);
      });
    });
  });

  describe('familyTreesService Integration', () => {
    describe('getAll', () => {
      it('should successfully fetch all family trees', async () => {
        const result = await familyTreesService.getAll();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockTree);
        expect(result[0].createdAt).toBeInstanceOf(Date);
        expect(result[0].updatedAt).toBeInstanceOf(Date);
        expect(result[0].members[0].createdAt).toBeInstanceOf(Date);
      });
    });

    describe('getById', () => {
      it('should successfully fetch tree by ID', async () => {
        const result = await familyTreesService.getById('1');

        expect(result).toEqual(mockTree);
        expect(result?.createdAt).toBeInstanceOf(Date);
      });

      it('should return null for non-existent tree', async () => {
        const result = await familyTreesService.getById('999');
        expect(result).toBeNull();
      });
    });

    describe('add', () => {
      it('should successfully add new family tree', async () => {
        const newTree = {
          name: 'New Family Tree',
          members: [],
        };

        const result = await familyTreesService.add(newTree);
        expect(result).toBe('new-tree-id');
      });
    });

    describe('update', () => {
      it('should successfully update family tree', async () => {
        const updates = { name: 'Updated Tree Name' };
        await expect(familyTreesService.update('1', updates)).resolves.toBeUndefined();
      });
    });

    describe('delete', () => {
      it('should successfully delete family tree', async () => {
        await expect(familyTreesService.delete('1')).resolves.toBeUndefined();
      });
    });
  });

  describe('guestMessagesService Integration', () => {
    describe('getAll', () => {
      it('should successfully fetch all guest messages', async () => {
        const result = await guestMessagesService.getAll();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockMessage);
        expect(result[0].createdAt).toBeInstanceOf(Date);
      });

      it('should handle server errors gracefully', async () => {
        server.use(
          http.get('http://localhost:3001/guest-messages', () => {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }),
        );

        await expect(guestMessagesService.getAll()).rejects.toThrow(
          'Unable to load guest messages at this time. The server may be experiencing issues. Please try again later.',
        );
      });
    });

    describe('add', () => {
      it('should successfully add new guest message', async () => {
        const newMessage = {
          name: 'Jane Guest',
          email: 'jane@example.com',
          message: 'Best wishes!',
        };

        const result = await guestMessagesService.add(newMessage);
        expect(result).toBe('new-message-id');
      });

      it('should handle message without email', async () => {
        const newMessage = {
          name: 'Anonymous Guest',
          message: 'Hello!',
        };

        const result = await guestMessagesService.add(newMessage);
        expect(result).toBe('new-message-id');
      });
    });
  });

  describe('imageProcessingService Integration', () => {
    describe('processImage', () => {
      it('should successfully process image', async () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const result = await imageProcessingService.processImage(mockFile);

        expect(result).toEqual({ processedUrl: 'https://example.com/processed.jpg' });
      });

      it('should handle processing errors', async () => {
        server.use(
          http.post('http://localhost:3001/process-image', () => {
            return HttpResponse.json({ error: 'Processing failed' }, { status: 500 });
          }),
        );

        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        await expect(imageProcessingService.processImage(mockFile)).rejects.toThrow(
          'Image processing failed: 500 Internal Server Error',
        );
      });
    });
  });

  describe('Error Handling Integration', () => {
    describe('Network errors', () => {
      it('should handle network connectivity issues', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.error();
          }),
        );

        await expect(familyMembersService.getAll()).rejects.toThrow();
      });
    });

    describe('Timeout handling', () => {
      it('should handle request timeouts', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', async () => {
            // Simulate timeout by delaying response
            await new Promise((resolve) => setTimeout(resolve, 11000));
            return HttpResponse.json({ members: [] });
          }),
        );

        await expect(familyMembersService.getAll()).rejects.toThrow(/Request timed out|AbortError/);
      }, 20000);
    });

    describe('Authentication errors', () => {
      it('should handle 401 unauthorized errors', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }),
        );

        await expect(familyMembersService.getAll()).rejects.toThrow('Authentication required');
      });

      it('should handle 403 forbidden errors', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
          }),
        );

        await expect(familyMembersService.getAll()).rejects.toThrow('Access denied');
      });
    });

    describe('Rate limiting', () => {
      it('should handle 429 rate limit errors', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.json({ error: 'Rate limited' }, { status: 429 });
          }),
        );

        await expect(familyMembersService.getAll()).rejects.toThrow('Too many requests');
      });
    });

    describe('Server errors', () => {
      it('should handle 5xx server errors', async () => {
        server.use(
          http.post('http://localhost:3001/family-member', () => {
            return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
          }),
        );

        await expect(familyMembersService.getAll()).rejects.toThrow('Server error');
      });
    });
  });

  describe('Retry Mechanism Integration', () => {
    beforeEach(() => {
      // Ensure retries are enabled for this block
      vi.stubEnv('VITE_API_MAX_RETRIES', '3');
    });
    it('should retry on network failures', async () => {
      let attemptCount = 0;
      server.use(
        http.post('http://localhost:3001/family-member', () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      const result = await familyMembersService.getAll();
      expect(result).toEqual([]);
      expect(attemptCount).toBe(3);
    });

    it('should not retry on 4xx client errors', async () => {
      let attemptCount = 0;
      server.use(
        http.post('http://localhost:3001/family-member', () => {
          attemptCount++;
          return HttpResponse.json({ error: 'Bad request' }, { status: 400 });
        }),
      );

      await expect(familyMembersService.getAll()).rejects.toThrow();
      expect(attemptCount).toBe(1); // Should not retry on 4xx errors
    });

    it('should respect retry delay', async () => {
      const startTime = Date.now();
      let attemptCount = 0;

      server.use(
        http.post('http://localhost:3001/family-member', () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      await familyMembersService.getAll();
      const endTime = Date.now();

      // Should take at least the retry delays (1000ms + 2000ms = 3000ms)
      expect(endTime - startTime).toBeGreaterThan(3000);
    });
  });

  describe('Data Transformation Integration', () => {
    it('should transform date strings to Date objects in family members', async () => {
      const apiResponse = {
        members: [
          {
            ...mockMember,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      };

      server.use(
        http.post('http://localhost:3001/family-member', () => {
          return HttpResponse.json(apiResponse);
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should transform date strings to Date objects in family trees', async () => {
      const apiResponse = {
        trees: [
          {
            ...mockTree,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            members: [
              {
                ...mockMember,
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      };

      server.use(
        http.get('http://localhost:3001/family-tree', () => {
          return HttpResponse.json(apiResponse);
        }),
      );

      const result = await familyTreesService.getAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].members[0].createdAt).toBeInstanceOf(Date);
    });

    it('should transform date strings to Date objects in guest messages', async () => {
      const apiResponse = {
        messages: [
          {
            ...mockMessage,
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      };

      server.use(
        http.get('http://localhost:3001/guest-messages', () => {
          return HttpResponse.json(apiResponse);
        }),
      );

      const result = await guestMessagesService.getAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });
  });
});
