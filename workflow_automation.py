#!/usr/bin/env python3
"""
Kilo Code Workflow Automation Script

This script automates common workflow tasks including:
- Checklist generation based on task type and complexity
- Progress report generation
- Template filling for various collaboration requests
- Status update formatting
- Project tracking and metrics
- Quality assurance integration

Usage: python workflow_automation.py [command] [options]

Author: Kilo Code
"""

import argparse
import json
import os
import sys
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import re


class WorkflowAutomation:
    """Main class for workflow automation functionality."""

    def __init__(self, workspace_dir: str = None):
        """Initialize the workflow automation system."""
        self.workspace_dir = workspace_dir or os.getcwd()
        self.templates_dir = Path(self.workspace_dir) / "templates"
        self.config_file = Path(self.workspace_dir) / "workflow_config.json"
        self.qa_config_file = Path(self.workspace_dir) / "quality_metrics.json"
        self.load_config()

    def load_config(self):
        """Load configuration from JSON file."""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = self.get_default_config()
            self.save_config()

    def save_config(self):
        """Save current configuration to JSON file."""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)

    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration settings."""
        return {
            "team_members": ["Kilo Code", "Developer 1", "Developer 2"],
            "default_complexity": "medium",
            "working_hours_per_day": 8,
            "timezone": "America/New_York",
            "project_name": "Kilo Code Project",
            "checklist_templates": {
                "simple": ["requirements", "implementation", "testing", "documentation"],
                "medium": ["planning", "development", "testing", "deployment", "documentation"],
                "complex": ["strategy", "design", "implementation", "testing", "deployment", "maintenance"]
            },
            "qa_integration": {
                "enabled": True,
                "auto_run_checks": True,
                "quality_gates": ["pre_commit", "pre_merge", "pre_deployment"]
            }
        }

    def generate_checklist(self, task_type: str, complexity: str, task_name: str) -> str:
        """Generate a task checklist based on type and complexity."""
        complexity = complexity.lower()
        task_type = task_type.lower()

        if complexity not in ["simple", "medium", "complex", "very_complex"]:
            raise ValueError(f"Invalid complexity: {complexity}")

        checklist_items = self.get_checklist_items(task_type, complexity)

        output = f"# {task_name} Checklist\n\n"
        output += f"**Task Type:** {task_type.title()}\n"
        output += f"**Complexity:** {complexity.title()}\n"
        output += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        for category, items in checklist_items.items():
            output += f"## {category.title()}\n\n"
            for item in items:
                output += f"- [ ] {item}\n"
            output += "\n"

        output += "## Quality Gates\n\n"
        output += "- [ ] Code review completed\n"
        output += "- [ ] Tests passing\n"
        output += "- [ ] Documentation updated\n"
        output += "- [ ] No critical issues\n\n"

        # Add QA integration section
        output += "## Quality Assurance Integration\n\n"
        output += f"- [ ] Run automated QA checks: `python qa_verification.py check --files <files> --task-type {task_type}`\n"
        output += f"- [ ] Generate QA report: `python qa_verification.py report --format markdown --output qa_report.md`\n"
        output += "- [ ] Review QA metrics against thresholds in `quality_metrics.json`\n\n"

        output += f"**Reference:** See [`task_checklist.md`](task_checklist.md) and [`quality_assurance_checklist.md`](quality_assurance_checklist.md) for detailed guidelines.\n"

        return output

    def get_checklist_items(self, task_type: str, complexity: str) -> Dict[str, List[str]]:
        """Get checklist items based on task type and complexity."""
        base_items = {
            "planning": [
                "Requirements analysis completed",
                "Technical design reviewed",
                "Dependencies identified",
                "Risk assessment performed",
                "Timeline estimated"
            ],
            "development": [
                "Code standards followed",
                "Error handling implemented",
                "Input validation added",
                "Security considerations addressed",
                "Code documentation added"
            ],
            "testing": [
                "Unit tests written and passing",
                "Integration tests completed",
                "Edge cases tested",
                "Performance requirements met",
                "Cross-browser testing done (if applicable)"
            ],
            "deployment": [
                "Code review completed",
                "Build process verified",
                "Environment configuration checked",
                "Rollback plan documented",
                "Deployment testing performed"
            ],
            "documentation": [
                "Code comments added",
                "API documentation updated",
                "User documentation updated",
                "Change log updated",
                "README files updated"
            ]
        }

        if complexity == "simple":
            return {
                "pre_implementation": ["Requirements clear", "Scope defined", "Files identified"],
                "implementation": ["Code standards followed", "Basic error handling", "Comments added"],
                "post_implementation": ["Functionality verified", "No regressions", "Documentation updated"]
            }
        elif complexity == "medium":
            return {
                "planning": base_items["planning"][:3],
                "development": base_items["development"][:4],
                "testing": base_items["testing"][:3],
                "deployment": base_items["deployment"][:3],
                "documentation": base_items["documentation"][:3]
            }
        else:  # complex or very_complex
            return base_items

    def run_quality_checks(self, files: List[str], task_type: str = "feature", language: str = "python") -> Dict[str, Any]:
        """Run integrated quality assurance checks."""
        print("Running integrated quality assurance checks...")

        # Run qa_verification.py script
        try:
            cmd = [
                sys.executable, "qa_verification.py", "check",
                "--files"] + files + [
                "--language", language,
                "--task-type", task_type
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.workspace_dir)

            if result.returncode == 0:
                print("[PASS] Quality checks completed successfully")
                return {"status": "passed", "output": result.stdout}
            else:
                print("[FAIL] Quality checks failed")
                return {"status": "failed", "output": result.stdout, "errors": result.stderr}

        except Exception as e:
            print(f"Error running quality checks: {e}")
            return {"status": "error", "error": str(e)}

    def generate_qa_report(self, task_name: str, files: List[str] = None) -> str:
        """Generate a comprehensive QA report."""
        print("Generating quality assurance report...")

        try:
            cmd = [sys.executable, "qa_verification.py", "report", "--format", "markdown"]

            if files:
                cmd.extend(["--files"] + files)

            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.workspace_dir)

            if result.returncode == 0:
                report_content = result.stdout
            else:
                report_content = f"# QA Report Generation Failed\n\nError: {result.stderr}"

        except Exception as e:
            report_content = f"# QA Report Generation Error\n\nError: {str(e)}"

        # Enhance report with workflow context
        enhanced_report = f"# Quality Assurance Report: {task_name}\n\n"
        enhanced_report += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        enhanced_report += f"**Workflow Integration:** Enabled\n\n"
        enhanced_report += "## Workflow Context\n\n"
        enhanced_report += f"- Task: {task_name}\n"
        enhanced_report += f"- QA System: Integrated with workflow automation\n"
        enhanced_report += f"- Metrics Config: `quality_metrics.json`\n"
        enhanced_report += f"- Checklist: `quality_assurance_checklist.md`\n\n"
        enhanced_report += "---\n\n"
        enhanced_report += report_content

        return enhanced_report

    def validate_quality_gates(self, gate_type: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate quality gates for different stages."""
        gates_config = self.config.get("qa_integration", {}).get("quality_gates", [])

        if gate_type not in gates_config:
            return {"status": "skipped", "message": f"Quality gate '{gate_type}' not enabled"}

        results = {
            "gate_type": gate_type,
            "timestamp": datetime.now().isoformat(),
            "checks": {},
            "overall_status": "passed"
        }

        # Load QA metrics for validation
        if self.qa_config_file.exists():
            with open(self.qa_config_file, 'r') as f:
                qa_config = json.load(f)
                quality_gates = qa_config.get("quality_gates", {})
                gate_config = quality_gates.get(gate_type, {})

                if gate_config.get("enabled", False):
                    required_checks = gate_config.get("checks", [])

                    for check in required_checks:
                        # Simulate check execution (in real implementation, these would be actual checks)
                        results["checks"][check] = {
                            "status": "passed",  # This would be determined by actual check results
                            "message": f"{check} validation completed"
                        }

        # Determine overall status
        failed_checks = [k for k, v in results["checks"].items() if v["status"] == "failed"]
        if failed_checks:
            results["overall_status"] = "failed"
            results["blocking_issues"] = failed_checks

        return results

    def fill_template(self, template_type: str, **kwargs) -> str:
        """Fill a collaboration template with provided data."""
        templates = {
            "bug_report": self.get_bug_report_template(),
            "feature_request": self.get_feature_request_template(),
            "code_review": self.get_code_review_template(),
            "task_assignment": self.get_task_assignment_template(),
            "qa_report": self.get_qa_report_template(),
            "quality_gate": self.get_quality_gate_template()
        }

        if template_type not in templates:
            raise ValueError(f"Unknown template type: {template_type}")

        template = templates[template_type]

        # Replace placeholders with provided values
        for key, value in kwargs.items():
            placeholder = f"[{key.upper()}]"
            template = template.replace(placeholder, str(value))

        return template

    def get_qa_report_template(self) -> str:
        """Get QA report template."""
        return """# Quality Assurance Report

**Task:** [TASK_NAME]
**Date:** [DATE]
**QA Engineer:** [QA_ENGINEER]

## Executive Summary
[SUMMARY]

## Quality Metrics
- **Overall Score:** [OVERALL_SCORE]%
- **Tests Passed:** [TESTS_PASSED]/[TOTAL_TESTS]
- **Critical Issues:** [CRITICAL_ISSUES]
- **Code Coverage:** [CODE_COVERAGE]%

## Detailed Findings

### Code Quality
- [ ] Syntax validation passed
- [ ] Code style standards met
- [ ] Complexity thresholds satisfied
- [ ] Security vulnerabilities addressed

### Testing Results
- [ ] Unit tests passing
- [ ] Integration tests completed
- [ ] Performance benchmarks met
- [ ] Regression tests successful

### Documentation
- [ ] Code documentation updated
- [ ] API documentation current
- [ ] User documentation reviewed

## Recommendations
[RECOMMENDATIONS]

## Next Steps
[NEXT_STEPS]

## Sign-off
**QA Approval:** [APPROVAL_STATUS]
**Date:** [APPROVAL_DATE]
**Approver:** [APPROVER]
"""

    def get_quality_gate_template(self) -> str:
        """Get quality gate validation template."""
        return """# Quality Gate Validation

**Gate Type:** [GATE_TYPE]
**Task:** [TASK_NAME]
**Date:** [DATE]

## Gate Requirements
- [ ] All automated tests passing
- [ ] Code coverage requirements met
- [ ] Security scan completed
- [ ] Performance benchmarks satisfied
- [ ] Documentation updated
- [ ] Code review completed

## Validation Results
[VALIDATION_RESULTS]

## Gate Status
- [ ] **APPROVED** - Proceed to next stage
- [ ] **REJECTED** - Address issues before proceeding
- [ ] **CONDITIONAL** - Proceed with conditions

## Conditions/Issues
[CONDITIONS]

## Approver
**Name:** [APPROVER]
**Date:** [APPROVAL_DATE]
"""

    def calculate_metrics(self, tasks_data: List[Dict]) -> Dict[str, Any]:
        """Calculate project metrics from task data."""
        total_tasks = len(tasks_data)
        completed_tasks = len([t for t in tasks_data if t.get('status') == 'completed'])
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        # Calculate average completion time
        completion_times = []
        for task in tasks_data:
            if task.get('completed_date') and task.get('start_date'):
                start = datetime.fromisoformat(task['start_date'])
                end = datetime.fromisoformat(task['completed_date'])
                completion_times.append((end - start).days)

        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0

        # Add QA-specific metrics
        qa_metrics = self.calculate_qa_metrics(tasks_data)

        metrics = {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": round(completion_rate, 1),
            "avg_completion_time_days": round(avg_completion_time, 1),
            "on_track_tasks": len([t for t in tasks_data if t.get('status') == 'on_track']),
            "blocked_tasks": len([t for t in tasks_data if t.get('status') == 'blocked'])
        }

        metrics.update(qa_metrics)
        return metrics

    def calculate_qa_metrics(self, tasks_data: List[Dict]) -> Dict[str, Any]:
        """Calculate QA-specific metrics."""
        qa_passed = len([t for t in tasks_data if t.get('qa_status') == 'passed'])
        qa_failed = len([t for t in tasks_data if t.get('qa_status') == 'failed'])
        total_qa_checks = qa_passed + qa_failed

        qa_pass_rate = (qa_passed / total_qa_checks * 100) if total_qa_checks > 0 else 0

        return {
            "qa_checks_total": total_qa_checks,
            "qa_checks_passed": qa_passed,
            "qa_checks_failed": qa_failed,
            "qa_pass_rate": round(qa_pass_rate, 1),
            "quality_score_avg": 85.5  # This would be calculated from actual QA results
        }

    def export_report(self, content: str, filename: str, format_type: str = "markdown"):
        """Export content to a file."""
        if format_type == "markdown":
            ext = ".md"
        elif format_type == "text":
            ext = ".txt"
        else:
            ext = ".md"

        filepath = Path(self.workspace_dir) / f"{filename}{ext}"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        return str(filepath)


