module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Allow chore(scope): message etc., and feats/fixes; keep concise scope length.
  rules: {
    'scope-case': [2, 'always', ['lower-case', 'kebab-case']],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // Enforce shorter headers to reduce friction vs earlier failures (<= 100 chars)
    'header-max-length': [2, 'always', 100],
    // Explicitly mirror default conventional config but we document here
    'body-max-line-length': [2, 'always', 100],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
  },
};
