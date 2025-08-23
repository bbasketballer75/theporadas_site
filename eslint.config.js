// Flat ESLint config migrated from legacy .eslintrc.json and .eslintignore
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import vitestPlugin from 'eslint-plugin-vitest';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/*.md',
      '**/*.json',
      '**/*.yml',
      '**/*.yaml',
      '**/*.lock',
      '**/dist/**',
      '**/build/**',
      'coverage/**',
      '**/.vscode/**',
      '**/scripts/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      prettier,
      '@typescript-eslint': tseslint,
      import: importPlugin,
      vitest: vitestPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'] },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      // Modern React (17+) does not require React in scope for JSX
      'react/react-in-jsx-scope': 'off',
      'prettier/prettier': 'warn',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/test/**',
            '**/tests/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/scripts/**',
            '**/.*rc*',
            '**/eslint.config.js',
            '**/vitest.config.*',
            '**/vitest.setup.*',
            '**/vite.config.*',
            '**/types/**',
          ],
          optionalDependencies: false,
          peerDependencies: true,
        },
      ],
      'import/newline-after-import': ['warn', { count: 1 }],
      'import/no-duplicates': 'error',
      'import/no-cycle': ['error', { maxDepth: 5 }],
      'import/no-self-import': 'error',
      'import/first': 'error',
      'import/no-useless-path-segments': ['warn', { noUselessIndex: true }],
    },
  },
  // Vitest test file overrides enabling globals
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}', '**/vitest.setup.*'],
    languageOptions: {
      globals: vitestPlugin.environments?.env?.globals || {},
    },
    rules: {},
  },
];
