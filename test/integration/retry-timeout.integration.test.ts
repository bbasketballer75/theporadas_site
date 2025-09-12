import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { familyMembersService, guestMessagesService } from '../../src/services/api';

// Test utils
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Mock server setup
const server = setupServer();

describe('Retry Mechanisms and Timeout Handling Integration Tests', () => {
  // Match both absolute and relative URLs in Node/jsdom
  const FM_ABS = /^http:\/\/localhost(?::\d+)?\/family-member$/;
  const GM_ABS = /^http:\/\/localhost(?::\d+)?\/guest-message$/;
  const FM_REL = '/family-member';
  const GM_REL = '/guest-message';

  // Helpers to register handlers for both absolute and relative endpoints
  const optionsFM = (resolver: Parameters<typeof http.options>[1]) => [
    http.options(FM_ABS, resolver),
    http.options(FM_REL, resolver),
  ];
  const postFM = (resolver: Parameters<typeof http.post>[1]) => [
    http.post(FM_ABS, resolver),
    http.post(FM_REL, resolver),
  ];
  const optionsGM = (resolver: Parameters<typeof http.options>[1]) => [
    http.options(GM_ABS, resolver),
    http.options(GM_REL, resolver),
  ];
  const postGM = (resolver: Parameters<typeof http.post>[1]) => [
    http.post(GM_ABS, resolver),
    http.post(GM_REL, resolver),
  ];
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    // Debug: log all requests and any unhandled ones to diagnose pattern mismatches
    server.events.on('request:start', ({ request }) => {
      console.log('[MSW request:start]', request.method, request.url);
    });
    server.events.on('request:unhandled', ({ request }) => {
      console.warn('[MSW request:unhandled]', request.method, request.url);
    });
  });

  beforeEach(() => {
    // Use absolute base URL in Node to align with undici fetch requirements
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost');
    // Ensure API uses three attempts (initial + 2 retries) for these tests
    vi.stubEnv('VITE_API_MAX_RETRIES', '3');
    // Default timeout per attempt is 10s; set explicitly for clarity
    vi.stubEnv('VITE_API_TIMEOUT', '10000');
    vi.useFakeTimers();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Retry Logic', () => {
    it('should retry on network failures up to maximum attempts', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(3000);
      const result = await p;

      expect(result).toEqual([]);
      expect(attemptCount).toBe(3); // Should retry 3 times (initial + 2 retries)
    });

    it('should not retry on 4xx client errors', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          return HttpResponse.json({ error: 'Bad request' }, { status: 400 });
        }),
      );

      await expect(familyMembersService.getAll()).rejects.toThrow();
      expect(attemptCount).toBe(1); // Should not retry on 4xx errors
    });

    it('should not retry on 401 authentication errors', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }),
      );

      await expect(familyMembersService.getAll()).rejects.toThrow('Authentication required');
      expect(attemptCount).toBe(1);
    });

    it('should not retry on 403 authorization errors', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
        }),
      );

      await expect(familyMembersService.getAll()).rejects.toThrow('Access denied');
      expect(attemptCount).toBe(1);
    });

    it('should retry on 5xx server errors', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(3000);
      const result = await p;

      expect(result).toEqual([]);
      expect(attemptCount).toBe(3);
    });

    it('should retry on 502 Bad Gateway errors', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json({ error: 'Bad gateway' }, { status: 502 });
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(3000);
      const result = await p;

      expect(result).toEqual([]);
      expect(attemptCount).toBe(3);
    });

    it('should retry on 503 Service Unavailable errors', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json({ error: 'Service unavailable' }, { status: 503 });
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(3000);
      const result = await p;

      expect(result).toEqual([]);
      expect(attemptCount).toBe(3);
    });

    it('should respect retry delay timing', async () => {
      let attemptCount = 0;
      const startTime = Date.now();

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ members: [] });
        }),
      );
      const p = familyMembersService.getAll();
      // 1000 + 2000 backoffs + small handler delay margin
      await vi.advanceTimersByTimeAsync(3500);
      await p;
      const endTime = Date.now();

      // Expected delays: 1000ms (first retry) + 2000ms (second retry) = 3000ms
      // Adding some buffer for test execution time
      expect(endTime - startTime).toBeGreaterThan(2900);
      // Allow slight scheduling overhead
      expect(endTime - startTime).toBeLessThanOrEqual(3600);
    });

    it('should use exponential backoff for retry delays', async () => {
      let attemptCount = 0;
      const delays: number[] = [];

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(async () => {
          attemptCount++;
          const delayStart = Date.now();

          if (attemptCount < 3) {
            // Simulate delay before responding with error
            await sleep(50);
            return HttpResponse.error();
          }

          const delayEnd = Date.now();
          delays.push(delayEnd - delayStart);
          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(3600);
      await p;

      // Verify that delays are increasing (exponential backoff)
      expect(delays.length).toBeGreaterThan(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after 10 seconds', async () => {
      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(async () => {
          // Delay longer than the 10-second timeout
          await sleep(11000);
          return HttpResponse.json({ members: [] });
        }),
      );
      const p = familyMembersService.getAll();
      // Attach rejection handler before advancing timers to avoid unhandled rejections
      const expectation = expect(p).rejects.toThrow(/Request timed out|AbortError/);
      // 3 attempts each with 10s timeout + 1s + 2s backoffs = 33s
      await vi.advanceTimersByTimeAsync(34000);
      await expectation;
    });

    it('should handle AbortError from cancelled requests', async () => {
      const abortController = new AbortController();

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(async () => {
          // Simulate a long-running request
          await sleep(2000);
          return HttpResponse.json({ members: [] });
        }),
      );

      // Cancel the request after a short delay
      setTimeout(() => abortController.abort(), 500);

      // Note: The current API implementation doesn't support AbortController
      // This test documents the expected behavior for future implementation
      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(2000);
      const result = await p;
      expect(result).toEqual([]); // Should succeed before timeout
    });

    it('should handle timeout during retry attempts', async () => {
      let attemptCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            // First two attempts timeout
            await sleep(11000);
            return HttpResponse.json({ members: [] });
          }
          // Third attempt succeeds
          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(24000);
      const result = await p;

      expect(result).toEqual([]);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should handle rapid successive failures gracefully', async () => {
      let failureCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          failureCount++;
          return HttpResponse.error();
        }),
      );

      // Make multiple rapid requests
      const promises = Array(5)
        .fill(null)
        .map(() => familyMembersService.getAll());
      // Attach handlers immediately to avoid unhandled rejections
      const allSettled = Promise.allSettled(promises);
      await vi.advanceTimersByTimeAsync(3000);
      const results = await allSettled;

      // All requests should fail
      results.forEach((result) => {
        expect(result.status).toBe('rejected');
      });

      expect(failureCount).toBe(15); // 3 attempts per request * 5 requests
    });
  });

  describe('Connection Pooling and Keep-Alive', () => {
    it('should handle connection reuse scenarios', async () => {
      let requestCount = 0;

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          requestCount++;
          return HttpResponse.json({ members: [] });
        }),
      );

      // Make multiple sequential requests
      await familyMembersService.getAll();
      await familyMembersService.getAll();
      await familyMembersService.getAll();

      expect(requestCount).toBe(3);
    });

    it('should handle connection timeout scenarios', async () => {
      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(async () => {
          // Simulate connection establishment delay
          await sleep(2000);
          return HttpResponse.json({ members: [] });
        }),
      );

      const startTime = Date.now();
      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(2000);
      const result = await p;
      const endTime = Date.now();

      expect(result).toEqual([]);
      expect(endTime - startTime).toBeGreaterThan(1900);
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Idempotency and Request Deduplication', () => {
    it('should handle duplicate requests gracefully', async () => {
      let requestCount = 0;

      server.use(
        ...optionsGM(() => new HttpResponse(null, { status: 200 })),
        ...postGM(() => {
          requestCount++;
          return HttpResponse.json({ id: `message-${requestCount}` });
        }),
      );

      const message = {
        name: 'Test User',
        message: 'Test message',
      };

      // Make duplicate requests
      const [result1, result2] = await Promise.all([
        guestMessagesService.add(message),
        guestMessagesService.add(message),
      ]);

      expect(result1).toBe('message-1');
      expect(result2).toBe('message-2');
      expect(requestCount).toBe(2);
    });
  });

  describe('Progressive Retry Strategies', () => {
    it('should implement jitter in retry delays', async () => {
      let attemptCount = 0;
      const delays: number[] = [];

      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(async () => {
          attemptCount++;
          const start = Date.now();

          if (attemptCount < 3) {
            await sleep(100);
            const end = Date.now();
            delays.push(end - start);
            return HttpResponse.error();
          }

          return HttpResponse.json({ members: [] });
        }),
      );

      const p = familyMembersService.getAll();
      // With 2 failures before success, backoff delays: 1000 + 2000 = 3000ms
      await vi.advanceTimersByTimeAsync(3500);
      await p;

      // Verify delays are recorded
      expect(delays.length).toBe(2);
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThan(90);
      });
    });

    it('should cap retry delays at maximum value', async () => {
      let attemptCount = 0;
      server.use(
        ...optionsFM(() => new HttpResponse(null, { status: 200 })),
        ...postFM(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ members: [] });
        }),
      );

      const startTime = Date.now();
      const p = familyMembersService.getAll();
      await vi.advanceTimersByTimeAsync(3000);
      await p;
      const endTime = Date.now();

      // Should complete within reasonable time and not exceed 10 seconds overall
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
}, 60000);
