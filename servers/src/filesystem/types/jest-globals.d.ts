// Temporary ambient declaration to satisfy TypeScript in test files that import '@jest/globals'.
// This re-exports the commonly used testing helpers as `any` to avoid adding
// a strict dependency on the module's internal type names. We rely on
// @types/jest to provide improved types in development; this file just fixes
// module-not-found errors in environments where TS can't resolve '@jest/globals'.

declare module '@jest/globals' {
  export const describe: any;
  export const it: any;
  export const expect: any;
  export const beforeEach: any;
  export const afterEach: any;
  export const jest: any;
}
