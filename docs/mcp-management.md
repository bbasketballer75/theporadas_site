# MCP Server Management

This project includes automatic MCP (Model Context Protocol) server management to ensure tools are always available in VS Code Copilot Chat.

## Automatic Startup

MCP servers start automatically when you open the workspace in VS Code. This is configured via `.vscode/tasks.json` with a background task that runs on folder open.

## Manual Control

You can also control MCP servers manually using VS Code tasks or npm scripts:

### VS Code Tasks (Command Palette: "Tasks: Run Task")

- **MCP: Start Supervisor (Background)** - Start MCP servers in background
- **MCP: Start Supervisor (Manual)** - Start MCP servers in foreground (for debugging)

### NPM Scripts

```bash
# Start MCP supervisor (background)
npm run mcp:start

# Start MCP supervisor (background, Unix-style)
npm run mcp:start:bg

# Check MCP server status
npm run mcp:status

# Test MCP servers (quick validation)
npm run mcp:test
```

## Status Checking

Run `npm run mcp:status` to check:

- Whether the MCP supervisor is running
- Individual server availability
- Environment variable loading status

Example output:

```json
{
  "supervisor": {
    "running": true,
    "status": "active",
    "note": "MCP servers should be available"
  },
  "servers": {
    "filesystem": { "available": true },
    "tavily": { "available": true }
  }
}
```

## Available MCP Servers

- **Filesystem Server**: Provides file system operations
- **Tavily Server**: Web search and content extraction capabilities

## Configuration

MCP server configuration is in `.vscode/mcp.json`. Environment variables are loaded from `.env` file.

## Troubleshooting

If MCP tools aren't available in Copilot Chat:

1. Check VS Code MCP settings: `chat.mcp.access: "all"`
2. Run `npm run mcp:status` to verify servers are running
3. Restart VS Code to trigger automatic startup
4. Use `npm run mcp:start` for manual startup

## Development

MCP server scripts are located in `scripts/`:

- `mcp_supervisor.mjs` - Main supervisor script
- `mcp_filesystem.mjs` - Filesystem server
- `mcp_tavily.mjs` - Tavily search server
- `mcp_status.mjs` - Status checking utility
