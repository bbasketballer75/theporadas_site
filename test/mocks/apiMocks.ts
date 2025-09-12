import { http, HttpResponse } from 'msw';

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
  http.post(`${baseUrl}/family-member`, async ({ request }) => {
    const body = await request.json().catch(() => ({}));

    // Handle GET all (POST with empty body)
    if (body && Object.keys(body).length === 0) {
      return HttpResponse.json({ members: [mockFamilyMember] });
    }

    // Handle ADD request
    return HttpResponse.json({ id: 'new-id' });
  }),

  http.get(`${baseUrl}/family-member/:id`, ({ params }) => {
    const { id } = params as { id?: string };
    if (id === '1') {
      return HttpResponse.json(mockFamilyMember);
    }
    if (id === 'not-found') {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.put(`${baseUrl}/family-member/:id`, () => {
    return HttpResponse.json({});
  }),

  http.delete(`${baseUrl}/family-member/:id`, () => {
    return HttpResponse.json({});
  }),

  http.get(`${baseUrl}/family-member`, ({ request }) => {
    const url = new URL(request.url);
    const relationship = url.searchParams.get('relationship');
    if (relationship === 'Father') {
      return HttpResponse.json({ members: [mockFamilyMember] });
    }
    if (relationship === 'empty') {
      return HttpResponse.json({ members: [] });
    }
    return HttpResponse.json({ members: [] });
  }),

  // Family Trees endpoints
  http.get(`${baseUrl}/family-tree`, () => {
    return HttpResponse.json({ trees: [mockFamilyTree] });
  }),

  http.get(`${baseUrl}/family-tree/:id`, ({ params }) => {
    const { id } = params as { id?: string };
    if (id === '1') {
      return HttpResponse.json(mockFamilyTree);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post(`${baseUrl}/family-tree`, () => {
    return HttpResponse.json({ id: 'new-tree-id' });
  }),

  http.put(`${baseUrl}/family-tree/:id`, () => {
    return HttpResponse.json({});
  }),

  http.delete(`${baseUrl}/family-tree/:id`, () => {
    return HttpResponse.json({});
  }),

  // Guest Messages endpoints
  http.get(`${baseUrl}/guest-messages`, () => {
    return HttpResponse.json({ messages: [mockGuestMessage] });
  }),

  http.post(`${baseUrl}/guest-message`, () => {
    return HttpResponse.json({ id: 'new-message-id' });
  }),

  // Image Processing endpoint
  http.post(`${baseUrl}/process-image`, () => {
    return HttpResponse.json({ processedUrl: 'https://example.com/processed.jpg' });
  }),
];

// Error scenario handlers
export const createErrorHandlers = (baseUrl: string) => [
  // Network errors
  http.post(`${baseUrl}/family-member`, () => {
    return HttpResponse.error();
  }),

  // Timeout simulation
  http.post(`${baseUrl}/timeout-test`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 11000)); // Longer than timeout
    return HttpResponse.json({});
  }),

  // Authentication errors
  http.post(`${baseUrl}/auth-test`, () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),

  // Authorization errors
  http.post(`${baseUrl}/forbidden-test`, () => {
    return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
  }),

  // Rate limiting
  http.post(`${baseUrl}/rate-limit-test`, () => {
    return HttpResponse.json({ error: 'Rate limited' }, { status: 429 });
  }),

  // Server errors
  http.post(`${baseUrl}/server-error-test`, () => {
    return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),

  // Validation errors
  http.post(`${baseUrl}/validation-test`, () => {
    return HttpResponse.json(
      { error: 'Validation failed', details: ['Name is required'] },
      { status: 400 },
    );
  }),
];

// Utility functions for testing
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const simulateNetworkDelay = <T extends object>(
  handler: (args: T) => Response | Promise<Response>,
  delayMs: number = 100,
) => {
  return async (args: T) => {
    await delay(delayMs);
    return handler(args);
  };
};
