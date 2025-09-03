export interface AutoApprovalRule {
  id: string;
  name: string;
  description: string;
  actionType: string;
  conditions: ApprovalCondition[];
  isEnabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
  lastUsed?: Date;
}

export interface ApprovalCondition {
  type: 'file_pattern' | 'command_pattern' | 'size_limit' | 'content_check' | 'user_trust';
  operator: 'equals' | 'contains' | 'matches' | 'less_than' | 'greater_than';
  value: string | number;
  caseSensitive?: boolean;
}

export interface AutoApprovalConfig {
  enabled: boolean;
  defaultRiskThreshold: 'low' | 'medium' | 'high';
  requireConfirmationForHighRisk: boolean;
  logAllActions: boolean;
  maxAutoActionsPerMinute: number;
  trustedDomains: string[];
  trustedCommands: string[];
}

export class AutoApprovalManager {
  private rules: Map<string, AutoApprovalRule> = new Map();
  private config: AutoApprovalConfig = {
    enabled: true,
    defaultRiskThreshold: 'medium',
    requireConfirmationForHighRisk: true,
    logAllActions: true,
    maxAutoActionsPerMinute: 10,
    trustedDomains: ['github.com', 'npmjs.com', 'pypi.org'],
    trustedCommands: ['npm install', 'pip install', 'git clone', 'git pull'],
  };

  private actionCount = 0;
  private lastResetTime = Date.now();
  private actionLog: any[] = [];

  constructor() {
    this.loadRules();
    this.loadConfig();
  }

  // Rule management
  addRule(rule: Omit<AutoApprovalRule, 'id' | 'createdAt'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AutoApprovalRule = {
      ...rule,
      id,
      createdAt: new Date(),
    };

    this.rules.set(id, newRule);
    this.saveRules();
    return id;
  }

  updateRule(id: string, updates: Partial<AutoApprovalRule>): boolean {
    const rule = this.rules.get(id);
    if (rule) {
      this.rules.set(id, { ...rule, ...updates });
      this.saveRules();
      return true;
    }
    return false;
  }

  removeRule(id: string): boolean {
    if (this.rules.delete(id)) {
      this.saveRules();
      return true;
    }
    return false;
  }

