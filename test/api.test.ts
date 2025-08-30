import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  familyMembersService,
  familyTreesService,
  guestMessagesService,
  imageProcessingService,
  type FamilyMember,
  type FamilyTree,
  type GuestMessage,
} from '../src/services/api';

// Mock fetch globally
const fetchMock = vi.fn();

// Helper functions to create mock responses
const createMockResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(data),
});

const createMockErrorResponse = (status: number, statusText: string, data?: unknown) => ({
  ok: false,
  status,
  statusText,
  json: () => (data ? Promise.resolve(data) : Promise.reject(new Error(`Mock ${status} error`))),
});

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-stub global fetch after clearing mocks
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('familyMembersService', () => {
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
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    describe('getAll', () => {
      it('should fetch all family members successfully', async () => {
        const mockResponse = { members: [mockMember] };
        fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

        const result = await familyMembersService.getAll();

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual([mockMember]);
        expect(result[0].createdAt).toBeInstanceOf(Date);
        expect(result[0].updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('getById', () => {
      it('should fetch member by ID successfully', async () => {
        fetchMock.mockResolvedValueOnce(createMockResponse(mockMember));

        const result = await familyMembersService.getById('1');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member/1',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual(mockMember);
        expect(result?.createdAt).toBeInstanceOf(Date);
        expect(result?.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('add', () => {
      it('should add new family member successfully', async () => {
        const newMember = {
          name: 'Jane Doe',
          relationship: 'Mother',
          parentIds: [],
          childrenIds: [],
          spouseId: undefined,
        };

        fetchMock.mockResolvedValueOnce(createMockResponse({ id: 'new-id' }));

        const result = await familyMembersService.add(newMember);

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member',
          {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify(newMember),
          },
        );
        expect(result).toBe('new-id');
      });
    });

    describe('update', () => {
      it('should update family member successfully', async () => {
        const updates = { name: 'Updated Name' };
        fetchMock.mockResolvedValueOnce(createMockResponse({}));

        await familyMembersService.update('1', updates);

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member/1',
          {
            headers: { 'Content-Type': 'application/json' },
            method: 'PUT',
            body: JSON.stringify(updates),
          },
        );
      });
    });

    describe('delete', () => {
      it('should delete family member successfully', async () => {
        fetchMock.mockResolvedValueOnce(createMockResponse({}));

        await familyMembersService.delete('1');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member/1',
          {
            headers: { 'Content-Type': 'application/json' },
            method: 'DELETE',
          },
        );
      });
    });

    describe('getByRelationship', () => {
      it('should fetch members by relationship successfully', async () => {
        const mockResponse = { members: [mockMember] };
        fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

        const result = await familyMembersService.getByRelationship('Father');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member?relationship=Father',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual([mockMember]);
      });

      it('should handle special characters in relationship parameter', async () => {
        const mockResponse = { members: [] };
        fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

        const result = await familyMembersService.getByRelationship('Step-Father');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-member?relationship=Step-Father',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual([]);
      });
    });
  });

  describe('familyTreesService', () => {
    const mockTree: FamilyTree = {
      id: '1',
      name: 'Doe Family Tree',
      members: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    describe('getAll', () => {
      it('should fetch all family trees successfully', async () => {
        const mockResponse = { trees: [mockTree] };
        fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

        const result = await familyTreesService.getAll();

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-tree',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual([mockTree]);
        expect(result[0].createdAt).toBeInstanceOf(Date);
        expect(result[0].updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('getById', () => {
      it('should fetch tree by ID successfully', async () => {
        fetchMock.mockResolvedValueOnce(createMockResponse(mockTree));

        const result = await familyTreesService.getById('1');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-tree/1',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual(mockTree);
        expect(result?.createdAt).toBeInstanceOf(Date);
        expect(result?.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('add', () => {
      it('should add new family tree successfully', async () => {
        const newTree = {
          name: 'New Family Tree',
          members: [],
        };

        fetchMock.mockResolvedValueOnce(createMockResponse({ id: 'new-tree-id' }));

        const result = await familyTreesService.add(newTree);

        expect(result).toBe('new-tree-id');
      });
    });

    describe('update', () => {
      it('should update family tree successfully', async () => {
        const updates = { name: 'Updated Tree Name' };
        fetchMock.mockResolvedValueOnce(createMockResponse({}));

        await familyTreesService.update('1', updates);

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-tree/1',
          {
            headers: { 'Content-Type': 'application/json' },
            method: 'PUT',
            body: JSON.stringify(updates),
          },
        );
      });
    });

    describe('delete', () => {
      it('should delete family tree successfully', async () => {
        fetchMock.mockResolvedValueOnce(createMockResponse({}));

        await familyTreesService.delete('1');

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/family-tree/1',
          {
            headers: { 'Content-Type': 'application/json' },
            method: 'DELETE',
          },
        );
      });
    });
  });

  describe('guestMessagesService', () => {
    const mockMessage: GuestMessage = {
      id: '1',
      name: 'John Guest',
      email: 'john@example.com',
      message: 'Congratulations!',
      createdAt: new Date('2023-01-01'),
    };

    describe('getAll', () => {
      it('should fetch all guest messages successfully', async () => {
        const mockResponse = { messages: [mockMessage] };
        fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

        const result = await guestMessagesService.getAll();

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/guest-messages',
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
        expect(result).toEqual([mockMessage]);
        expect(result[0].createdAt).toBeInstanceOf(Date);
      });
    });

    describe('add', () => {
      it('should add new guest message successfully', async () => {
        const newMessage = {
          name: 'Jane Guest',
          email: 'jane@example.com',
          message: 'Best wishes!',
        };

        fetchMock.mockResolvedValueOnce(createMockResponse({ id: 'new-message-id' }));

        const result = await guestMessagesService.add(newMessage);

        expect(result).toBe('new-message-id');
      });

      it('should handle message without email', async () => {
        const newMessage = {
          name: 'Anonymous Guest',
          message: 'Hello!',
        };

        fetchMock.mockResolvedValueOnce(createMockResponse({ id: 'anonymous-id' }));

        const result = await guestMessagesService.add(newMessage);

        expect(result).toBe('anonymous-id');
      });
    });
  });

  describe('imageProcessingService', () => {
    describe('processImage', () => {
      it('should process image successfully', async () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const mockResponse = { processedUrl: 'https://example.com/processed.jpg' };

        fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

        const result = await imageProcessingService.processImage(mockFile);

        expect(fetchMock).toHaveBeenCalledWith(
          'https://wedding-functions-956393407443.us-central1.run.app/process-image',
          {
            method: 'POST',
            body: expect.any(FormData),
          },
        );

        // Check that FormData contains the file
        const formData = (fetchMock.mock.calls[0][1] as { body: FormData }).body as FormData;
        expect(formData.get('image')).toBe(mockFile);

        expect(result).toEqual(mockResponse);
      });

      it('should handle processing errors', async () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        fetchMock.mockResolvedValueOnce(
          createMockErrorResponse(500, 'Internal Server Error', { error: 'Processing failed' }),
        );

        await expect(imageProcessingService.processImage(mockFile)).rejects.toThrow(
          'Image processing failed: 500 Internal Server Error',
        );
      });

      it('should handle different file types', async () => {
        const testCases = [
          { name: 'test.png', type: 'image/png' },
          { name: 'test.gif', type: 'image/gif' },
          { name: 'test.webp', type: 'image/webp' },
        ];

        for (const testCase of testCases) {
          const mockFile = new File(['test'], testCase.name, { type: testCase.type });
          const mockResponse = { processedUrl: 'https://example.com/processed.jpg' };

          fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

          const result = await imageProcessingService.processImage(mockFile);

          expect(result).toEqual(mockResponse);
        }
      });
    });
  });
});
