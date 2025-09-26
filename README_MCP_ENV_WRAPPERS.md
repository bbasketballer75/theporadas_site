## Missing MCP Fetch Server

The MCP Fetch server is referenced in automation configs but the required file (`C:/Users/Austin/Documents/GitHub/servers/src/fetch/index.js`) does not exist. If you need fetch server functionality, ensure the code is present or update configs accordingly.

# Wrapper script for MCP servers requiring environment variables

# Usage: Add a similar script for each MCP server that needs env vars

# Set BRAVE_API_KEY from .env or hardcoded value

$env:BRAVE_API_KEY = 'BSAS9aZVHM-uGNa2Cy4CjzeOvIBEkZi'

# Start Brave Search MCP server

npx -y @modelcontextprotocol/server-brave-search

# To add more servers, repeat the pattern:

# $env:PG_URL = 'postgresql://postgres:password@localhost:5432/mydb'

# npx -y @modelcontextprotocol/server-postgres $env:PG_URL