  getRule(id: string): AutoApprovalRule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): AutoApprovalRule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): AutoApprovalRule[] {
    return this.getAllRules().filter((rule) => rule.isEnabled);
  }

  enableRule(id: string): boolean {
    return this.updateRule(id, { isEnabled: true });
  }

  disableRule(id: string): boolean {
    return this.updateRule(id, { isEnabled: false });
  }

  // Auto-approval decision making
  shouldAutoApprove(action: { type: string; params: any; context?: any }): {
    approved: boolean;
    reason: string;
    ruleId?: string;
    requiresConfirmation?: boolean;
  } {
    if (!this.config.enabled) {
      return {
        approved: false,
        reason: 'Auto-approval is disabled',
      };
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      return {
        approved: false,
        reason: 'Rate limit exceeded',
      };
    }

    // Check against rules
    const enabledRules = this.getEnabledRules();
    for (const rule of enabledRules) {
      if (this.matchesRule(action, rule)) {
        const riskLevel = this.assessRiskLevel(action, rule);

        if (riskLevel === 'high' && this.config.requireConfirmationForHighRisk) {
          return {
            approved: false,
            reason: `High-risk action requires confirmation (Rule: ${rule.name})`,
            ruleId: rule.id,
            requiresConfirmation: true,
          };
        }

        this.logAction(action, rule, true);
        return {
          approved: true,
          reason: `Auto-approved by rule: ${rule.name}`,
          ruleId: rule.id,
        };
      }
    }

    // Check default risk threshold
    const defaultRisk = this.assessDefaultRisk(action);
    if (defaultRisk <= this.getRiskThreshold(this.config.defaultRiskThreshold)) {
      this.logAction(action, null, true);
      return {
        approved: true,
        reason: 'Approved by default risk threshold',
      };
    }

    this.logAction(action, null, false);
    return {
      approved: false,
      reason: 'Action exceeds default risk threshold',
    };
  }

  // Risk assessment
  private assessRiskLevel(action: any, rule: AutoApprovalRule): 'low' | 'medium' | 'high' {
    // Combine rule risk with action-specific risk assessment
    const actionRisk = this.assessActionRisk(action);
    return this.combineRiskLevels(rule.riskLevel, actionRisk);
  }

  private assessActionRisk(action: any): 'low' | 'medium' | 'high' {
    switch (action.type) {
      case 'file_read':
        return 'low';
      case 'file_write':
        return action.params?.content?.length > 10000 ? 'medium' : 'low';
      case 'terminal_command':
        return this.assessCommandRisk(action.params?.command);
      case 'web_request':
        return this.assessWebRequestRisk(action.params?.url);
      case 'api_call':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private assessCommandRisk(command: string): 'low' | 'medium' | 'high' {
    if (!command) return 'high';

    const cmd = command.toLowerCase();

    // High risk commands
    if (cmd.includes('rm -rf') || cmd.includes('del /f') || cmd.includes('format')) {
      return 'high';
    }

    // Medium risk commands
    if (cmd.includes('sudo') || cmd.includes('chmod 777') || cmd.includes('npm install -g')) {
      return 'medium';
    }

    // Check trusted commands
    if (this.config.trustedCommands.some((trusted) => cmd.includes(trusted))) {
      return 'low';
    }

    return 'medium';
  }

  private assessWebRequestRisk(url: string): 'low' | 'medium' | 'high' {
    if (!url) return 'high';

    try {
      const domain = new URL(url).hostname.toLowerCase();

      // Check trusted domains
      if (this.config.trustedDomains.some((trusted) => domain.includes(trusted))) {
        return 'low';
      }

      // High risk for unknown domains
      return 'high';
    } catch {
      return 'high';
    }
  }

  private assessDefaultRisk(action: any): number {
    const riskMap = {
      low: 1,
      medium: 2,
      high: 3,
    };

    return riskMap[this.assessActionRisk(action)] || 2;
  }

  private getRiskThreshold(threshold: string): number {
    const thresholds = {
      low: 1,
      medium: 2,
      high: 3,
    };
    return thresholds[threshold] || 2;
  }

  private combineRiskLevels(ruleRisk: string, actionRisk: string): 'low' | 'medium' | 'high' {
    const riskValues = { low: 1, medium: 2, high: 3 };
    const combined = Math.max(riskValues[ruleRisk], riskValues[actionRisk]);

    if (combined <= 1) return 'low';
    if (combined === 2) return 'medium';
    return 'high';
  }

  // Rule matching
  private matchesRule(action: any, rule: AutoApprovalRule): boolean {
    if (action.type !== rule.actionType) {
      return false;
    }

    return rule.conditions.every((condition) => this.matchesCondition(action, condition));
  }

  private matchesCondition(action: any, condition: ApprovalCondition): boolean {
    const { type, operator, value, caseSensitive = false } = condition;
    let targetValue: any;

    // Extract value based on condition type
    switch (type) {
      case 'file_pattern':
        targetValue = action.params?.filePath || '';
        break;
      case 'command_pattern':
        targetValue = action.params?.command || '';
        break;
      case 'size_limit':
        targetValue = action.params?.size || action.params?.content?.length || 0;
        break;
      case 'content_check':
        targetValue = action.params?.content || '';
        break;
      case 'user_trust':
        targetValue = action.context?.userTrustLevel || 'unknown';
        break;
      default:
        return false;
    }

    // Apply case sensitivity
    if (typeof targetValue === 'string' && !caseSensitive) {
      targetValue = targetValue.toLowerCase();
      if (typeof value === 'string') {
        let mutableValue = value;
      }
    }

    // Apply operator
    switch (operator) {
      case 'equals':
        return targetValue === mutableValue;
      case 'contains':
        return typeof targetValue === 'string' && targetValue.includes(mutableValue as string);
      case 'matches':
        return (
          typeof targetValue === 'string' && new RegExp(mutableValue as string).test(targetValue)
        );
      case 'less_than':
        return typeof targetValue === 'number' && targetValue < (mutableValue as number);
      case 'greater_than':
        return typeof targetValue === 'number' && targetValue > (mutableValue as number);
      default:
        return false;
    }
  }

  // Rate limiting
  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    if (now - this.lastResetTime > timeWindow) {
      this.actionCount = 0;
      this.lastResetTime = now;
    }

    if (this.actionCount >= this.config.maxAutoActionsPerMinute) {
      return false;
    }

    this.actionCount++;
    return true;
  }

  // Logging
  private logAction(action: any, rule: AutoApprovalRule | null, approved: boolean): void {
    if (!this.config.logAllActions && approved) {
      return; // Only log rejections unless configured to log all
    }

    const logEntry = {
      timestamp: new Date(),
      action,
      rule: rule ? { id: rule.id, name: rule.name } : null,
      approved,
      riskLevel: rule ? rule.riskLevel : this.assessActionRisk(action),
    };

    this.actionLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.actionLog.length > 1000) {
      this.actionLog = this.actionLog.slice(-1000);
    }

    // Update rule usage
    if (rule) {
      rule.lastUsed = new Date();
      this.saveRules();
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<AutoApprovalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getConfig(): AutoApprovalConfig {
    return { ...this.config };
  }

  // Preset rules
  createPresetRules(): void {
    const presets: Omit<AutoApprovalRule, 'id' | 'createdAt'>[] = [
      {
        name: 'Safe File Reads',
        description: 'Auto-approve reading small text files',
        actionType: 'file_read',
        conditions: [
          {
            type: 'size_limit',
            operator: 'less_than',
            value: 100000, // 100KB
          },
          {
            type: 'file_pattern',
            operator: 'matches',
            value: '\\.(txt|md|json|js|ts|py|rb|java)$',
          },
        ],
        isEnabled: true,
        riskLevel: 'low',
      },
      {
        name: 'Trusted Package Installation',
        description: 'Auto-approve installing trusted packages',
        actionType: 'terminal_command',
        conditions: [
          {
            type: 'command_pattern',
            operator: 'contains',
            value: 'npm install',
          },
          {
            type: 'command_pattern',
            operator: 'contains',
            value: '--save',
          },
        ],
        isEnabled: true,
        riskLevel: 'medium',
      },
      {
        name: 'Safe Git Operations',
        description: 'Auto-approve safe git operations',
        actionType: 'terminal_command',
        conditions: [
          {
            type: 'command_pattern',
            operator: 'equals',
            value: 'git status',
          },
          {
            type: 'command_pattern',
            operator: 'equals',
            value: 'git log',
          },
          {
            type: 'command_pattern',
            operator: 'equals',
            value: 'git diff',
          },
        ],
        isEnabled: true,
        riskLevel: 'low',
      },
    ];

    presets.forEach((preset) => {
      this.addRule(preset);
    });
  }

  // Persistence
  private loadRules(): void {
    try {
      const stored = localStorage.getItem('kilo_auto_approval_rules');
      if (stored) {
        const rules = JSON.parse(stored);
        Object.values(rules).forEach((rule: any) => {
          this.rules.set(rule.id, {
            ...rule,
            createdAt: new Date(rule.createdAt),
            lastUsed: rule.lastUsed ? new Date(rule.lastUsed) : undefined,
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load auto-approval rules:', error);
    }
  }

  private saveRules(): void {
    try {
      const rulesObject = Object.fromEntries(this.rules);
      localStorage.setItem('kilo_auto_approval_rules', JSON.stringify(rulesObject));
    } catch (error) {
      console.warn('Failed to save auto-approval rules:', error);
    }
  }

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('kilo_auto_approval_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load auto-approval config:', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('kilo_auto_approval_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save auto-approval config:', error);
    }
  }
}

// Global auto-approval manager instance
export const autoApprovalManager = new AutoApprovalManager();
