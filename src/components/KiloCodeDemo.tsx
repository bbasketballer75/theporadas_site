import { useEffect, useState } from 'react';

import { autoApprovalManager, AutoApprovalRule } from '../utils/autoApprovalManager';
import { mcpMarketplace, MCPTool } from '../utils/mcpMarketplace';
import { ModeManager } from '../utils/modeManager';
import { notificationManager, NotificationMessage } from '../utils/notificationManager';
import { TodoItem } from '../utils/taskOrchestrator';

import { AutoApprovalPanel, MCPToolPanel, ModeSelector, NotificationPanel } from './KiloFeatures';
import { TaskVisualizer } from './TaskVisualizer';

// Enhanced demo tasks showcasing Kilo Code features
const enhancedDemoTasks: TodoItem[] = [
  {
    id: 'setup-advanced-features',
    title: '🚀 Advanced Feature Setup',
    description: 'Configure Kilo Code advanced features and integrations',
    status: 'pending',
    subtasks: [
      {
        id: 'configure-modes',
        title: '🎭 Configure AI Modes',
        description: 'Set up specialized AI modes for different tasks',
        status: 'pending',
      },
      {
        id: 'setup-notifications',
        title: '🔔 Setup Notifications',
        description: 'Configure system notifications and alerts',
        status: 'pending',
      },
      {
        id: 'install-mcp-tools',
        title: '🔧 Install MCP Tools',
        description: 'Install and configure Model Context Protocol tools',
        status: 'pending',
      },
    ],
  },
  {
    id: 'implement-ai-workflow',
    title: '🤖 AI-Powered Development Workflow',
    description: 'Implement intelligent development workflow with AI assistance',
    status: 'pending',
    dependencies: ['setup-advanced-features'],
    subtasks: [
      {
        id: 'architect-mode-demo',
        title: '🏗️ Architect Mode Demo',
        description: 'Demonstrate architectural planning capabilities',
        status: 'pending',
      },
      {
        id: 'coder-mode-demo',
        title: '💻 Coder Mode Demo',
        description: 'Show code generation and implementation features',
        status: 'pending',
      },
      {
        id: 'debugger-mode-demo',
        title: '🔍 Debugger Mode Demo',
        description: 'Demonstrate debugging and troubleshooting',
        status: 'pending',
      },
    ],
  },
  {
    id: 'automation-setup',
    title: '⚙️ Automation & Efficiency',
    description: 'Set up automated workflows and efficiency tools',
    status: 'pending',
    dependencies: ['implement-ai-workflow'],
    subtasks: [
      {
        id: 'auto-approval-rules',
        title: '✅ Auto-Approval Rules',
        description: 'Configure automatic approval for safe operations',
        status: 'pending',
      },
      {
        id: 'workflow-templates',
        title: '📋 Workflow Templates',
        description: 'Create reusable workflow templates',
        status: 'pending',
      },
      {
        id: 'performance-monitoring',
        title: '📊 Performance Monitoring',
        description: 'Set up performance tracking and optimization',
        status: 'pending',
      },
    ],
  },
  {
    id: 'testing-validation',
    title: '🧪 Testing & Validation',
    description: 'Comprehensive testing of all new features',
    status: 'pending',
    dependencies: ['automation-setup'],
    subtasks: [
      {
        id: 'feature-testing',
        title: '🔬 Feature Testing',
        description: 'Test all implemented features thoroughly',
        status: 'pending',
      },
      {
        id: 'integration-testing',
        title: '🔗 Integration Testing',
        description: 'Test feature integration and compatibility',
        status: 'pending',
      },
      {
        id: 'user-acceptance-testing',
        title: '👥 User Acceptance Testing',
        description: 'Validate features meet user requirements',
        status: 'pending',
      },
    ],
  },
];

