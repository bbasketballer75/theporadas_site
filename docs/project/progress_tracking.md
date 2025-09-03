# Progress Tracking Methods

This document outlines standardized methods for tracking task progress and status updates. These methods integrate with the communication protocols in [`communication_protocol.md`](communication_protocol.md) and build on the quality assurance checklist in Section 7 of [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md).

## 1. Progress Tracking Frameworks

### Agile/Scrum Tracking:

- **Story Points**: Estimate task complexity (1, 2, 3, 5, 8, 13)
- **Sprint Burndown**: Track remaining work over sprint duration
- **Velocity**: Measure completed story points per sprint
- **Burndown Charts**: Visual representation of progress over time

### Kanban Tracking:

- **Work in Progress (WIP) Limits**: Maximum tasks in each column
- **Lead Time**: Time from task creation to completion
- **Cycle Time**: Time spent actively working on task
- **Throughput**: Number of tasks completed per time period

### Traditional Project Tracking:

- **Gantt Charts**: Timeline-based progress visualization
- **Critical Path Analysis**: Identify bottleneck tasks
- **Earned Value Management**: Compare planned vs actual progress
- **Milestone Tracking**: Key deliverable completion status

## 2. Task Status Categories

### Status Levels:

- **Not Started**: Task defined but work not begun
- **Planning**: Requirements gathering and design phase
- **In Progress**: Active development work
- **Review**: Code review or quality assurance
- **Testing**: Quality assurance and validation
- **Blocked**: Waiting on dependencies or clarification
- **Completed**: Task finished and delivered
- **Cancelled**: Task no longer needed

### Progress Indicators:

- 🟢 **On Track**: Progress meeting expectations
- 🟡 **At Risk**: Minor delays or issues
- 🟠 **Behind Schedule**: Significant delays
- 🔴 **Critical**: Major blockers or failures

## 3. Progress Measurement Methods

### Percentage Complete:

```
Task Progress Calculation:
- Simple Tasks: 0% → 100% (binary completion)
- Complex Tasks: Weighted subtasks (30% planning, 50% development, 20% testing)
- Feature Development: Story points completed / total story points
```

### Time-Based Tracking:

```
Time Tracking Metrics:
- Estimated Time: Initial time estimate
- Actual Time: Time spent so far
- Remaining Time: Estimated time to completion
- Variance: (Actual - Estimated) / Estimated
```

### Quality Metrics:

```
Quality Indicators:
- Test Coverage: Percentage of code covered by tests
- Bug Density: Bugs per lines of code
- Code Quality Score: Automated quality metrics
- Performance Benchmarks: Speed and efficiency metrics
```

## 4. Status Update Templates

### Daily Status Update:

```
**Daily Progress Update**

📅 **Date**: [Current date]
👤 **Team Member**: [Your name]
📊 **Overall Progress**: [X% complete]

**Today's Accomplishments:**
- [ ] Task 1: [Description] - [Status]
- [ ] Task 2: [Description] - [Status]

**Current Focus:**
- [ ] [Primary task being worked on]

**Tomorrow's Plan:**
- [ ] [Planned work for next day]

**Blockers/Issues:**
- [ ] [Any obstacles or dependencies needed]

**Risks/Concerns:**
- [ ] [Potential issues that could impact timeline]
```

### Weekly Status Report:

```
**Weekly Progress Report**

📅 **Week**: [Week dates]
👤 **Team Member**: [Your name]
🎯 **Goals Met**: [X of Y goals completed]

**Key Accomplishments:**
- [ ] [Major deliverable 1]
- [ ] [Major deliverable 2]

**Progress Metrics:**
- Tasks Completed: [X]
- Story Points Delivered: [X]
- Test Coverage: [X%]
- Bug Fix Rate: [X bugs/week]

**Upcoming Milestones:**
- [ ] [Milestone 1] - [Date]
- [ ] [Milestone 2] - [Date]

**Challenges Faced:**
- [ ] [Issue 1 and resolution]
- [ ] [Issue 2 and resolution]

**Next Week Priorities:**
- [ ] [Priority 1]
- [ ] [Priority 2]
```

### Project Milestone Update:

```
**Milestone Update**

🎯 **Milestone**: [Milestone name]
📊 **Status**: [On Track/At Risk/Delayed]
📅 **Due Date**: [Original due date]
⏱️ **Projected Completion**: [Actual completion date]

**Deliverables Completed:**
- [ ] [Deliverable 1] - [Status]
- [ ] [Deliverable 2] - [Status]

**Quality Metrics:**
- Test Results: [Pass/Fail rates]
- Code Review: [Approved/Pending]
- Documentation: [Complete/Incomplete]

**Dependencies Status:**
- [ ] [External dependency 1] - [Status]
- [ ] [External dependency 2] - [Status]

**Risk Assessment:**
- [ ] [Risk 1] - [Mitigation plan]
- [ ] [Risk 2] - [Mitigation plan]
```

## 5. Progress Visualization

