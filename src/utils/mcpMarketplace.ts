export interface MCPTool {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  capabilities: string[];
  configSchema?: Record<string, unknown>;
  endpoint?: string;
  localPath?: string;
  isEnabled: boolean;
  isBuiltIn: boolean;
}

export interface MCPConfig {
  enabled: boolean;
  serverUrl?: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
}

export class MCPMarketplace {
  private tools: Map<string, MCPTool> = new Map();
  private config: MCPConfig = {
    enabled: true,
    timeout: 30000,
    retryAttempts: 3,
  };

  constructor() {
    this.loadBuiltInTools();
    this.loadCustomTools();
    this.loadConfig();
  }

  // Built-in tools
  private loadBuiltInTools(): void {
    const builtInTools: MCPTool[] = [
      {
        id: 'file-operations',
        name: 'File Operations',
        description: 'Read, write, and manage files in the workspace',
        version: '1.0.0',
        author: 'Kilo Code',
        category: 'File System',
        capabilities: ['read', 'write', 'search', 'list'],
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        id: 'terminal-commands',
        name: 'Terminal Commands',
        description: 'Execute shell commands and scripts',
        version: '1.0.0',
        author: 'Kilo Code',
        category: 'System',
        capabilities: ['execute', 'background', 'interactive'],
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        id: 'web-browser',
        name: 'Web Browser',
        description: 'Control web browser for testing and scraping',
        version: '1.0.0',
        author: 'Kilo Code',
        category: 'Web',
        capabilities: ['navigate', 'scrape', 'test', 'screenshot'],
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        id: 'code-search',
        name: 'Code Search',
        description: 'Search and analyze codebase',
        version: '1.0.0',
        author: 'Kilo Code',
        category: 'Analysis',
        capabilities: ['grep', 'semantic', 'symbols', 'references'],
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        id: 'git-operations',
        name: 'Git Operations',
        description: 'Version control and repository management',
        version: '1.0.0',
        author: 'Kilo Code',
        category: 'Version Control',
        capabilities: ['commit', 'push', 'pull', 'branch', 'merge'],
        isEnabled: true,
        isBuiltIn: true,
      },
      {
        id: 'api-client',
        name: 'API Client',
        description: 'Make HTTP requests and test APIs',
        version: '1.0.0',
        author: 'Kilo Code',
        category: 'API',
        capabilities: ['get', 'post', 'put', 'delete', 'test'],
        isEnabled: true,
        isBuiltIn: true,
      },
    ];
    builtInTools.forEach((tool) => {
      this.tools.set(tool.id, tool);
    });
  }

  // Tool management
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getTool(id: string): MCPTool | undefined {
    return this.tools.get(id);
  }

  getToolsByCategory(category: string): MCPTool[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }

  getEnabledTools(): MCPTool[] {
    return this.getAllTools().filter((tool) => tool.isEnabled);
  }

  enableTool(id: string): boolean {
    const tool = this.tools.get(id);
    if (tool) {
      tool.isEnabled = true;
      this.saveCustomTools();
      return true;
    }
    return false;
  }

  disableTool(id: string): boolean {
    const tool = this.tools.get(id);
    if (tool && !tool.isBuiltIn) {
      tool.isEnabled = false;
      this.saveCustomTools();
      return true;
    }
    return false;
  }

  // Custom tool installation
  async installTool(toolConfig: Omit<MCPTool, 'isEnabled' | 'isBuiltIn'>): Promise<boolean> {
    try {
      // Validate tool configuration
      if (!this.validateToolConfig(toolConfig)) {
        throw new Error('Invalid tool configuration');
      }

      // Check if tool already exists
      if (this.tools.has(toolConfig.id)) {
        throw new Error('Tool already exists');
      }

      const newTool: MCPTool = {
        ...toolConfig,
        isEnabled: true,
        isBuiltIn: false,
      };

      this.tools.set(newTool.id, newTool);
      this.saveCustomTools();

      return true;
    } catch (error) {
      console.error('Failed to install tool:', error);
      return false;
    }
  }

  uninstallTool(id: string): boolean {
    const tool = this.tools.get(id);
    if (tool && !tool.isBuiltIn) {
      this.tools.delete(id);
      this.saveCustomTools();
      return true;
    }
    return false;
  }

