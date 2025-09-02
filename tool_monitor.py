import time
import logging
import json
import threading
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional, Callable
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tool_monitor.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class ToolMonitor:
    """Main class for tool performance monitoring system."""

    def __init__(self, config_file: str = 'tool_monitor_config.json'):
        self.config = Config(config_file)
        self.tracker = ToolTracker()
        self.metrics = PerformanceMetrics()
        self.error_detector = ErrorDetector()
        self.health_checker = HealthChecker()
        self.reporter = Reporter(self.config, self.tracker, self.metrics, self.error_detector)

        # Start background monitoring thread
        self.monitoring_thread = threading.Thread(target=self._background_monitor, daemon=True)
        self.monitoring_thread.start()

    def track_tool_execution(self, tool_name: str, execution_func: Callable, *args, **kwargs) -> Any:
        """Track the execution of a tool."""
        return self.tracker.track_execution(tool_name, execution_func, *args, **kwargs)

    def get_performance_report(self) -> Dict[str, Any]:
        """Generate a performance report."""
        return self.reporter.generate_report()

    def check_health(self) -> Dict[str, Any]:
        """Perform health checks on all tools."""
        return self.health_checker.check_all_tools()

    def _background_monitor(self):
        """Background monitoring thread for periodic tasks."""
        while True:
            try:
                # Perform health checks
                health_status = self.check_health()
                if not health_status['healthy']:
                    logger.warning(f"Health check failed: {health_status}")

                # Generate periodic reports
                if self.config.should_generate_report():
                    report = self.get_performance_report()
                    self.reporter.save_report(report)

                time.sleep(self.config.monitoring_interval)
            except Exception as e:
                logger.error(f"Error in background monitoring: {e}")
                time.sleep(60)  # Wait before retrying

class Config:
    """Configuration class for monitoring thresholds and alerts."""

    def __init__(self, config_file: str):
        self.config_file = config_file
        self.load_config()

    def load_config(self):
        """Load configuration from file."""
        try:
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            self.config = self.get_default_config()
            self.save_config()

    def save_config(self):
        """Save configuration to file."""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)

    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration."""
        return {
            'monitoring_interval': 300,  # 5 minutes
            'max_execution_time': 30,  # seconds
            'error_threshold': 0.1,  # 10% error rate
            'performance_degradation_threshold': 0.2,  # 20% degradation
            'report_interval': 3600,  # 1 hour
            'alert_thresholds': {
                'execution_time': 60,  # seconds
                'error_rate': 0.15,  # 15%
                'failure_streak': 5
            },
            'tools': [
                'read_file',
                'search_files',
                'execute_command',
                'edit_file',
                'list_files'
            ]
        }

    def should_generate_report(self) -> bool:
        """Check if it's time to generate a report."""
        # Simple implementation - in real system, track last report time
        return True

    @property
    def monitoring_interval(self) -> int:
        return self.config.get('monitoring_interval', 300)

    @property
    def max_execution_time(self) -> int:
        return self.config.get('max_execution_time', 30)

    @property
    def error_threshold(self) -> float:
        return self.config.get('error_threshold', 0.1)

    @property
    def performance_degradation_threshold(self) -> float:
        return self.config.get('performance_degradation_threshold', 0.2)

    @property
    def report_interval(self) -> int:
        return self.config.get('report_interval', 3600)

    @property
    def alert_thresholds(self) -> Dict[str, Any]:
        return self.config.get('alert_thresholds', {})

    @property
    def tools(self) -> List[str]:
        return self.config.get('tools', [])

