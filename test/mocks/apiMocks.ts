import { rest } from 'msw';
import type { FamilyMember, FamilyTree, GuestMessage } from '../../src/services/api';

// Mock data
export const mockFamilyMember: FamilyMember = {
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

export const mockFamilyTree: FamilyTree = {
  id: '1',
  name: 'Doe Family Tree',
  members: [mockFamilyMember],
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  updatedAt: new Date('2023-01-01T00:00:00.000Z'),
};

export const mockGuestMessage: GuestMessage = {
  id: '1',
  name: 'John Guest',
  email: 'john@example.com',
  message: 'Congratulations!',
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
};

// API response helpers
export const createSuccessResponse = <T>(data: T) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(data),
});

export const createErrorResponse = (status: number, message: string, data?: unknown) => ({
  ok: false,
  status,
  statusText: getStatusText(status),
  json: () => (data ? Promise.resolve(data) : Promise.reject(new Error(message))),
});

function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return statusTexts[status] || 'Unknown Error';
}

// Mock API handlers
export const createApiHandlers = (baseUrl: string) => [
  // Family Members endpoints
  rest.post(`${baseUrl}/family-member`, async (req, res, ctx) => {
    const body = await req.json();

    // Handle GET all (POST with empty body)
    if (body && Object.keys(body).length === 0) {
      return res(ctx.json({ members: [mockFamilyMember] }));
    }

    // Handle ADD request
    return res(ctx.json({ id: 'new-id' }));
  }),

  rest.get(`${baseUrl}/family-member/:id`, (req, res, ctx) => {
    const { id } = req.params;
    if (id === '1') {
      return res(ctx.json(mockFamilyMember));
    }
    if (id === 'not-found') {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),

  rest.put(`${baseUrl}/family-member/:id`, (req, res, ctx) => {
    return res(ctx.json({}));
  }),

  rest.delete(`${baseUrl}/family-member/:id`, (req, res, ctx) => {
    return res(ctx.json({}));
  }),

  rest.get(`${baseUrl}/family-member`, (req, res, ctx) => {
    const relationship = req.url.searchParams.get('relationship');
    if (relationship === 'Father') {
      return res(ctx.json({ members: [mockFamilyMember] }));
    }
    if (relationship === 'empty') {
      return res(ctx.json({ members: [] }));
    }
    return res(ctx.json({ members: [] }));
  }),

  // Family Trees endpoints
  rest.get(`${baseUrl}/family-tree`, (req, res, ctx) => {
    return res(ctx.json({ trees: [mockFamilyTree] }));
  }),

  rest.get(`${baseUrl}/family-tree/:id`, (req, res, ctx) => {
    const { id } = req.params;
    if (id === '1') {
      return res(ctx.json(mockFamilyTree));
    }
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),

  rest.post(`${baseUrl}/family-tree`, (req, res, ctx) => {
    return res(ctx.json({ id: 'new-tree-id' }));
  }),

  rest.put(`${baseUrl}/family-tree/:id`, (req, res, ctx) => {
    return res(ctx.json({}));
  }),

  rest.delete(`${baseUrl}/family-tree/:id`, (req, res, ctx) => {
    return res(ctx.json({}));
  }),

  // Guest Messages endpoints
  rest.get(`${baseUrl}/guest-messages`, (req, res, ctx) => {
    return res(ctx.json({ messages: [mockGuestMessage] }));
  }),

  rest.post(`${baseUrl}/guest-message`, (req, res, ctx) => {
    return res(ctx.json({ id: 'new-message-id' }));
  }),

  // Image Processing endpoint
  rest.post(`${baseUrl}/process-image`, (req, res, ctx) => {
    return res(ctx.json({ processedUrl: 'https://example.com/processed.jpg' }));
  }),
];

// Error scenario handlers
export const createErrorHandlers = (baseUrl: string) => [
  // Network errors
  rest.post(`${baseUrl}/family-member`, (req, res, ctx) => {
    return res.networkError('Network error');
  }),

  // Timeout simulation
  rest.post(`${baseUrl}/timeout-test`, async (req, res, ctx) => {
    await new Promise(resolve => setTimeout(resolve, 11000)); // Longer than timeout
    return res(ctx.json({}));
  }),

  // Authentication errors
  rest.post(`${baseUrl}/auth-test`, (req, res, ctx) => {
    return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
  }),

  // Authorization errors
  rest.post(`${baseUrl}/forbidden-test`, (req, res, ctx) => {
    return res(ctx.status(403), ctx.json({ error: 'Forbidden' }));
  }),

  // Rate limiting
  rest.post(`${baseUrl}/rate-limit-test`, (req, res, ctx) => {
    return res(ctx.status(429), ctx.json({ error: 'Rate limited' }));
  }),

  // Server errors
  rest.post(`${baseUrl}/server-error-test`, (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),

  // Validation errors
  rest.post(`${baseUrl}/validation-test`, (req, res, ctx) => {
    return res(ctx.status(400), ctx.json({ error: 'Validation failed', details: ['Name is required'] }));
  }),
];

// Utility functions for testing
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const simulateNetworkDelay = (handler: any, delayMs: number = 100) => {
  return async (req: any, res: any, ctx: any) => {
    await delay(delayMs);
    return handler(req, res, ctx);
  };
};