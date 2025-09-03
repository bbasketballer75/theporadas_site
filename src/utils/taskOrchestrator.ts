import { useEffect, useState } from 'react';

import { autoApprovalManager } from './autoApprovalManager';
import { mcpMarketplace } from './mcpMarketplace';
import { ModeManager } from './modeManager';
import { notificationManager } from './notificationManager';

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  subtasks?: TodoItem[];
  dependencies?: string[];
  validation?: () => Promise<boolean>;
}

interface OrchestratorState {
  currentTask: TodoItem | null;
  todoList: TodoItem[];
  completedTasks: string[];
  failedTasks: string[];
}

export class TaskOrchestrator {
  private state: OrchestratorState;
  private listeners: ((state: OrchestratorState) => void)[] = [];
  private modeManager: ModeManager;
  private pendingNotifications: string[] = [];

  constructor(initialTasks: TodoItem[] = []) {
    this.state = {
      currentTask: null,
      todoList: initialTasks,
      completedTasks: [],
      failedTasks: [],
    };
    this.modeManager = new ModeManager();

    // Set up notification listeners
    this.setupNotificationListeners();
  }

  // Add a new task to the orchestrator
  addTask(task: TodoItem): void {
    this.state.todoList.push(task);
    this.notifyListeners();
  }

  // Start working on a specific task
  startTask(taskId: string): void {
    const task = this.state.todoList.find((t) => t.id === taskId);
    if (task && task.status === 'pending') {
      // Check dependencies
      if (task.dependencies) {
        const unmetDeps = task.dependencies.filter(
          (depId) => !this.state.completedTasks.includes(depId),
        );
        if (unmetDeps.length > 0) {
          console.warn(`Cannot start task ${taskId}: unmet dependencies:`, unmetDeps);
          return;
        }
      }

      task.status = 'in_progress';
      this.state.currentTask = task;
      this.notifyListeners();
    }
  }

  // Enhanced task completion with notifications
  completeTask(taskId: string): void {
    const task = this.state.todoList.find((t) => t.id === taskId);
    if (task) {
      task.status = 'completed';
      this.state.completedTasks.push(taskId);
      this.state.currentTask = null;

      // Send completion notification
      notificationManager.taskCompleted(
        task.title,
        `Task "${task.title}" has been completed successfully`,
      );

      this.notifyListeners();
    }
  }

  // Enhanced task failure with notifications
  failTask(taskId: string, reason?: string): void {
    const task = this.state.todoList.find((t) => t.id === taskId);
    if (task) {
      task.status = 'failed';
      this.state.failedTasks.push(taskId);
      this.state.currentTask = null;

      // Send failure notification
      notificationManager.taskFailed(task.title, reason);

      if (reason) {
        console.error(`Task ${taskId} failed:`, reason);
      }
      this.notifyListeners();
    }
  }

  // Auto-approval integration
  async executeWithApproval(action: Record<string, unknown>): Promise<unknown> {
    const approval = autoApprovalManager.shouldAutoApprove(action);

    if (approval.approved) {
      console.log(`Auto-approved action: ${approval.reason}`);
      return await this.executeAction(action);
    } else if (approval.requiresConfirmation) {
      // In a real implementation, this would show a confirmation dialog
      console.log(`Action requires confirmation: ${approval.reason}`);
      // For now, we'll deny high-risk actions
      throw new Error(`Action denied: ${approval.reason}`);
    } else {
      throw new Error(`Action denied: ${approval.reason}`);
    }
  }

  private async executeAction(action: Record<string, unknown>): Promise<unknown> {
    // Route to appropriate tool based on action type
    switch (action.type) {
      case 'file_operation':
        return await mcpMarketplace.executeTool('file-operations', action.params);
      case 'terminal_command':
        return await mcpMarketplace.executeTool('terminal-commands', action.params);
      case 'web_request':
        return await mcpMarketplace.executeTool('web-browser', action.params);
      case 'code_search':
        return await mcpMarketplace.executeTool('code-search', action.params);
      case 'git_operation':
        return await mcpMarketplace.executeTool('git-operations', action.params);
      case 'api_call':
        return await mcpMarketplace.executeTool('api-client', action.params);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Mode-aware task execution
  async executeTaskWithMode(taskId: string): Promise<void> {
    const task = this.state.todoList.find((t) => t.id === taskId);
    if (!task) return;

    const currentMode = this.modeManager.getCurrentMode();

    // Adjust execution based on current mode
    switch (currentMode.id) {
      case 'architect':
        await this.executeArchitectMode(task);
        break;
      case 'coder':
        await this.executeCoderMode(task);
        break;
      case 'debugger':
        await this.executeDebuggerMode(task);
        break;
      case 'asker':
        await this.executeAskerMode(task);
        break;
      default:
        await this.executeDefaultMode(task);
    }
  }

  private async executeArchitectMode(task: TodoItem): Promise<void> {
    // Architect mode: Focus on planning and design
    console.log(`Executing ${task.title} in Architect mode`);
    notificationManager.info('Architect Mode', `Planning and designing: ${task.title}`);

    // Could integrate with planning tools, design validation, etc.
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work
  }

  private async executeCoderMode(task: TodoItem): Promise<void> {
    // Coder mode: Focus on implementation
    console.log(`Executing ${task.title} in Coder mode`);
    notificationManager.info('Coder Mode', `Implementing: ${task.title}`);

    // Could integrate with code generation, refactoring tools, etc.
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work
  }

  private async executeDebuggerMode(task: TodoItem): Promise<void> {
    // Debugger mode: Focus on problem diagnosis
    console.log(`Executing ${task.title} in Debugger mode`);
    notificationManager.info('Debugger Mode', `Debugging: ${task.title}`);

    // Could integrate with debugging tools, error analysis, etc.
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work
  }

  private async executeAskerMode(task: TodoItem): Promise<void> {
    // Ask mode: Focus on information gathering
    console.log(`Executing ${task.title} in Ask mode`);
    notificationManager.info('Ask Mode', `Researching: ${task.title}`);

    // Could integrate with search tools, documentation lookup, etc.
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work
  }

  private async executeDefaultMode(task: TodoItem): Promise<void> {
    console.log(`Executing ${task.title} in default mode`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work
  }

  // Get current mode
  getCurrentMode() {
    return this.modeManager.getCurrentMode();
  }

  // Set mode
  setMode(modeId: string): boolean {
    return this.modeManager.setMode(modeId);
  }

  // Get all available modes
  getAllModes() {
    return this.modeManager.getAllModes();
  }

  // Get current state
  getState(): OrchestratorState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: (state: OrchestratorState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

// React hook for using the orchestrator
export function useTaskOrchestrator(initialTasks: TodoItem[] = []) {
  const [orchestrator] = useState(() => new TaskOrchestrator(initialTasks));
  const [state, setState] = useState(orchestrator.getState());

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe(setState);
    return unsubscribe;
  }, [orchestrator]);

  return {
    state,
    addTask: (task: TodoItem) => orchestrator.addTask(task),
    startTask: (taskId: string) => orchestrator.startTask(taskId),
    completeTask: (taskId: string) => orchestrator.completeTask(taskId),
    failTask: (taskId: string, reason?: string) => orchestrator.failTask(taskId, reason),
  };
}
