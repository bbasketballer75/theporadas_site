module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/', '/.next/'],
  // Removed overly-broad mapping that converted any relative .js import to .ts.
  // That rule unintentionally rewrites internal package-relative imports
  // (e.g. react-is's './cjs/react-is.development.js') and breaks resolution.
  // If project-local files need .js -> .ts remapping, prefer per-project
  // mappings or explicitly edit project imports to use .ts/without extension.
  // moduleNameMapper: {
  //   '^(\\.{1,2}\/.*)\\.js$': '$1.ts',
  // },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Run tests serially to avoid parallel module registration issues in large repo
  maxWorkers: 1,
  // Only run the listed subprojects with their own configs. Excludes vitest-based
  // packages (e.g. servers/src/git) from being executed by Jest.
  projects: ['<rootDir>/servers/src/filesystem'],
};