### Progress Bar Format:

```
Task Progress: [██████████████░░░░░░░░] 60%

Subtasks:
✅ Planning Phase (100%)
🔄 Development Phase (60%)
⏳ Testing Phase (0%)
```

### Burnup Chart Template:

```
Burnup Chart Data:
Week 1: Planned: 20 | Actual: 18
Week 2: Planned: 40 | Actual: 35
Week 3: Planned: 60 | Actual: 52
Week 4: Planned: 80 | Actual: 75
```

### Velocity Tracking:

```
Sprint Velocity History:
Sprint 1: 25 points
Sprint 2: 28 points
Sprint 3: 22 points
Sprint 4: 30 points
Average: 26.25 points
```

## 6. Risk and Issue Tracking

### Risk Register Template:

```
**Risk Register**

| Risk ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---------|-------------|-------------|--------|------------|-------|--------|
| RISK-001 | [Description] | High/Med/Low | High/Med/Low | [Plan] | [Owner] | Open/Mitigated/Closed |
```

### Issue Tracking Format:

```
**Issue Log**

| Issue ID | Description | Priority | Status | Assigned To | Due Date | Resolution |
|----------|-------------|----------|--------|-------------|----------|------------|
| ISS-001 | [Description] | Critical/High/Med/Low | Open/In Progress/Resolved | [Assignee] | [Date] | [Solution] |
```

## 7. Performance Metrics

### Individual Performance Metrics:

- **Task Completion Rate**: Tasks completed on time / total tasks
- **Code Quality Score**: Average from code reviews
- **Estimation Accuracy**: Actual time / estimated time
- **Bug Introduction Rate**: Bugs found post-release / lines of code

### Team Performance Metrics:

- **Sprint Goal Success Rate**: Successful sprints / total sprints
- **Lead Time**: Average time from task creation to completion
- **Deployment Frequency**: Number of deployments per week
- **Change Failure Rate**: Failed deployments / total deployments

### Project Metrics:

- **Schedule Variance**: (Actual progress - Planned progress) / Planned progress
- **Budget Variance**: (Actual cost - Budget) / Budget
- **Quality Index**: Combination of defect rates and customer satisfaction
- **Scope Creep**: Additional requirements / original requirements

## 8. Reporting Cadence

### Daily Reporting:

- **Standup Meetings**: 15-minute daily sync
- **Progress Updates**: Brief status in team chat
- **Blocker Alerts**: Immediate notification of issues

### Weekly Reporting:

- **Status Reports**: Comprehensive weekly updates
- **Burndown Charts**: Sprint progress visualization
- **Risk Reviews**: Weekly risk assessment updates

### Monthly Reporting:

- **Performance Reviews**: Monthly team performance analysis
- **Trend Analysis**: Long-term progress trends
- **Forecasting**: Project completion predictions

## 9. Tool Integration

### Progress Tracking Tools:

- **Jira/Trello**: Task management and progress visualization
- **GitHub Projects**: Issue tracking and milestone management
- **Azure DevOps**: Comprehensive project tracking
- **Monday.com**: Visual project management
- **Asana**: Task assignment and progress tracking

### Automated Tracking:

- **Git Hooks**: Automatic progress updates on commits
- **CI/CD Pipelines**: Automated testing and deployment tracking
- **Code Quality Tools**: Automated code analysis and metrics
- **Time Tracking**: Automatic time logging integration

## 10. Progress Tracking Best Practices

### Data Collection:

- **Consistent Measurement**: Use same metrics across all tasks
- **Automated Collection**: Leverage tools for automatic data gathering
- **Real-time Updates**: Keep progress data current
- **Historical Tracking**: Maintain progress history for analysis

### Communication:

- **Transparent Reporting**: Share progress openly with stakeholders
- **Proactive Updates**: Report issues before they become critical
- **Contextual Information**: Provide background and implications
- **Actionable Insights**: Include recommendations for improvement

### Analysis and Improvement:

- **Trend Identification**: Analyze progress patterns over time
- **Bottleneck Analysis**: Identify and address workflow bottlenecks
- **Process Optimization**: Continuously improve tracking methods
- **Lesson Learned**: Document insights for future projects

## 11. Integration with Workflow Guide

### Reference Sections:

- **Task Breakdown**: Section 2 for milestone-based tracking
- **Communication Guidelines**: Section 1 for status update formats
- **Quality Assurance**: Section 7 for completion verification
- **Tool Usage Patterns**: Section 6 for tracking tool integration

### Workflow Integration:

1. **Planning Phase**: Establish tracking methods and baselines
2. **Execution Phase**: Regular progress updates using defined formats
3. **Monitoring Phase**: Continuous tracking against milestones
4. **Reporting Phase**: Regular status reports to stakeholders
5. **Closure Phase**: Final progress analysis and documentation

---

**Note**: Progress tracking methods should be adapted to project size and team preferences. Use the `update_todo_list` tool for complex tasks requiring detailed progress tracking as outlined in [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md).</target_file>