  // Tool execution
  async executeTool(toolId: string, params: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(toolId);
    if (!tool || !tool.isEnabled) {
      throw new Error(`Tool ${toolId} not found or disabled`);
    }

    try {
      if (tool.endpoint) {
        // Remote tool execution
        return await this.executeRemoteTool(tool, params);
      } else if (tool.localPath) {
        // Local tool execution
        return await this.executeLocalTool(tool, params);
      } else {
        // Built-in tool execution
        return await this.executeBuiltInTool(tool, params);
      }
    } catch (error) {
      console.error(`Tool execution failed for ${toolId}:`, error);
      throw error;
    }
  }

  private async executeRemoteTool(
    tool: MCPTool,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    console.log('[KILO CODE DEBUG] Executing remote tool:', {
      toolId: tool.id,
      serverUrl: this.config.serverUrl,
      hasApiKey: !!this.config.apiKey,
      params: params,
    });

    if (!this.config.serverUrl) {
      console.error('[KILO CODE DEBUG] MCP server URL not configured');
      throw new Error('MCP server URL not configured');
    }

    const url = `${this.config.serverUrl}/tools/${tool.id}/execute`;
    console.log('[KILO CODE DEBUG] Fetching URL:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(params),
      });

      console.log('[KILO CODE DEBUG] Fetch response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KILO CODE DEBUG] Fetch failed with response:', errorText);
        throw new Error(`Remote tool execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[KILO CODE DEBUG] Fetch successful, result:', result);
      return result;
    } catch (error) {
      console.error('[KILO CODE DEBUG] Fetch error:', error);
      throw error;
    }
  }

  private async executeLocalTool(tool: MCPTool, params: Record<string, unknown>): Promise<unknown> {
    // Implementation for local tool execution would depend on the specific tool
    // This is a placeholder for the actual implementation
    console.log(`Executing local tool ${tool.id} with params:`, params);
    return { success: true, result: 'Local tool executed' };
  }

  private async executeBuiltInTool(tool: MCPTool, params: any): Promise<any> {
    // Route to appropriate built-in tool handler
    switch (tool.id) {
      case 'file-operations':
        return await this.handleFileOperations(params);
      case 'terminal-commands':
        return await this.handleTerminalCommands(params);
      case 'web-browser':
        return await this.handleWebBrowser(params);
      case 'code-search':
        return await this.handleCodeSearch(params);
      case 'git-operations':
        return await this.handleGitOperations(params);
      case 'api-client':
        return await this.handleApiClient(params);
      default:
        throw new Error(`Unknown built-in tool: ${tool.id}`);
    }
  }

  // Built-in tool handlers (placeholders)
  private async handleFileOperations(params: any): Promise<any> {
    console.log('File operations:', params);
    return { success: true, message: 'File operation completed' };
  }

  private async handleTerminalCommands(params: any): Promise<any> {
    console.log('Terminal commands:', params);
    return { success: true, message: 'Terminal command executed' };
  }

  private async handleWebBrowser(params: any): Promise<any> {
    console.log('Web browser:', params);
    return { success: true, message: 'Web browser action completed' };
  }

  private async handleCodeSearch(params: any): Promise<any> {
    console.log('Code search:', params);
    return { success: true, message: 'Code search completed' };
  }

  private async handleGitOperations(params: any): Promise<any> {
    console.log('Git operations:', params);
    return { success: true, message: 'Git operation completed' };
  }

  private async handleApiClient(params: any): Promise<any> {
    console.log('API client:', params);
    return { success: true, message: 'API request completed' };
  }

  // Configuration management
  updateConfig(newConfig: Partial<MCPConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getConfig(): MCPConfig {
    return { ...this.config };
  }

  // Validation
  private validateToolConfig(config: any): boolean {
    return !!(
      config.id &&
      config.name &&
      config.description &&
      config.version &&
      config.author &&
      config.category &&
      config.capabilities &&
      Array.isArray(config.capabilities)
    );
  }

  // Persistence
  private loadCustomTools(): void {
    try {
      const stored = localStorage.getItem('kilo_mcp_tools');
      if (stored) {
        const customTools = JSON.parse(stored);
        Object.values(customTools).forEach((tool: any) => {
          if (!tool.isBuiltIn) {
            this.tools.set(tool.id, tool);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load custom tools:', error);
    }
  }

  private saveCustomTools(): void {
    try {
      const customTools = Object.fromEntries(
        Array.from(this.tools.entries()).filter(([_, tool]) => !tool.isBuiltIn),
      );
      localStorage.setItem('kilo_mcp_tools', JSON.stringify(customTools));
    } catch (error) {
      console.warn('Failed to save custom tools:', error);
    }
  }

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('kilo_mcp_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load MCP config:', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('kilo_mcp_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save MCP config:', error);
    }
  }
}

// Global MCP marketplace instance
export const mcpMarketplace = new MCPMarketplace();
