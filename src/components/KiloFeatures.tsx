import { useMemo, useState } from 'react';

import { AutoApprovalRule } from '../utils/autoApprovalManager';
import { MCPTool } from '../utils/mcpMarketplace';
import { ModeManager } from '../utils/modeManager';
import { notificationManager, NotificationMessage } from '../utils/notificationManager';

interface ModeSelectorProps {
  modeManager: ModeManager;
  onModeChange: (modeId: string) => void;
}

export function ModeSelector({ modeManager, onModeChange }: ModeSelectorProps) {
  const [currentMode, setCurrentMode] = useState(modeManager.getCurrentMode());
  const allModes = useMemo(() => modeManager.getAllModes(), [modeManager]);

  const handleModeChange = (modeId: string) => {
    if (modeManager.setMode(modeId)) {
      setCurrentMode(modeManager.getCurrentMode());
      onModeChange(modeId);
      notificationManager.info(
        'Mode Changed',
        `Switched to ${modeManager.getCurrentMode().name} mode`,
      );
    }
  };

  return (
    <div className="mode-selector bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-3">AI Mode</h3>
      <div className="grid grid-cols-2 gap-2">
        {allModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            className={`p-3 rounded-lg border-2 transition-all ${
              currentMode.id === mode.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="text-2xl mb-1">{mode.icon}</div>
            <div className="font-medium text-sm">{mode.name}</div>
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface NotificationPanelProps {
  notifications: NotificationMessage[];
  onDismiss: (id: string) => void;
  onAction: (notification: NotificationMessage) => void;
}

export function NotificationPanel({ notifications, onDismiss, onAction }: NotificationPanelProps) {
  const getTypeStyles = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-panel fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border-l-4 shadow-lg ${getTypeStyles(notification.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
              {notification.action && (
                <button
                  onClick={() => onAction(notification)}
                  className="mt-2 px-3 py-1 text-xs bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-all"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MCPToolPanelProps {
  tools: MCPTool[];
  onToggleTool: (toolId: string, enabled: boolean) => void;
  onExecuteTool: (toolId: string) => void;
}

export function MCPToolPanel({ tools, onToggleTool, onExecuteTool }: MCPToolPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', ...new Set(tools.map((tool) => tool.category))];

  const filteredTools =
    selectedCategory === 'All' ? tools : tools.filter((tool) => tool.category === selectedCategory);

  return (
    <div className="mcp-tool-panel bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-3">MCP Tools</h3>

      {/* Category Filter */}
      <div className="mb-4">
        <select
          title="Filter tools by category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
        {filteredTools.map((tool) => (
          <div key={tool.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{tool.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{tool.description}</p>
                <div className="flex items-center mt-2 space-x-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">v{tool.version}</span>
                  <span className="text-xs text-gray-500">by {tool.author}</span>
                  {tool.isBuiltIn && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Built-in
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onExecuteTool(tool.id)}
                  disabled={!tool.isEnabled}
                  className={`px-3 py-1 text-xs rounded ${
                    tool.isEnabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Execute
                </button>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tool.isEnabled}
                    onChange={(e) => onToggleTool(tool.id, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs">Enabled</span>
                </label>
              </div>
            </div>

            {/* Capabilities */}
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {tool.capabilities.map((capability) => (
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
  );
}

interface AutoApprovalPanelProps {
  rules: AutoApprovalRule[];
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onAddRule: () => void;
  onEditRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
}

export function AutoApprovalPanel({
  rules,
  onToggleRule,
  onAddRule,
  onEditRule,
  onDeleteRule,
}: AutoApprovalPanelProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="auto-approval-panel bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Auto-Approval Rules</h3>
        <button
          onClick={onAddRule}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Rule
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {rules.map((rule) => (
          <div key={rule.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-sm">{rule.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${getRiskColor(rule.riskLevel)}`}>
                    {rule.riskLevel} risk
                  </span>
                  {rule.lastUsed && (
                    <span className="text-xs text-gray-500">
                      Last used: {rule.lastUsed.toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">{rule.description}</p>
                <div className="text-xs text-gray-500">
                  Action: {rule.actionType} • Conditions: {rule.conditions.length}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onEditRule(rule.id)}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={(e) => onToggleRule(rule.id, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs">Enabled</span>
                </label>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No auto-approval rules configured</p>
            <button
              onClick={onAddRule}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Your First Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
