import { TodoItem, useTaskOrchestrator } from '../utils/taskOrchestrator';

interface TaskVisualizerProps {
  initialTasks?: TodoItem[];
}

export function TaskVisualizer({ initialTasks = [] }: TaskVisualizerProps) {
  const { state, startTask, completeTask, failTask } = useTaskOrchestrator(initialTasks);

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const renderTask = (task: TodoItem, depth = 0) => (
    <div key={task.id} className={`ml-${depth * 4} mb-2`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon(task.status)}</span>
        <span className={`font-medium ${getStatusColor(task.status)}`}>{task.title}</span>
        {task.status === 'pending' && (
          <button
            onClick={() => startTask(task.id)}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start
          </button>
        )}
        {task.status === 'in_progress' && (
          <div className="flex space-x-1">
            <button
              onClick={() => completeTask(task.id)}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              Complete
            </button>
            <button
              onClick={() => failTask(task.id)}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Fail
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 ml-6">{task.description}</p>
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="ml-6 mt-2">
          {task.subtasks.map((subtask) => renderTask(subtask, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="task-visualizer p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Task Orchestrator</h2>

      {state.currentTask && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-800">Currently Working On:</h3>
          <p className="text-blue-700">{state.currentTask.title}</p>
          <p className="text-sm text-blue-600">{state.currentTask.description}</p>
        </div>
      )}

      <div className="task-list">
        <h3 className="font-semibold mb-2">All Tasks:</h3>
        {state.todoList.length === 0 ? (
          <p className="text-gray-500">No tasks yet. Add some tasks to get started!</p>
        ) : (
          state.todoList.map((task) => renderTask(task))
        )}
      </div>

      <div className="stats mt-4 text-sm text-gray-600">
        <p>Completed: {state.completedTasks.length}</p>
        <p>Failed: {state.failedTasks.length}</p>
        <p>Remaining: {state.todoList.filter((t) => t.status === 'pending').length}</p>
      </div>
    </div>
  );
}