class ToolTracker:
    """Class for tracking tool usage."""

    def __init__(self):
        self.usage_stats: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self.execution_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def track_execution(self, tool_name: str, execution_func: Callable, *args, **kwargs) -> Any:
        """Track the execution of a tool."""
        start_time = time.time()
        success = True
        error_message = None

        try:
            result = execution_func(*args, **kwargs)
        except Exception as e:
            success = False
            error_message = str(e)
            logger.error(f"Tool {tool_name} failed: {e}")
            raise
        finally:
            execution_time = time.time() - start_time

            # Record execution
            execution_record = {
                'timestamp': datetime.now().isoformat(),
                'execution_time': execution_time,
                'success': success,
                'error_message': error_message
            }

            self.execution_history[tool_name].append(execution_record)

            # Update usage stats
            if tool_name not in self.usage_stats:
                self.usage_stats[tool_name] = {
                    'total_executions': 0,
                    'successful_executions': 0,
                    'failed_executions': 0,
                    'total_execution_time': 0,
                    'average_execution_time': 0,
                    'last_execution': None
                }

            stats = self.usage_stats[tool_name]
            stats['total_executions'] += 1
            stats['total_execution_time'] += execution_time
            stats['last_execution'] = execution_record['timestamp']

            if success:
                stats['successful_executions'] += 1
            else:
                stats['failed_executions'] += 1

            stats['average_execution_time'] = stats['total_execution_time'] / stats['total_executions']

            # Keep only recent history (last 1000 executions)
            if len(self.execution_history[tool_name]) > 1000:
                self.execution_history[tool_name].pop(0)

        return result

    def get_tool_stats(self, tool_name: str) -> Dict[str, Any]:
        """Get statistics for a specific tool."""
        return self.usage_stats.get(tool_name, {})

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all tools."""
        return dict(self.usage_stats)

class PerformanceMetrics:
    """Class for collecting performance metrics."""

    def __init__(self):
        self.metrics: Dict[str, Dict[str, Any]] = defaultdict(dict)

    def record_metric(self, tool_name: str, metric_name: str, value: Any):
        """Record a performance metric."""
        if tool_name not in self.metrics:
            self.metrics[tool_name] = {}

        if metric_name not in self.metrics[tool_name]:
            self.metrics[tool_name][metric_name] = []

        self.metrics[tool_name][metric_name].append({
            'value': value,
            'timestamp': datetime.now().isoformat()
        })

        # Keep only last 100 values
        if len(self.metrics[tool_name][metric_name]) > 100:
            self.metrics[tool_name][metric_name].pop(0)

    def get_metric_average(self, tool_name: str, metric_name: str, time_window: Optional[timedelta] = None) -> float:
        """Get average value for a metric."""
        if tool_name not in self.metrics or metric_name not in self.metrics[tool_name]:
            return 0.0

        values = self.metrics[tool_name][metric_name]

        if time_window:
            cutoff_time = datetime.now() - time_window
            values = [v for v in values if datetime.fromisoformat(v['timestamp']) > cutoff_time]

        if not values:
            return 0.0

        return sum(v['value'] for v in values) / len(values)

    def get_success_rate(self, tool_name: str, time_window: Optional[timedelta] = None) -> float:
        """Calculate success rate for a tool."""
        # This would need access to execution history from ToolTracker
        # For now, return a placeholder
        return 0.95  # Placeholder

class ErrorDetector:
    """Class for detecting error patterns."""

    def __init__(self):
        self.error_patterns: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    def record_error(self, tool_name: str, error_message: str):
        """Record an error for pattern detection."""
        # Simple pattern detection based on error message keywords
        pattern = self._extract_pattern(error_message)
        self.error_patterns[tool_name][pattern] += 1

    def get_common_errors(self, tool_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get most common error patterns for a tool."""
        if tool_name not in self.error_patterns:
            return []

        patterns = self.error_patterns[tool_name]
        sorted_patterns = sorted(patterns.items(), key=lambda x: x[1], reverse=True)

        return [
            {'pattern': pattern, 'count': count}
            for pattern, count in sorted_patterns[:limit]
        ]

    def _extract_pattern(self, error_message: str) -> str:
        """Extract a pattern from error message."""
        # Simple pattern extraction - in real system, use more sophisticated methods
        words = re.findall(r'\b\w+\b', error_message.lower())
        return ' '.join(words[:5])  # First 5 words as pattern

