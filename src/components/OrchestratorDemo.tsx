import { TodoItem } from '../utils/taskOrchestrator';

import { TaskVisualizer } from './TaskVisualizer';

// Example complex task demonstrating orchestrator capabilities
const exampleTasks: TodoItem[] = [
  {
    id: 'setup-project',
    title: '🚀 Project Setup & Configuration',
    description: 'Set up development environment and project structure',
    status: 'pending',
    subtasks: [
      {
        id: 'install-deps',
        title: '📦 Install Dependencies',
        description: 'Install all required npm packages and dependencies',
        status: 'pending',
      },
      {
        id: 'configure-env',
        title: '⚙️ Configure Environment',
        description: 'Set up environment variables and configuration files',
        status: 'pending',
      },
      {
        id: 'setup-scripts',
        title: '🔧 Setup Build Scripts',
        description: 'Configure npm scripts for development and production',
        status: 'pending',
      },
    ],
  },
  {
    id: 'implement-feature',
    title: '✨ Implement AI Caption Feature',
    description: 'Add AI-powered caption generation to gallery images',
    status: 'pending',
    dependencies: ['setup-project'],
    subtasks: [
      {
        id: 'research-api',
        title: '🔍 Research Ollama API',
        description: 'Study Ollama API documentation and capabilities',
        status: 'pending',
      },
      {
        id: 'create-utility',
        title: '🛠️ Create Caption Utility',
        description: 'Build utility function for AI caption generation',
        status: 'pending',
        dependencies: ['research-api'],
      },
      {
        id: 'update-gallery',
        title: '🎨 Update Gallery Component',
        description: 'Integrate AI caption feature into gallery UI',
        status: 'pending',
        dependencies: ['create-utility'],
      },
      {
        id: 'add-button',
        title: '🔘 Add Generate Button',
        description: 'Add UI button to trigger caption generation',
        status: 'pending',
        dependencies: ['update-gallery'],
      },
    ],
  },
  {
    id: 'testing-validation',
    title: '🧪 Testing & Validation',
    description: 'Comprehensive testing of the new feature',
    status: 'pending',
    dependencies: ['implement-feature'],
    subtasks: [
      {
        id: 'unit-tests',
        title: '📝 Unit Tests',
        description: 'Write and run unit tests for caption utility',
        status: 'pending',
      },
      {
        id: 'integration-tests',
        title: '🔗 Integration Tests',
        description: 'Test caption generation with gallery component',
        status: 'pending',
      },
      {
        id: 'manual-testing',
        title: '👥 Manual Testing',
        description: 'Manual verification of feature functionality',
        status: 'pending',
      },
    ],
  },
  {
    id: 'documentation',
    title: '📚 Documentation & Deployment',
    description: 'Document changes and prepare for deployment',
    status: 'pending',
    dependencies: ['testing-validation'],
    subtasks: [
      {
        id: 'update-readme',
        title: '📖 Update README',
        description: 'Document the new AI caption feature',
        status: 'pending',
      },
      {
        id: 'code-comments',
        title: '💬 Add Code Comments',
        description: 'Add comprehensive comments to new code',
        status: 'pending',
      },
      {
        id: 'performance-test',
        title: '⚡ Performance Testing',
        description: "Ensure feature doesn't impact performance",
        status: 'pending',
      },
    ],
  },
];

export function OrchestratorDemo() {
  return (
    <div className="orchestrator-demo p-6">
      <h1 className="text-2xl font-bold mb-6">🎯 Task Orchestrator Demo</h1>
      <p className="mb-6 text-gray-600">
        This demonstrates the orchestrator mode with detailed todo management, subtasks,
        dependencies, and progress tracking.
      </p>
      <TaskVisualizer initialTasks={exampleTasks} />
    </div>
  );
}
