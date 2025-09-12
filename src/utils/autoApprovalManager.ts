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

type RiskLevel = 'low' | 'medium' | 'high';
type Action = {
  type: string;
  params?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

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
  private actionLog: Array<{
    timestamp: Date;
    action: Action;
    rule: { id: string; name: string } | null;
    approved: boolean;
    riskLevel: RiskLevel;
  }> = [];

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
  shouldAutoApprove(action: Action): {
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
  private assessRiskLevel(action: Action, rule: AutoApprovalRule): RiskLevel {
    // Combine rule risk with action-specific risk assessment
    const actionRisk = this.assessActionRisk(action);
    return this.combineRiskLevels(rule.riskLevel, actionRisk);
  }

  private assessActionRisk(action: Action): RiskLevel {
    switch (action.type) {
      case 'file_read':
        return 'low';
      case 'file_write': {
        const contentLen =
          typeof action.params?.content === 'string' ? action.params.content.length : 0;
        return contentLen > 10000 ? 'medium' : 'low';
      }
      case 'terminal_command':
        return this.assessCommandRisk(
          typeof action.params?.command === 'string' ? action.params.command : '',
        );
      case 'web_request':
        return this.assessWebRequestRisk(
          typeof action.params?.url === 'string' ? action.params.url : '',
        );
      case 'api_call':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private assessCommandRisk(command: string): RiskLevel {
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

  private assessWebRequestRisk(url: string): RiskLevel {
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

  private assessDefaultRisk(action: Action): number {
    const riskMap = {
      low: 1,
      medium: 2,
      high: 3,
    };

    return riskMap[this.assessActionRisk(action)] || 2;
  }

  private getRiskThreshold(threshold: RiskLevel): number {
    const thresholds = {
      low: 1,
      medium: 2,
      high: 3,
    };
    return thresholds[threshold] ?? 2;
  }

  private combineRiskLevels(ruleRisk: RiskLevel, actionRisk: RiskLevel): RiskLevel {
    const riskValues = { low: 1, medium: 2, high: 3 };
    const combined = Math.max(riskValues[ruleRisk], riskValues[actionRisk]);

    if (combined <= 1) return 'low';
    if (combined === 2) return 'medium';
    return 'high';
  }

  // Rule matching
  private matchesRule(action: Action, rule: AutoApprovalRule): boolean {
    if (action.type !== rule.actionType) {
      return false;
    }

    return rule.conditions.every((condition) => this.matchesCondition(action, condition));
  }

  private matchesCondition(action: Action, condition: ApprovalCondition): boolean {
    const { type, operator, value, caseSensitive = false } = condition;
    const targetValue = this.getConditionTarget(action, type);
    return this.evaluateCondition(operator, targetValue, value, caseSensitive);
  }

  private getConditionTarget(action: Action, type: ApprovalCondition['type']): string | number {
    switch (type) {
      case 'file_pattern': {
        const filePath = action.params?.filePath;
        return typeof filePath === 'string' ? filePath : '';
      }
      case 'command_pattern': {
        const command = action.params?.command;
        return typeof command === 'string' ? command : '';
      }
      case 'size_limit': {
        const size = action.params?.size;
        if (typeof size === 'number') return size;
        const content = action.params?.content;
        if (typeof content === 'string') return content.length;
        return 0;
      }
      case 'content_check': {
        const content = action.params?.content;
        return typeof content === 'string' ? content : '';
      }
      case 'user_trust': {
        const trust = action.context?.userTrustLevel;
        return typeof trust === 'string' ? trust : 'unknown';
      }
      default:
        return '';
    }
  }

  private evaluateCondition(
    operator: ApprovalCondition['operator'],
    target: string | number,
    value: string | number,
    caseSensitive: boolean,
  ): boolean {
    if (operator === 'equals') return target === (value as typeof target);
    if (typeof target === 'string')
      return this.evaluateStringCondition(operator, target, value, caseSensitive);
    if (typeof target === 'number') return this.evaluateNumberCondition(operator, target, value);
    return false;
  }

  private evaluateStringCondition(
    operator: ApprovalCondition['operator'],
    target: string,
    value: string | number,
    caseSensitive: boolean,
  ): boolean {
    if (operator === 'contains') {
      if (typeof value !== 'string') return false;
      const a = caseSensitive ? target : target.toLowerCase();
      const b = caseSensitive ? value : value.toLowerCase();
      return a.includes(b);
    }
    if (operator === 'matches') {
      const flags = caseSensitive ? undefined : 'i';
      const re = new RegExp(String(value), flags);
      return re.test(target);
    }
    return false;
  }

  private evaluateNumberCondition(
    operator: ApprovalCondition['operator'],
    target: number,
    value: string | number,
  ): boolean {
    if (typeof value !== 'number') return false;
    if (operator === 'less_than') return target < value;
    if (operator === 'greater_than') return target > value;
    return false;
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
  private logAction(action: Action, rule: AutoApprovalRule | null, approved: boolean): void {
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
        Object.values(rules).forEach((rule: unknown) => {
          const r = rule as AutoApprovalRule;
          this.rules.set(r.id, {
            ...r,
            createdAt: new Date(r.createdAt),
            lastUsed: r.lastUsed ? new Date(r.lastUsed) : undefined,
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