class HealthChecker:
    """Class for automated health checks."""

    def __init__(self):
        self.health_checks: Dict[str, Callable] = {}

    def register_health_check(self, tool_name: str, check_func: Callable):
        """Register a health check function for a tool."""
        self.health_checks[tool_name] = check_func

    def check_tool(self, tool_name: str) -> Dict[str, Any]:
        """Check health of a specific tool."""
        if tool_name not in self.health_checks:
            return {'healthy': True, 'message': f'No health check registered for {tool_name}'}

        try:
            result = self.health_checks[tool_name]()
            return {'healthy': result, 'message': f'Health check passed for {tool_name}'}
        except Exception as e:
            return {'healthy': False, 'message': f'Health check failed for {tool_name}: {e}'}

    def check_all_tools(self) -> Dict[str, Any]:
        """Check health of all registered tools."""
        results = {}
        all_healthy = True

        for tool_name in self.health_checks:
            result = self.check_tool(tool_name)
            results[tool_name] = result
            if not result['healthy']:
                all_healthy = False

        return {
            'healthy': all_healthy,
            'results': results
        }

class Reporter:
    """Class for generating performance reports."""

    def __init__(self, config: Config, tracker: ToolTracker, metrics: PerformanceMetrics, error_detector: ErrorDetector):
        self.config = config
        self.tracker = tracker
        self.metrics = metrics
        self.error_detector = error_detector

    def generate_report(self) -> Dict[str, Any]:
        """Generate a comprehensive performance report."""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {},
            'tool_details': {},
            'alerts': []
        }

        all_stats = self.tracker.get_all_stats()

        for tool_name, stats in all_stats.items():
            tool_report = {
                'usage_stats': stats,
                'performance_metrics': {},
                'error_patterns': self.error_detector.get_common_errors(tool_name),
                'health_status': 'unknown'  # Would need health checker integration
            }

            # Add performance metrics
            tool_report['performance_metrics'] = {
                'avg_execution_time': stats.get('average_execution_time', 0),
                'success_rate': stats.get('successful_executions', 0) / max(stats.get('total_executions', 1), 1),
                'total_executions': stats.get('total_executions', 0)
            }

            report['tool_details'][tool_name] = tool_report

            # Check for alerts
            alerts = self._check_alerts(tool_name, stats)
            report['alerts'].extend(alerts)

        report['summary'] = self._generate_summary(report)

        return report

    def save_report(self, report: Dict[str, Any], filename: Optional[str] = None):
        """Save report to file."""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'tool_performance_report_{timestamp}.json'

        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"Performance report saved to {filename}")

    def _generate_summary(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary statistics."""
        total_tools = len(report['tool_details'])
        total_executions = sum(
            tool['usage_stats'].get('total_executions', 0)
            for tool in report['tool_details'].values()
        )
        total_errors = sum(
            tool['usage_stats'].get('failed_executions', 0)
            for tool in report['tool_details'].values()
        )

        return {
            'total_tools': total_tools,
            'total_executions': total_executions,
            'overall_error_rate': total_errors / max(total_executions, 1),
            'alerts_count': len(report['alerts'])
        }

    def _check_alerts(self, tool_name: str, stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for alerts based on thresholds."""
        alerts = []

        # Check execution time
        avg_time = stats.get('average_execution_time', 0)
        if avg_time > self.config.alert_thresholds.get('execution_time', 60):
            alerts.append({
                'tool': tool_name,
                'type': 'execution_time',
                'message': f'Average execution time ({avg_time:.2f}s) exceeds threshold',
                'severity': 'warning'
            })

        # Check error rate
        error_rate = stats.get('failed_executions', 0) / max(stats.get('total_executions', 1), 1)
        if error_rate > self.config.alert_thresholds.get('error_rate', 0.15):
            alerts.append({
                'tool': tool_name,
                'type': 'error_rate',
                'message': f'Error rate ({error_rate:.2%}) exceeds threshold',
                'severity': 'error'
            })

        return alerts

# Example usage and testing
if __name__ == '__main__':
    # Create monitor instance
    monitor = ToolMonitor()

    # Example tool function
    def example_tool(delay: float = 0.1):
        time.sleep(delay)
        if delay > 1.0:
            raise ValueError("Tool execution too slow")
        return f"Tool executed with delay {delay}"

    # Test tracking
    try:
        result = monitor.track_tool_execution('example_tool', example_tool, 0.05)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {e}")

    # Generate report
    report = monitor.get_performance_report()
    print("Performance Report Generated")
    print(json.dumps(report, indent=2))