export function KiloCodeDemo() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'modes' | 'tools' | 'approvals' | 'notifications'
  >('overview');
  const [modeManager] = useState(() => new ModeManager());
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [approvalRules, setApprovalRules] = useState<AutoApprovalRule[]>([]);

  useEffect(() => {
    // Load initial data
    setMcpTools(mcpMarketplace.getAllTools());
    setApprovalRules(autoApprovalManager.getAllRules());

    // Subscribe to notifications
    const unsubscribe = notificationManager.subscribe(setNotifications);

    // Create some preset rules if none exist
    if (autoApprovalManager.getAllRules().length === 0) {
      autoApprovalManager.createPresetRules();
      setApprovalRules(autoApprovalManager.getAllRules());
    }

    return unsubscribe;
  }, []);

  const handleModeChange = (modeId: string) => {
    console.log('Mode changed to:', modeId);
  };

  const handleNotificationDismiss = (id: string) => {
    notificationManager.remove(id);
  };

  const handleNotificationAction = (notification: NotificationMessage) => {
    if (notification.action) {
      notification.action.callback();
    }
  };

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    if (enabled) {
      mcpMarketplace.enableTool(toolId);
    } else {
      mcpMarketplace.disableTool(toolId);
    }
    setMcpTools([...mcpMarketplace.getAllTools()]);
  };

  const handleToolExecute = async (toolId: string) => {
    try {
      const result = await mcpMarketplace.executeTool(toolId, {});
      notificationManager.success('Tool Executed', `Successfully executed ${toolId}`);
      console.log('Tool execution result:', result);
    } catch (error) {
      notificationManager.error('Tool Execution Failed', `Failed to execute ${toolId}: ${error}`);
    }
  };

  const handleRuleToggle = (ruleId: string, enabled: boolean) => {
    if (enabled) {
      autoApprovalManager.enableRule(ruleId);
    } else {
      autoApprovalManager.disableRule(ruleId);
    }
    setApprovalRules([...autoApprovalManager.getAllRules()]);
  };

  const handleAddRule = () => {
    // In a real implementation, this would open a rule creation dialog
    notificationManager.info('Add Rule', 'Rule creation dialog would open here');
  };

  const handleEditRule = (ruleId: string) => {
    notificationManager.info('Edit Rule', `Editing rule: ${ruleId}`);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (autoApprovalManager.removeRule(ruleId)) {
      setApprovalRules([...autoApprovalManager.getAllRules()]);
      notificationManager.success('Rule Deleted', 'Auto-approval rule has been removed');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'modes', label: 'AI Modes', icon: '🎭' },
    { id: 'tools', label: 'MCP Tools', icon: '🔧' },
    { id: 'approvals', label: 'Auto-Approval', icon: '✅' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="kilo-code-demo min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎯 Kilo Code Features Demo</h1>
              <p className="text-gray-600 mt-1">
                Experience the power of advanced AI coding assistance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Current Mode:{' '}
                <span className="font-medium text-blue-600">
                  {modeManager.getCurrentMode().name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                🎉 Welcome to Kilo Code Enhanced Orchestrator
              </h2>
              <p className="text-gray-600 mb-4">
                This demo showcases the advanced features inspired by Kilo Code, including
                specialized AI modes, intelligent notifications, extensible MCP tools, and smart
                auto-approval systems.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🎭</div>
                  <h3 className="font-medium">AI Modes</h3>
                  <p className="text-sm text-gray-600">Specialized personas for different tasks</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">🔧</div>
                  <h3 className="font-medium">MCP Tools</h3>
                  <p className="text-sm text-gray-600">Extensible tool marketplace</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mb-2">✅</div>
                  <h3 className="font-medium">Auto-Approval</h3>
                  <p className="text-sm text-gray-600">Smart automation rules</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">🔔</div>
                  <h3 className="font-medium">Notifications</h3>
                  <p className="text-sm text-gray-600">Intelligent alerts & feedback</p>
                </div>
              </div>
            </div>

            <TaskVisualizer initialTasks={enhancedDemoTasks} />
          </div>
        )}

        {activeTab === 'modes' && (
          <div className="space-y-6">
            <ModeSelector modeManager={modeManager} onModeChange={handleModeChange} />

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Mode Capabilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modeManager.getAllModes().map((mode) => (
                  <div key={mode.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{mode.icon}</span>
                      <div>
                        <h4 className="font-medium">{mode.name}</h4>
                        <p className="text-sm text-gray-600">{mode.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Capabilities:</h5>
                      <div className="flex flex-wrap gap-1">
                        {mode.capabilities.map((capability) => (
                          <span
                            key={capability}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <MCPToolPanel
            tools={mcpTools}
            onToggleTool={handleToolToggle}
            onExecuteTool={handleToolExecute}
          />
        )}

        {activeTab === 'approvals' && (
          <AutoApprovalPanel
            rules={approvalRules}
            onToggleRule={handleRuleToggle}
            onAddRule={handleAddRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Enable Notifications</h4>
                  <p className="text-sm text-gray-600">
                    Receive alerts for task completion and important events
                  </p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationManager.getConfig().enabled}
                    onChange={(e) => {
                      notificationManager.updateConfig({ enabled: e.target.checked });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sound Notifications</h4>
                  <p className="text-sm text-gray-600">
                    Play sounds for different notification types
                  </p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationManager.getConfig().soundEnabled}
                    onChange={(e) => {
                      notificationManager.updateConfig({ soundEnabled: e.target.checked });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Test Notifications</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      notificationManager.success('Test Success', 'This is a success notification')
                    }
                    className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Test Success
                  </button>
                  <button
                    onClick={() =>
                      notificationManager.error('Test Error', 'This is an error notification')
                    }
                    className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Test Error
                  </button>
                  <button
                    onClick={() =>
                      notificationManager.warning('Test Warning', 'This is a warning notification')
                    }
                    className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                  >
                    Test Warning
                  </button>
                  <button
                    onClick={() =>
                      notificationManager.info('Test Info', 'This is an info notification')
                    }
                    className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Test Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      <NotificationPanel
        notifications={notifications}
        onDismiss={handleNotificationDismiss}
        onAction={handleNotificationAction}
      />
    </div>
  );
}
