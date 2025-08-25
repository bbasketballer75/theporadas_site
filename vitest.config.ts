import { defineConfig, coverageConfigDefaults, configDefaults } from 'vitest/config';

// React/Vite testing configuration: use jsdom for DOM APIs and include setup file for Testing Library

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [...configDefaults.exclude, 'lighthouse/**'],
    coverage: {
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
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 85,
      },
    },
  },
});
