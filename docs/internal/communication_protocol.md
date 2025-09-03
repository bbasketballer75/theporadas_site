# Communication Protocol

This document establishes standardized communication patterns and response formats for efficient collaboration. These protocols build on the communication guidelines in Section 1 of [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md).

## 1. Response Format Standards

### Task Acknowledgment Format:

```
**Task Acknowledged**

✅ **Understood**: [Brief summary of what was requested]
📋 **Approach**: [High-level approach or mode to be used]
⏱️ **Timeline**: [Estimated completion time or next milestone]
🔍 **Clarification Needed**: [Any questions or missing information]

[If proceeding immediately, provide initial progress update]
```

### Progress Update Format:

```
**Progress Update**

📊 **Status**: [Current completion percentage or phase]
✅ **Completed**: [What was just finished]
🔄 **In Progress**: [What's currently being worked on]
🎯 **Next Steps**: [What's planned next]
⚠️ **Blockers**: [Any issues or dependencies needed]
⏱️ **ETA**: [Updated timeline estimate]
```

### Completion Confirmation Format:

```
**Task Completed**

✅ **Delivered**: [What was accomplished]
🧪 **Testing**: [Testing performed and results]
📚 **Documentation**: [Documentation updated or created]
🔗 **Files Modified**: [List of affected files with brief descriptions]
🎯 **Next Actions**: [Any follow-up tasks or recommendations]

[Provide summary of work completed]
```

### Error/Issue Reporting Format:

```
**Issue Encountered**

❌ **Problem**: [Clear description of the issue]
🔍 **Context**: [When and where the issue occurred]
🔧 **Attempted Solutions**: [What was tried to resolve it]
📋 **Impact**: [How this affects the current task]
🔄 **Recovery Plan**: [Steps to resolve or work around]

[Request guidance if needed]
```

## 2. Communication Patterns

### Daily Standup Pattern:

```
**Daily Standup**

Yesterday: [What was completed]
Today: [What's planned for today]
Blockers: [Any obstacles or dependencies needed]
```

### Weekly Summary Pattern:

```
**Weekly Summary**

📈 **Accomplishments**: [Key deliverables completed]
🎯 **Goals**: [Progress toward weekly objectives]
🔄 **Ongoing**: [Work in progress]
⚠️ **Challenges**: [Issues encountered and resolutions]
🎯 **Next Week**: [Priorities for upcoming week]
```

### Code Review Communication Pattern:

```
**Code Review Feedback**

👍 **Strengths**: [What works well]
🔧 **Suggestions**: [Recommended improvements]
❓ **Questions**: [Areas needing clarification]
🚫 **Blockers**: [Must-fix issues before merge]
```

## 3. Status Indicators

### Task Status Codes:

- 🟢 **Ready**: Task is ready to begin
- 🟡 **In Progress**: Actively working on task
- 🟠 **Blocked**: Waiting on dependencies or clarification
- 🔴 **At Risk**: Timeline or quality at risk
- ✅ **Completed**: Task successfully finished
- ❌ **Failed**: Task encountered unresolvable issues

### Priority Levels:

- 🔥 **Critical**: Immediate attention required
- ⚡ **High**: Should be addressed soon
- 📋 **Medium**: Standard priority
- 📝 **Low**: Can be addressed when time permits

## 4. Response Time Expectations

### Communication Response Times:

- **Critical Issues**: Response within 1 hour during business hours
- **High Priority**: Response within 4 hours
- **Medium Priority**: Response within 24 hours
- **Low Priority**: Response within 48 hours

### Task Update Frequency:

- **Simple Tasks**: Update upon completion
- **Medium Tasks**: Daily updates or major milestone completion
- **Complex Tasks**: Daily standup updates
- **Blocked Tasks**: Immediate notification of blockers

## 5. Error Communication Protocol

### Error Severity Levels:

1. **Critical**: System down, data loss, security breach
2. **High**: Major functionality broken, user impact
3. **Medium**: Minor functionality issues, workarounds available
4. **Low**: Cosmetic issues, minor inconveniences

### Error Reporting Template:

```
**Error Report**

🚨 **Severity**: [Critical/High/Medium/Low]
📍 **Location**: [File path and line number]
💥 **Error**: [Error message or description]
🔄 **Reproduction**: [Steps to reproduce]
🔧 **Environment**: [System, browser, version info]
📊 **Impact**: [Users affected, business impact]
🔍 **Investigation**: [Initial findings]
```

### Error Resolution Communication:

