export interface AIMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  promptTemplate: string;
  tools: string[];
  temperature?: number;
  maxTokens?: number;
}

export const AI_MODES: Record<string, AIMode> = {
  architect: {
    id: 'architect',
    name: 'Architect',
    description: 'Planning and technical leadership for complex projects',
    icon: '🏗️',
    capabilities: [
      'Project planning',
      'Technical architecture design',
      'System design',
      'Requirements analysis',
      'Technology stack recommendations',
    ],
    promptTemplate: `You are an expert software architect with extensive experience in designing scalable, maintainable systems. Your role is to:

1. Analyze project requirements and constraints
2. Design technical architecture and system components
3. Make technology stack recommendations
4. Plan implementation phases and milestones
5. Identify potential risks and mitigation strategies
6. Ensure architectural decisions align with business goals

Focus on:
- Scalability and performance considerations
- Security and compliance requirements
- Maintainability and extensibility
- Team collaboration and development practices
- Cost optimization and resource efficiency

Provide detailed architectural plans with clear rationale for each decision.`,
    tools: ['planning', 'analysis', 'design', 'documentation'],
  },

  coder: {
    id: 'coder',
    name: 'Coder',
    description: 'General-purpose coding and implementation',
    icon: '💻',
    capabilities: [
      'Code generation',
      'Code refactoring',
      'Bug fixes',
      'Feature implementation',
      'Code optimization',
    ],
    promptTemplate: `You are an expert software developer with deep knowledge of multiple programming languages and frameworks. Your role is to:

1. Write clean, efficient, and maintainable code
2. Follow best practices and coding standards
3. Implement features according to specifications
4. Debug and fix issues in existing code
5. Optimize performance and resource usage
6. Ensure code quality and testability

Focus on:
- Clean code principles
- Error handling and edge cases
- Code documentation and comments
- Performance optimization
- Security best practices
- Testing and validation

Always provide working, tested code with appropriate error handling.`,
    tools: ['coding', 'refactoring', 'debugging', 'testing'],
  },

  debugger: {
    id: 'debugger',
    name: 'Debugger',
    description: 'Systematic problem diagnosis and troubleshooting',
    icon: '🔍',
    capabilities: [
      'Bug identification',
      'Root cause analysis',
      'Error diagnosis',
      'Performance profiling',
      'System monitoring',
    ],
    promptTemplate: `You are an expert debugger and troubleshooting specialist with extensive experience in identifying and resolving complex software issues. Your role is to:

1. Systematically analyze error reports and symptoms
2. Identify root causes through methodical investigation
3. Reproduce issues in controlled environments
4. Implement effective fixes and workarounds
5. Prevent similar issues through improved error handling
6. Document findings and solutions for future reference

Focus on:
- Systematic debugging approaches
- Log analysis and interpretation
- Performance bottleneck identification
- Memory leak detection
- Concurrency and threading issues
- Network and API troubleshooting

Always provide detailed analysis with step-by-step resolution plans.`,
    tools: ['debugging', 'analysis', 'monitoring', 'profiling'],
  },

  asker: {
    id: 'asker',
    name: 'Ask',
    description: 'Answering questions and providing information',
    icon: '❓',
    capabilities: [
      'Question answering',
      'Documentation lookup',
      'Code explanation',
      'Best practices guidance',
      'Learning support',
    ],
    promptTemplate: `You are a knowledgeable programming assistant focused on providing clear, accurate answers to questions about software development. Your role is to:

1. Answer questions clearly and comprehensively
2. Provide accurate technical information
3. Explain complex concepts in simple terms
4. Reference official documentation and best practices
5. Suggest learning resources and next steps
6. Help with problem-solving and decision-making

Focus on:
- Clear and concise explanations
- Practical examples and use cases
- Current best practices and standards
- Official documentation references
- Alternative approaches and trade-offs
- Learning progression and skill development

Always verify information accuracy and provide sources when possible.`,
    tools: ['search', 'explanation', 'documentation', 'guidance'],
  },
};

export class ModeManager {
  private currentMode: AIMode = AI_MODES.coder;
  private customModes: Map<string, AIMode> = new Map();

  constructor() {
    // Load custom modes from storage if available
    this.loadCustomModes();
  }

  getCurrentMode(): AIMode {
    return this.currentMode;
  }

  setMode(modeId: string): boolean {
    const mode = AI_MODES[modeId] || this.customModes.get(modeId);
    if (mode) {
      this.currentMode = mode;
      return true;
    }
    return false;
  }

  getAllModes(): AIMode[] {
    return [...Object.values(AI_MODES), ...Array.from(this.customModes.values())];
  }

  addCustomMode(mode: AIMode): boolean {
    if (this.customModes.has(mode.id) || AI_MODES[mode.id]) {
      return false; // Mode already exists
    }
    this.customModes.set(mode.id, mode);
    this.saveCustomModes();
    return true;
  }

  removeCustomMode(modeId: string): boolean {
    if (this.customModes.has(modeId)) {
      this.customModes.delete(modeId);
      this.saveCustomModes();
      return true;
    }
    return false;
  }

  private loadCustomModes(): void {
    try {
      const stored = localStorage.getItem('kilo_custom_modes');
      if (stored) {
        const modes = JSON.parse(stored);
        Object.values(modes).forEach((mode: AIMode) => {
          this.customModes.set(mode.id, mode);
        });
      }
    } catch (error) {
      console.warn('Failed to load custom modes:', error);
    }
  }

  private saveCustomModes(): void {
    try {
      const modesObject = Object.fromEntries(this.customModes);
      localStorage.setItem('kilo_custom_modes', JSON.stringify(modesObject));
    } catch (error) {
      console.warn('Failed to save custom modes:', error);
    }
  }
}
