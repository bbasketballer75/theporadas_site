module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Allow chore(scope): message etc., and feats/fixes; keep concise scope length.
  rules: {
    'scope-case': [2, 'always', ['lower-case', 'kebab-case']],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
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
        'test'
      ]
    ]
  }
};
