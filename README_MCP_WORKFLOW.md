## MCP Server Workflow: Starter Guide & Troubleshooting

### 1. MCP Server Starter Config

Your workspace is set up with the most useful MCP servers:

- **filesystem**: File and directory access
- **memory**: Persistent knowledge graph memory
- **sequentialthinking**: Problem solving and chain-of-thought
- **git**: Git operations and automation
- **playwright**: Browser automation and web scraping

Config file: `.vscode/mcp.json`

### 2. One-Click Server Management

Use VS Code tasks for easy start/stop of servers:
- Open the Command Palette (`Ctrl+Shift+P`)
- Run `Tasks: Run Task`
- Select any "Start MCP ... Server" task
- Or run "Start All MCP Servers" to launch everything in parallel

### 3. Troubleshooting

- If a server fails to start, check the integrated terminal for errors
- For path or permission issues, try running the task in the external terminal
- Ensure all required environment variables are set in `.env`
- For package errors, run `npm install` in the relevant server directory
- For config issues, check `.vscode/mcp.json` for correct command and args

### 4. Onboarding

1. Clone the repo and open in VS Code
2. Review `.vscode/mcp.json` for available servers
3. Use VS Code tasks to start/stop servers
4. Edit `.env` for secrets and API keys
5. Use the MCP server list in VS Code to connect and interact

### 5. Updating & Customizing

- To add a new server, edit `.vscode/mcp.json` and add a new block
- To remove a server, delete its block from the config
- To update a server, change its command/args in the config

---
For more help, see the official MCP documentation or ask GitHub Copilot for troubleshooting tips!