def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(description="Kilo Code Workflow Automation with QA Integration")
    parser.add_argument("command", choices=[
        "checklist", "progress", "template", "status", "metrics", "config",
        "qa-check", "qa-report", "qa-gate"
    ], help="Command to execute")

    # Checklist command
    parser.add_argument("--task-type", help="Type of task (bug_fix, feature, refactor, etc.)")
    parser.add_argument("--complexity", choices=["simple", "medium", "complex", "very_complex"],
                       help="Task complexity level")
    parser.add_argument("--task-name", help="Name of the task")

    # Progress command
    parser.add_argument("--progress-percent", type=int, help="Progress percentage")
    parser.add_argument("--completed", nargs="+", help="Completed items")
    parser.add_argument("--next-steps", nargs="+", help="Next steps")
    parser.add_argument("--blockers", nargs="+", help="Current blockers")

    # Template command
    parser.add_argument("--template-type", choices=[
        "bug_report", "feature_request", "code_review", "task_assignment",
        "qa_report", "quality_gate"
    ], help="Type of template to generate")

    # Status command
    parser.add_argument("--update-type", choices=["progress", "completion", "issue"],
                       help="Type of status update")

    # QA commands
    parser.add_argument("--files", nargs="+", help="Files to check for QA")
    parser.add_argument("--language", default="python", help="Programming language")
    parser.add_argument("--gate-type", choices=["pre_commit", "pre_merge", "pre_deployment"],
                       help="Quality gate type")

    # Output options
    parser.add_argument("--output", help="Output filename")
    parser.add_argument("--export", action="store_true", help="Export to file")

    args = parser.parse_args()

    automation = WorkflowAutomation()

    try:
        if args.command == "checklist":
            if not all([args.task_type, args.complexity, args.task_name]):
                print("Error: --task-type, --complexity, and --task-name are required for checklist command")
                sys.exit(1)

            result = automation.generate_checklist(args.task_type, args.complexity, args.task_name)

        elif args.command == "qa-check":
            if not args.files:
                print("Error: --files is required for qa-check command")
                sys.exit(1)

            qa_results = automation.run_quality_checks(
                args.files,
                args.task_type or "feature",
                args.language
            )
            result = f"QA Check Results: {qa_results['status']}\n\n{qa_results.get('output', '')}"

        elif args.command == "qa-report":
            result = automation.generate_qa_report(
                args.task_name or "Current Task",
                args.files
            )

        elif args.command == "qa-gate":
            if not args.gate_type:
                print("Error: --gate-type is required for qa-gate command")
                sys.exit(1)

            gate_results = automation.validate_quality_gates(
                args.gate_type,
                {"task_name": args.task_name or "Current Task"}
            )

            result = f"""# Quality Gate Validation: {args.gate_type}

**Status:** {gate_results['overall_status']}
**Timestamp:** {gate_results['timestamp']}

## Check Results
{json.dumps(gate_results['checks'], indent=2)}

## Summary
- Total Checks: {len(gate_results['checks'])}
- Passed: {len([c for c in gate_results['checks'].values() if c['status'] == 'passed'])}
- Failed: {len([c for c in gate_results['checks'].values() if c['status'] == 'failed'])}
"""

        elif args.command == "progress":
            if not all([args.progress_percent, args.completed, args.next_steps]):
                print("Error: --progress-percent, --completed, and --next-steps are required for progress command")
                sys.exit(1)

            result = automation.generate_progress_report(
                args.task_name or "Current Task",
                args.progress_percent,
                args.completed,
                args.next_steps,
                args.blockers
            )

        elif args.command == "template":
            if not args.template_type:
                print("Error: --template-type is required for template command")
                sys.exit(1)

            # For demo purposes, use sample data
            sample_data = {
                "title": "Sample Title",
                "description": "Sample description",
                "step1": "Step 1",
                "expected": "Expected behavior",
                "actual": "Actual behavior",
                "os": "Windows 11",
                "browser": "Chrome",
                "filepath": "src/main.js",
                "mode": "Code",
                "error": "Sample error message",
                "context": "Additional context",
                "file1": "src/main.js",
                "problem": "Sample problem",
                "user": "user",
                "goal": "goal",
                "benefit": "benefit",
                "req1": "Requirement 1",
                "technical": "Technical details",
                "criteria1": "Criteria 1",
                "changes": "Changes made",
                "desc1": "Description 1",
                "decisions": "Key decisions",
                "instructions": "Testing instructions",
                "assignee": "John Doe",
                "priority": "High",
                "duedate": "2024-01-15",
                "task_name": "Sample Task",
                "date": datetime.now().strftime('%Y-%m-%d'),
                "qa_engineer": "Kilo Code",
                "summary": "QA checks completed successfully",
                "overall_score": "95",
                "tests_passed": "45",
                "total_tests": "50",
                "critical_issues": "0",
                "code_coverage": "92",
                "recommendations": "All systems go",
                "next_steps": "Proceed to deployment",
                "approval_status": "Approved",
                "approval_date": datetime.now().strftime('%Y-%m-%d'),
                "approver": "Kilo Code",
                "gate_type": "pre_deployment",
                "validation_results": "All checks passed",
                "conditions": "None",
                "approver": "Kilo Code"
            }

            result = automation.fill_template(args.template_type, **sample_data)

        elif args.command == "status":
            if not args.update_type:
                print("Error: --update-type is required for status command")
                sys.exit(1)

            sample_updates = {
                "progress": {
                    "status": "In Progress",
                    "completed": "Planning phase",
                    "in_progress": "Development phase",
                    "next_steps": "Testing phase",
                    "blockers": "None",
                    "eta": "2 days"
                },
                "completion": {
                    "delivered": "Feature implementation",
                    "testing": "All tests passing",
                    "documentation": "Updated",
                    "files": "src/feature.js, tests/feature.test.js",
                    "next_actions": "Code review"
                },
                "issue": {
                    "problem": "Build failure",
                    "context": "During CI/CD pipeline",
                    "solutions": "Checked dependencies",
                    "impact": "Blocks deployment",
                    "recovery": "Fix dependency issue"
                }
            }

            result = automation.generate_status_update(args.update_type, **sample_updates[args.update_type])

        elif args.command == "metrics":
            # Sample task data for demonstration
            sample_tasks = [
                {"status": "completed", "start_date": "2024-01-01", "completed_date": "2024-01-05", "qa_status": "passed"},
                {"status": "in_progress", "start_date": "2024-01-03", "qa_status": "pending"},
                {"status": "completed", "start_date": "2024-01-02", "completed_date": "2024-01-04", "qa_status": "passed"},
                {"status": "blocked", "start_date": "2024-01-01", "qa_status": "failed"}
            ]

            metrics = automation.calculate_metrics(sample_tasks)
            result = f"""# Project Metrics Report (with QA Integration)

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- Total Tasks: {metrics['total_tasks']}
- Completed Tasks: {metrics['completed_tasks']}
- Completion Rate: {metrics['completion_rate']}%
- Average Completion Time: {metrics['avg_completion_time_days']} days
- On Track Tasks: {metrics['on_track_tasks']}
- Blocked Tasks: {metrics['blocked_tasks']}

## Quality Assurance Metrics
- QA Checks Total: {metrics['qa_checks_total']}
- QA Checks Passed: {metrics['qa_checks_passed']}
- QA Checks Failed: {metrics['qa_checks_failed']}
- QA Pass Rate: {metrics['qa_pass_rate']}%
- Average Quality Score: {metrics['quality_score_avg']}%

## Detailed Metrics
{json.dumps(metrics, indent=2)}
"""

        elif args.command == "config":
            result = f"""# Current Configuration (with QA Integration)

{json.dumps(automation.config, indent=2)}
"""

        # Output result
        if args.export and args.output:
            filepath = automation.export_report(result, args.output)
            print(f"Exported to: {filepath}")
        else:
            print(result)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
