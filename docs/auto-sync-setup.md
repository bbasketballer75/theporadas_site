# Auto-Sync Setup Guide

This guide provides comprehensive instructions for setting up and configuring automatic Git operations and syncing for your repository.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Use Cases](#use-cases)
- [Safety Considerations](#safety-considerations)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Overview

The auto-sync system provides automated Git operations including:

- **Auto-sync**: Automatic commit and push of file changes
- **Scheduled sync**: Time-based synchronization with configurable intervals
- **Watch sync**: File system monitoring with real-time syncing
- **Safety limits**: Configurable constraints to prevent accidental data loss

## Prerequisites

- Node.js 16+ installed
- Git repository initialized
- Remote repository configured (GitHub, GitLab, etc.)
- Proper authentication setup (SSH keys or personal access tokens)

## Quick Start

1. **Copy environment configuration**:

   ```bash
   cp .env.example .env
   ```

2. **Configure basic settings** in `.env`:

   ```bash
   GIT_REMOTE=origin
   GIT_BRANCH=main
   DRY_RUN=true  # Start with dry-run mode
   ```

3. **Test the setup**:

   ```bash
   node scripts/auto-sync.mjs
   ```

4. **Enable live syncing**:
   ```bash
   # Remove DRY_RUN=true from .env
   node scripts/watch-sync.mjs
   ```

## Configuration

### Environment Variables (.env)

Copy `.env.example` to `.env` and customize the following key variables:

#### Basic Git Configuration

```bash
# Git remote and branch
GIT_REMOTE=origin
GIT_BRANCH=main

# Commit message
GIT_COMMIT_MESSAGE=Auto-sync: Update files
```

#### Sync Behavior

```bash
# Safety settings
DRY_RUN=false          # Set to true for testing
FORCE_PUSH=false       # Use with extreme caution
INCLUDE_UNTRACKED=true # Include new files

# File patterns
EXCLUDE_PATTERNS=node_modules,.git,dist,build
```

#### Scheduling

```bash
# Sync every 30 minutes
SYNC_INTERVAL_MINUTES=30

# Business hours only (9 AM - 5 PM)
START_HOUR=9
END_HOUR=17

# Only sync when there are changes
ONLY_IF_CHANGES=true
```

#### Safety Limits

```bash
# Prevent excessive commits
MAX_COMMITS_PER_HOUR=12
MAX_FILE_SIZE_MB=100

# Require approval for large changes
REQUIRE_APPROVAL_FOR_LARGE_CHANGES=true
```

### JSON Configuration (scripts/sync-config.json)

The JSON configuration provides structured settings for complex scenarios:

```json
{
  "environments": {
    "production": {
      "syncIntervalMinutes": 120,
      "dryRun": false,
      "maxCommitsPerHour": 6
    }
  },
  "safetyLimits": {
    "maxFileSizeMB": 100,
    "maxFilesPerCommit": 50
  }
}
```

## Use Cases

### Development Environment

For active development with frequent changes:

```bash
# .env configuration
SYNC_INTERVAL_MINUTES=15
DRY_RUN=false
LOG_LEVEL=DEBUG
MAX_COMMITS_PER_HOUR=20
```

Start with:

```bash
node scripts/watch-sync.mjs
```

### CI/CD Pipeline

For automated deployment pipelines:

```bash
# .env configuration
CI_MODE=true
DRY_RUN=false
FORCE_PUSH=false
LOG_LEVEL=INFO
```

### Production Environment

For production systems with strict safety requirements:

```bash
# .env configuration
SYNC_INTERVAL_MINUTES=240  # 4 hours
DRY_RUN=false
REQUIRE_APPROVAL_FOR_LARGE_CHANGES=true
MAX_COMMITS_PER_HOUR=6
LOG_LEVEL=WARN
```

## Safety Considerations

### Always start with dry-run mode:

```bash
DRY_RUN=true
```

### Configure appropriate safety limits:

- Set reasonable `MAX_COMMITS_PER_HOUR`
- Use `REQUIRE_APPROVAL_FOR_LARGE_CHANGES`
- Configure `EXCLUDE_PATTERNS` to avoid sensitive files

### Backup strategy:

The system automatically creates backups in the `backups/` directory. Ensure this directory is:

- Included in version control (for tracking)
- Regularly cleaned up
- Securely stored

### Authentication:

- Use SSH keys for Git operations
- Store tokens securely (not in version control)
- Rotate credentials regularly

## Troubleshooting

### Common Issues

#### "Not a Git repository" error

```bash
# Ensure you're in the correct directory
pwd
git status
```

#### "No remote configured" error

```bash
# Check remote configuration
git remote -v
git remote add origin <repository-url>
```

#### Permission denied errors

```bash
# Check SSH key configuration
ssh -T git@github.com

# Or configure personal access token
git config --global credential.helper store
```

#### Sync not triggering

```bash
# Check file watcher
ps aux | grep watch-sync

# Verify file patterns
echo "test.js" | grep -E "your-pattern"
```

### Logs and Debugging

Enable verbose logging:

```bash
LOG_LEVEL=DEBUG
```

Check logs:

```bash
tail -f logs/auto-sync.log
```

### Recovery Procedures

1. **Stop all sync processes**:

   ```bash
   pkill -f "auto-sync\|watch-sync\|scheduled-sync"
   ```

2. **Reset to safe state**:

   ```bash
   git reset --hard HEAD~10  # Go back 10 commits
   git push --force-with-lease
   ```

3. **Restore from backup**:
   ```bash
   ls backups/
   git checkout <backup-branch>
   ```

## Advanced Configuration

### Custom Commit Messages

Use templates in `scripts/sync-config.json`:

```json
{
  "commitTemplates": {
    "feature": "Auto-sync: Feature updates - {count} files",
    "large": "Auto-sync: Large update ({size}MB) - {count} files"
  }
}
```

### Notifications

Configure email notifications:

```json
{
  "notifications": {
    "email": {
      "enabled": true,
      "recipients": ["team@example.com"],
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "auth": {
          "user": "your-email@gmail.com",
          "pass": "your-app-password"
        }
      }
    }
  }
}
```

### Integration with CI/CD

For GitHub Actions:

```yaml
name: Auto Sync
on:
  push:
    branches: [main]
  schedule:
    - cron: '*/30 * * * *' # Every 30 minutes

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run Auto Sync
        run: node scripts/auto-sync.mjs
        env:
          CI_MODE: true
          DRY_RUN: false
```

### Custom Hooks

Add custom scripts to run before/after sync:

```json
{
  "hooks": {
    "preSync": ["npm run lint", "npm run test"],
    "postSync": ["npm run deploy"],
    "onError": ["scripts/notify-error.sh"]
  }
}
```

## Monitoring and Maintenance

### Health Checks

Monitor sync health:

```bash
# Check recent commits
git log --oneline -10

# Verify sync is running
ps aux | grep sync

# Check disk usage
du -sh backups/ logs/
```

### Regular Maintenance

1. **Clean old backups**:

   ```bash
   find backups/ -name "*.tar.gz" -mtime +30 -delete
   ```

2. **Rotate logs**:

   ```bash
   # Logs are automatically rotated based on sync-config.json settings
   ls -la logs/
   ```

3. **Update dependencies**:
   ```bash
   npm audit
   npm update
   ```

## Security Best Practices

- Never commit `.env` files containing real credentials
- Use environment-specific configuration files
- Rotate authentication tokens regularly
- Monitor for unusual sync patterns
- Implement approval workflows for production changes

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review logs in `logs/auto-sync.log`
3. Test with `DRY_RUN=true` first
4. Check GitHub issues for similar problems

## Changelog

### v1.0.0

- Initial release with basic auto-sync functionality
- Support for scheduled and watch-based syncing
- Safety limits and approval workflows
- Comprehensive logging and monitoring