```
**Error Resolution Update**

✅ **Status**: [Resolved/In Progress/Investigating]
🔧 **Root Cause**: [What caused the error]
🛠️ **Solution**: [How it was fixed]
🧪 **Testing**: [Verification steps performed]
📚 **Prevention**: [Measures to prevent recurrence]
```

## 6. Progress Tracking Communication

### Milestone Achievement Format:

```
**Milestone Reached**

🎯 **Milestone**: [Milestone name or description]
✅ **Deliverables**: [What was delivered]
📊 **Progress**: [Overall project progress percentage]
⏱️ **Timeline**: [On track, ahead, or behind schedule]
🎯 **Next Milestone**: [What's coming next]
```

### Scope Change Communication:

```
**Scope Change Request**

📋 **Current Scope**: [What's currently planned]
🔄 **Proposed Change**: [What change is requested]
📈 **Impact**: [Effect on timeline, resources, quality]
✅ **Benefits**: [Why this change is needed]
🤝 **Approval**: [Who needs to approve this change]
```

## 7. Collaboration Best Practices

### Request Clarification Pattern:

```
**Clarification Needed**

❓ **Question**: [Specific question about requirements]
📋 **Context**: [Why clarification is needed]
⏱️ **Impact**: [How this affects timeline or approach]
💡 **Suggestions**: [Possible interpretations or options]
```

### Provide Context Pattern:

```
**Context Provided**

📚 **Background**: [Relevant background information]
🔗 **Related Work**: [Links to related tasks or documentation]
📋 **Constraints**: [Any limitations or requirements]
🎯 **Goals**: [What success looks like]
```

### Handover Communication Pattern:

```
**Task Handover**

📋 **Current Status**: [What's been completed]
🔄 **In Progress**: [What's currently being worked on]
🎯 **Next Steps**: [What needs to be done next]
⚠️ **Known Issues**: [Any problems or considerations]
📚 **Documentation**: [Where to find relevant docs]
```

## 8. Tool Integration Communication

### Mode Switching Communication:

```
**Mode Switch**

🔄 **Switching to**: [New mode: Code/Debug/Architect/Ask/etc.]
🎯 **Reason**: [Why this mode is needed]
📋 **Expected Outcome**: [What will be accomplished]
⏱️ **Duration**: [How long this mode will be used]
```

### Tool Usage Updates:

```
**Tool Execution**

🛠️ **Tool Used**: [Which tool was executed]
📝 **Command/Input**: [What was provided to the tool]
📊 **Result**: [Outcome or key findings]
🎯 **Next Action**: [How this informs next steps]
```

## 9. Emergency Communication Protocol

### Emergency Notification Format:

```
🚨 **EMERGENCY**

⚠️ **Issue**: [Critical problem description]
📍 **Location**: [Where the issue is occurring]
👥 **Impact**: [Who/what is affected]
⏱️ **Urgency**: [Immediate action required]
📞 **Contact**: [Who to contact for immediate assistance]
```

### Emergency Response Format:

```
**Emergency Response**

🚨 **Acknowledged**: [Confirmation of emergency receipt]
👥 **Team Notified**: [Who has been alerted]
🔧 **Initial Assessment**: [Preliminary findings]
📋 **Action Plan**: [Immediate steps being taken]
⏱️ **ETA Update**: [When resolution is expected]
```

## 10. Documentation and Training

### Communication Training Checklist:

- [ ] Understand all response formats
- [ ] Know when to use each communication pattern
- [ ] Familiar with status indicators and codes
- [ ] Know response time expectations
- [ ] Understand error reporting procedures
- [ ] Know emergency communication protocols

### Documentation Updates:

- [ ] Update this protocol when new patterns are established
- [ ] Document communication lessons learned from projects
- [ ] Maintain examples of effective communication
- [ ] Review and update response time expectations regularly

## 11. Integration with Workflow Guide

### Reference Sections:

- **Communication Guidelines**: Section 1 for general communication best practices
- **Task Breakdown**: Section 2 for complex task communication
- **Mode Selection**: Section 3 for mode-specific communication
- **Error Handling**: Section 4 for error communication patterns
- **Quality Assurance**: Section 7 for completion communication

### Workflow Integration Points:

1. **Task Initiation**: Use acknowledgment format
2. **Progress Updates**: Use progress update format
3. **Task Completion**: Use completion confirmation format
4. **Issues**: Use error/issue reporting format
5. **Reviews**: Use code review communication pattern

---

**Note**: These communication protocols should be adapted to team preferences and project requirements while maintaining consistency. Always prioritize clear, actionable communication as outlined in [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md).</target_file>
