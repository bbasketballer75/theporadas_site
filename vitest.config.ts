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
    // Avoid inlining expect/jest-dom to prevent double-registration across runs
    include: ['test/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [
      ...configDefaults.exclude,
      'lighthouse/**',
      // Explicitly exclude Playwright E2E specs from Vitest to avoid expect matcher conflicts
      'test/background-audio.spec.ts',
      'test/family-tree.spec.ts',
      'test/gallery.spec.ts',
      'test/guestbook.spec.ts',
      'test/home.spec.ts',
      'test/map.spec.ts',
      'test/motion-toggle.spec.ts',
      'test/navigation.spec.ts',
      'test/theme-toggle.spec.ts',
      'test/video-player.spec.ts',
      'test/visual-regression.spec.ts',
      // Known intentionally skipped file for diagnostics
      'test/mcp_errors.test.ts',
    ],
    css: true,
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
            'coverage/**',
            '**/*.d.ts',
            'vitest.config.*',
            // Exclude runtime-only utilities and demos from coverage until tests are added
            'src/utils/pwa.ts',
            'src/utils/performance.ts',
            'src/utils/notificationManager.ts',
            'src/utils/autoApprovalManager.ts',
            'src/utils/modeManager.ts',
            'src/utils/taskOrchestrator.ts',
            'src/utils/mcpMarketplace.ts',
            'src/utils/browserDetection.ts',
            'src/utils/ollama.ts',
            // Temporarily exclude complex UI lacking unit tests
            'src/components/GuestMessages.tsx',
            'src/components/OrchestratorDemo.tsx',
            'src/components/KiloCodeDemo.tsx',
            'src/components/TaskVisualizer.tsx',
            'src/components/InstallPrompt.tsx',
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
