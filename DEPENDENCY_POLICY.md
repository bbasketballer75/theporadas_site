# Dependency Update Policy

This document outlines the policy for managing and updating dependencies in the theporadas-site project.

## Update Strategy

### Automated Updates

- **Minor and patch updates**: Automatically updated via Dependabot daily
- **Major updates**: Manually reviewed and updated via npm-check-updates workflow weekly
- **GitHub Actions**: Updated weekly via Dependabot

### Manual Updates

- Major version updates require manual review
- Breaking changes must be tested thoroughly
- Security vulnerabilities are prioritized for immediate update

## Update Process

### Automated Process

1. Dependabot creates PR for minor/patch updates
2. CI runs tests and linting
3. Auto-merge if all checks pass
4. Manual review for major updates

### Manual Process

1. Run `npm run deps:check` to see available updates
2. Review changelog and breaking changes
3. Run `npm run deps:update:minor` or `npm run deps:update:major`
4. Run full test suite: `npm run verify`
5. Commit and create PR

## Risk Mitigation

### Testing Requirements

- All updates must pass: `npm run test`
- Linting must pass: `npm run lint`
- Type checking must pass: `npm run typecheck`
- Build must succeed: `npm run build`

### Rollback Plan

- Keep backup of package-lock.json before updates
- Use git to revert changes if needed
- Monitor application health after deployment

## Excluded Dependencies

### Never Update Automatically

- React and React DOM (major version changes only)
- TypeScript (major version changes only)
- ESLint and related plugins (configuration changes required)

### High Risk Dependencies

- Database drivers (mssql)
- Authentication libraries (@sentry/react)
- Build tools (Vite)

## Monitoring

### Alerts

- Failed dependency updates trigger notifications
- Security vulnerabilities are monitored via Dependabot
- Weekly reports generated for outdated dependencies

### Review Process

- All major updates require code review
- Security updates can be auto-merged after CI passes
- Breaking changes require additional testing

## Tools Used

- **Dependabot**: Automated dependency updates
- **npm-check-updates**: Manual dependency checking and updating
- **GitHub Actions**: Automated testing and PR creation
- **npm audit**: Security vulnerability scanning

## Contact

For questions about dependency updates, contact the development team.
