import { configDefaults, coverageConfigDefaults, defineConfig } from 'vitest/config';

// React/Vite testing configuration: use jsdom for DOM APIs and include setup file for Testing Library

// Use globalThis.process to avoid relying on NodeJS type in config lint
const light =
  globalThis.process &&
  (globalThis.process.env.VITEST_COVERAGE_LIGHT === '1' ||
    (globalThis.process.argv || []).some((a) => a.includes('refresh_path.test')));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [...configDefaults.exclude, 'lighthouse/**', 'test/mcp_errors.test.ts'],
    coverage: light
      ? {
          provider: 'v8',
          enabled: true,
          include: [],
          exclude: [],
          reporter: ['text'],
          thresholds: { lines: 0, functions: 0, statements: 0, branches: 0 },
        }
      : {
          provider: 'v8',
          enabled: true,
          // Only instrument application source files for coverage; avoid third-party vendored code (e.g. lighthouse)
          include: ['src/**/*.{ts,tsx,js,jsx}'],
          exclude: [
            'node_modules/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '**/*.d.ts',
            'vitest.config.*',
            'lighthouse/**',
            ...coverageConfigDefaults.exclude,
          ],
          reportsDirectory: 'coverage',
          reporter: ['text', 'json-summary', 'html'],
          thresholds: {
            lines: 69,
            functions: 75,
            statements: 69,
            branches: 80,
          },
        },
  },
});
