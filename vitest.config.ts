import { defineConfig, coverageConfigDefaults } from "vitest/config";

// React/Vite testing configuration: use jsdom for DOM APIs and include setup file for Testing Library

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "build/**",
        "coverage/**",
        "**/*.d.ts",
        "vitest.config.*",
        ...coverageConfigDefaults.exclude,
      ],
      reportsDirectory: "coverage",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
