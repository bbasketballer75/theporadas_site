# MCP Server Configurations

## Overview

This document outlines the complete MCP server ecosystem configured for the project,
including all 25 servers with their purposes, configurations, and dependencies.

## Server Categories

### AI & Search Services

- **Tavily Search** (`mcp_tavily.mjs`): Web search and content extraction
- **Pieces LTM** (`mcp_pieces.mjs`): Long-term memory and context retrieval
- **Sequential Thinking** (`mcp_sequential.mjs`): Advanced reasoning and problem-solving

### Development Tools

- **GitHub** (`mcp_github.mjs`): Repository management and issue tracking
- **GitHub Issues** (`mcp_github_issues.mjs`): Issue management and workflows
- **GitHub Pull Requests** (`mcp_github_prs.mjs`): PR management and reviews
- **GitHub Workflows** (`mcp_github_workflows.mjs`): CI/CD pipeline management
- **GitHub Notifications** (`mcp_github_notifications.mjs`): Notification handling
- **GitHub Search** (`mcp_github_search.mjs`): Repository and code search
- **GitHub Gist** (`mcp_github_gist.mjs`): Gist management
- **GitHub Code Scanning** (`mcp_github_codescanning.mjs`): Security vulnerability scanning

### Database Services

- **MSSQL** (`mcp_mssql.mjs`): Microsoft SQL Server connectivity
- **Firebase Firestore** (`mcp_firestore.mjs`): NoSQL database operations
- **Firebase Realtime Database** (`mcp_firebase_rtdb.mjs`): Real-time data synchronization
- **Firebase Data Connect** (`mcp_dataconnect.mjs`): Data connection management

### Cloud Services

- **Firebase Authentication** (`mcp_firebase_auth.mjs`): User authentication
- **Firebase Storage** (`mcp_firebase_storage.mjs`): File storage operations
- **Firebase Remote Config** (`mcp_remoteconfig.mjs`): Configuration management
- **Firebase App Hosting** (`mcp_apphosting.mjs`): Application hosting
- **Firebase Crashlytics** (`mcp_crashlytics.mjs`): Crash reporting and analysis
- **Firebase Messaging** (`mcp_messaging.mjs`): Push notification services

### Productivity Tools

- **Notion** (`mcp_notion.mjs`): Document and database management
- **Canva Design** (`mcp_canva_design.mjs`): Graphic design tools
- **Canva Assets** (`mcp_canva_assets.mjs`): Asset management
- **Canva Comments** (`mcp_canva_comments.mjs`): Design collaboration
- **Canva Export** (`mcp_canva_export.mjs`): Design export functionality
- **Canva Info** (`mcp_canva_info.mjs`): Design information retrieval
- **Canva Resize** (`mcp_canva_resize.mjs`): Design resizing
- **Canva Search** (`mcp_canva_search.mjs`): Design search capabilities

### Context & Documentation

- **Context7** (`mcp_context7.mjs`): Library documentation and code examples
- **Vercel** (`mcp_vercel.mjs`): Deployment and hosting management
- **Memory Bank** (`mcp_memory_bank.mjs`): Project memory and decision tracking

## Environment Variables Required

### AI & Search

- `TAVILY_API_KEY`: Tavily search API key
- `PIECES_API_KEY`: Pieces LTM API key
- `PIECES_BASE_URL`: Pieces server URL

### Development Tools

- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_REPO`: Target repository (owner/repo format)

### Database Services

- `MSSQL_CONNECTION_STRING`: SQL Server connection string
- `FIREBASE_PROJECT_ID`: Firebase project identifier
- `FIREBASE_API_KEY`: Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Firebase auth domain

### Cloud Services

- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firebase service account JSON
- `FIREBASE_STORAGE_BUCKET`: Storage bucket name

### Productivity Tools

- `NOTION_API_KEY`: Notion integration token
- `CANVA_API_KEY`: Canva API key
- `CANVA_CLIENT_REDACTED_BY_AUDIT_ISSUE_70`: Canva client secret

### Context & Documentation

- `CONTEXT7_API_KEY`: Context7 API key
- `VERCEL_TOKEN`: Vercel authentication token

## Server Configuration Structure

Each server in `servers.json` follows this structure:

```json
{
  "name": "server-name",
  "cmd": "node",
  "args": ["scripts/mcp_server.mjs"],
  "maxRestarts": 3
}
```

## Docker Configuration

All servers are containerized with:

- Individual service definitions in `docker-compose.yml`
- Health checks for service availability
- Environment variable injection
- Proper dependency management
- Persistent volumes for data storage

## Health Checks and Monitoring

### Health Check Endpoints

- Each service exposes health check endpoints
- Docker health checks verify service responsiveness
- Supervisor monitors server lifecycle and restarts

### Logging

- Centralized logging through supervisor
- Individual server logs for debugging
- Firebase debug logs for troubleshooting

## Deployment Strategy

### Development Environment

- Local Docker Compose setup
- Hot reloading for development
- Environment variable validation via preflight checks

### Production Environment

- Container orchestration
- Load balancing considerations
- Security hardening
- Monitoring and alerting

## Maintenance and Updates

### Regular Tasks

- Environment variable rotation
- API key renewal
- Docker image updates
- Security patches

### Troubleshooting

- Check server logs in `mcp_supervisor.log`
- Verify environment variables
- Test individual services
- Review Docker container status

## Future Enhancements

- Service mesh implementation
- Auto-scaling capabilities
- Advanced monitoring dashboards
- Backup and recovery procedures

## Required Environment Variables

### AI & Search Category

- `TAVILY_API_KEY`: Tavily search API key
- `PIECES_API_KEY`: Pieces LTM API key
- `PIECES_BASE_URL`: Pieces server URL

### Development Tools Category

- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_REPO`: Target repository (owner/repo format)

### Database Services Category

- `MSSQL_CONNECTION_STRING`: SQL Server connection string
- `FIREBASE_PROJECT_ID`: Firebase project identifier
- `FIREBASE_API_KEY`: Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Firebase auth domain

### Cloud Services Category

- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firebase service account JSON
- `FIREBASE_STORAGE_BUCKET`: Storage bucket name

### Productivity Tools Category

- `NOTION_API_KEY`: Notion integration token
- `CANVA_API_KEY`: Canva API key
- `CANVA_CLIENT_REDACTED_BY_AUDIT_ISSUE_70`: Canva client secret

### Context & Documentation Category

- `CONTEXT7_API_KEY`: Context7 API key
- `VERCEL_TOKEN`: Vercel authentication token

### Server Configuration Structure

Each server in `servers.json` follows this structure:

```json
{
  "name": "server-name",
  "cmd": "node",
  "args": ["scripts/mcp_server.mjs"],
  "maxRestarts": 3
}
```

### Docker Configuration

All servers are containerized with:

- Individual service definitions in `docker-compose.yml`
- Health checks for service availability
- Environment variable injection
- Proper dependency management
- Persistent volumes for data storage

## Health Checks and Monitoring

### Health Check Endpoints

- Each service exposes health check endpoints
- Docker health checks verify service responsiveness
- Supervisor monitors server lifecycle and restarts

### Logging

- Centralized logging through supervisor
- Individual server logs for debugging
- Firebase debug logs for troubleshooting

## Deployment Strategy

### Development Environment

- Local Docker Compose setup
- Hot reloading for development
- Environment variable validation via preflight checks

### Production Environment

- Container orchestration
- Load balancing considerations
- Security hardening
- Monitoring and alerting

## Maintenance and Updates

### Regular Tasks

- Environment variable rotation
- API key renewal
- Docker image updates
- Security patches

### Troubleshooting

- Check server logs in `mcp_supervisor.log`
- Verify environment variables
- Test individual services
- Review Docker container status

## Future Enhancements

- Service mesh implementation
- Auto-scaling capabilities
- Advanced monitoring dashboards
- Backup and recovery procedures
