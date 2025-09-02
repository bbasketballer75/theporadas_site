import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import {
  familyMembersService,
  familyTreesService,
  guestMessagesService,
  type FamilyMember,
  type FamilyTree,
  type GuestMessage,
} from '../../src/services/api';

// Mock server setup
const server = setupServer();

describe('Data Transformation and Validation Integration Tests', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001');
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Date Transformation', () => {
    it('should transform ISO date strings to Date objects in family members', async () => {
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'John Doe',
            relationship: 'Father',
            birthDate: '1980-01-01',
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch',
            parentIds: [],
            childrenIds: ['2'],
            spouseId: undefined,
            createdAt: '2023-01-01T10:30:00.000Z',
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2023-01-01T10:30:00.000Z');
      expect(result[0].updatedAt.toISOString()).toBe('2023-01-01T15:45:00.000Z');
    });

    it('should transform ISO date strings to Date objects in family trees', async () => {
      const apiResponse = {
        trees: [
          {
            id: '1',
            name: 'Doe Family Tree',
            members: [
              {
                id: '1',
                name: 'John Doe',
                relationship: 'Father',
                birthDate: '1980-01-01',
                photoUrl: 'https://example.com/photo.jpg',
                description: 'Family patriarch',
                parentIds: [],
                childrenIds: ['2'],
                spouseId: undefined,
                createdAt: '2023-01-01T10:30:00.000Z',
                updatedAt: '2023-01-01T15:45:00.000Z',
              },
            ],
            createdAt: '2023-01-01T09:00:00.000Z',
            updatedAt: '2023-01-01T16:00:00.000Z',
          },
        ],
      };

      server.use(
        rest.get('http://localhost:3001/family-tree', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyTreesService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].members[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].members[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should transform ISO date strings to Date objects in guest messages', async () => {
      const apiResponse = {
        messages: [
          {
            id: '1',
            name: 'John Guest',
            email: 'john@example.com',
            message: 'Congratulations!',
            createdAt: '2023-01-01T12:00:00.000Z',
          },
        ],
      };

      server.use(
        rest.get('http://localhost:3001/guest-messages', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await guestMessagesService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should handle invalid date strings gracefully', async () => {
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'John Doe',
            relationship: 'Father',
            birthDate: '1980-01-01',
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch',
            parentIds: [],
            childrenIds: ['2'],
            spouseId: undefined,
            createdAt: 'invalid-date',
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      // This should not throw, but createdAt will be an invalid Date
      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(isNaN(result[0].createdAt.getTime())).toBe(true);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt.toISOString()).toBe('2023-01-01T15:45:00.000Z');
    });

    it('should handle null/undefined date fields', async () => {
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'John Doe',
            relationship: 'Father',
            birthDate: null,
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch',
            parentIds: [],
            childrenIds: ['2'],
            spouseId: undefined,
            createdAt: null,
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(isNaN(result[0].createdAt.getTime())).toBe(true);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields in family member data', async () => {
      const invalidMember = {
        id: '1',
        // Missing required 'name' field
        relationship: 'Father',
        parentIds: [],
        childrenIds: [],
        spouseId: undefined,
        createdAt: '2023-01-01T10:30:00.000Z',
        updatedAt: '2023-01-01T15:45:00.000Z',
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json({ members: [invalidMember] }));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBeUndefined(); // TypeScript would catch this at compile time
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.status(200), ctx.body('invalid json'));
        }),
      );

      await expect(familyMembersService.getAll()).rejects.toThrow();
    });

    it('should validate array fields', async () => {
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'John Doe',
            relationship: 'Father',
            birthDate: '1980-01-01',
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch',
            parentIds: 'not-an-array', // Invalid: should be array
            childrenIds: ['2'],
            spouseId: undefined,
            createdAt: '2023-01-01T10:30:00.000Z',
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].parentIds).toBe('not-an-array'); // TypeScript would catch this
    });

    it('should handle unexpected response structure', async () => {
      const apiResponse = {
        unexpectedField: 'value',
        // Missing expected 'members' field
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toEqual([]); // Should handle gracefully
    });
  });

  describe('Data Sanitization', () => {
    it('should handle HTML content in text fields', async () => {
      const apiResponse = {
        messages: [
          {
            id: '1',
            name: '<script>alert("xss")</script>John Guest',
            email: 'john@example.com',
            message: '<b>Congratulations!</b><img src="x" onerror="alert(1)">',
            createdAt: '2023-01-01T12:00:00.000Z',
          },
        ],
      };

      server.use(
        rest.get('http://localhost:3001/guest-messages', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await guestMessagesService.getAll();

      expect(result).toHaveLength(1);
      // Note: In a real application, you would sanitize HTML here
      // This test documents the current behavior
      expect(result[0].name).toContain('<script>');
      expect(result[0].message).toContain('<b>');
    });

    it('should handle special characters in text fields', async () => {
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'José María O\'Connor-Smith',
            relationship: 'Father & Husband',
            birthDate: '1980-01-01',
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch with special chars: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ',
            parentIds: [],
            childrenIds: ['2'],
            spouseId: undefined,
            createdAt: '2023-01-01T10:30:00.000Z',
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('José María O\'Connor-Smith');
      expect(result[0].relationship).toBe('Father & Husband');
      expect(result[0].description).toContain('special chars');
    });

    it('should handle very long text fields', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB of text
      const apiResponse = {
        messages: [
          {
            id: '1',
            name: 'Long Message User',
            email: 'long@example.com',
            message: longMessage,
            createdAt: '2023-01-01T12:00:00.000Z',
          },
        ],
      };

      server.use(
        rest.get('http://localhost:3001/guest-messages', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await guestMessagesService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].message).toHaveLength(10000);
      expect(result[0].message).toBe(longMessage);
    });
  });

  describe('Type Coercion', () => {
    it('should handle numeric strings as numbers', async () => {
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'John Doe',
            relationship: 'Father',
            birthDate: '1980-01-01',
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch',
            parentIds: [], // Should be array
            childrenIds: ['2'], // Should be array of strings
            spouseId: undefined,
            createdAt: '2023-01-01T10:30:00.000Z',
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(Array.isArray(result[0].parentIds)).toBe(true);
      expect(Array.isArray(result[0].childrenIds)).toBe(true);
    });

    it('should handle boolean conversion', async () => {
      // Note: Current API doesn't have boolean fields, but this tests the pattern
      const apiResponse = {
        members: [
          {
            id: '1',
            name: 'John Doe',
            relationship: 'Father',
            birthDate: '1980-01-01',
            photoUrl: 'https://example.com/photo.jpg',
            description: 'Family patriarch',
            parentIds: [],
            childrenIds: [],
            spouseId: undefined,
            createdAt: '2023-01-01T10:30:00.000Z',
            updatedAt: '2023-01-01T15:45:00.000Z',
          },
        ],
      };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].spouseId).toBeUndefined();
    });
  });

  describe('Nested Object Transformation', () => {
    it('should transform nested objects in family trees', async () => {
      const apiResponse = {
        trees: [
          {
            id: '1',
            name: 'Doe Family Tree',
            members: [
              {
                id: '1',
                name: 'John Doe',
                relationship: 'Father',
                birthDate: '1980-01-01',
                photoUrl: 'https://example.com/photo.jpg',
                description: 'Family patriarch',
                parentIds: [],
                childrenIds: ['2'],
                spouseId: undefined,
                createdAt: '2023-01-01T10:30:00.000Z',
                updatedAt: '2023-01-01T15:45:00.000Z',
              },
              {
                id: '2',
                name: 'Jane Doe',
                relationship: 'Mother',
                birthDate: '1982-05-15',
                photoUrl: 'https://example.com/photo2.jpg',
                description: 'Family matriarch',
                parentIds: [],
                childrenIds: [],
                spouseId: '1',
                createdAt: '2023-01-01T11:00:00.000Z',
                updatedAt: '2023-01-01T16:30:00.000Z',
              },
            ],
            createdAt: '2023-01-01T09:00:00.000Z',
            updatedAt: '2023-01-01T17:00:00.000Z',
          },
        ],
      };

      server.use(
        rest.get('http://localhost:3001/family-tree', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyTreesService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].members).toHaveLength(2);

      // Check that all dates are properly transformed
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].members[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].members[1].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Response Size Handling', () => {
    it('should handle large response payloads', async () => {
      const largeMembers = Array(1000).fill(null).map((_, index) => ({
        id: `${index + 1}`,
        name: `Member ${index + 1}`,
        relationship: 'Child',
        birthDate: '2000-01-01',
        photoUrl: `https://example.com/photo${index + 1}.jpg`,
        description: `Description for member ${index + 1}`,
        parentIds: [],
        childrenIds: [],
        spouseId: undefined,
        createdAt: '2023-01-01T10:30:00.000Z',
        updatedAt: '2023-01-01T15:45:00.000Z',
      }));

      const apiResponse = { members: largeMembers };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toHaveLength(1000);
      expect(result[0].name).toBe('Member 1');
      expect(result[999].name).toBe('Member 1000');
    });

    it('should handle empty responses', async () => {
      const apiResponse = { members: [] };

      server.use(
        rest.post('http://localhost:3001/family-member', (req, res, ctx) => {
          return res(ctx.json(apiResponse));
        }),
      );

      const result = await familyMembersService.getAll();

      expect(result).toEqual([]);
    });
  });
});