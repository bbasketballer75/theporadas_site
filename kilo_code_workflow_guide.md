# Kilo Code Workflow Guide

This document provides comprehensive instructions, rules, and workflows for effective collaboration with Kilo Code. Follow these guidelines to ensure clear communication, efficient task completion, and high-quality results.

## 1. Communication Guidelines

### How to Provide Clear, Actionable Requests

- **Be Specific**: Clearly state what you want to accomplish. Avoid vague requests like "fix the code" - instead say "fix the null pointer exception in the login function on line 45 of auth.js".

- **Include Context**: Provide relevant background information, such as the purpose of the task, expected outcomes, and any constraints.

- **Specify Details**: Include file paths, programming languages, frameworks, and specific requirements. For example: "Create a React component in src/components/UserProfile.jsx that displays user data from the API endpoint /api/users/{id}".

- **Use Examples**: When possible, provide examples of desired input/output or reference similar implementations.

- **Prioritize Information**: List requirements in order of importance, and indicate any must-have vs. nice-to-have features.

- **Avoid Ambiguity**: Use precise language. Instead of "make it better", specify "optimize the database query to reduce execution time by 50%".

## 2. Task Breakdown Best Practices

### When and How to Break Down Complex Tasks

- **Identify Complexity**: Break down tasks that involve multiple steps, files, or technologies. Use the `update_todo_list` tool for tasks with 3+ distinct steps.

- **Logical Sequencing**: Order tasks by dependency - complete foundational work before dependent features.

- **Milestone Approach**: Divide large tasks into manageable milestones with clear deliverables.

- **Iterative Refinement**: Start with core functionality, then add enhancements. Test each iteration before proceeding.

- **Resource Assessment**: Consider available tools and time constraints when breaking down tasks.

### Example Task Breakdown:
```
1. Analyze existing code structure
2. Design new feature architecture  
3. Implement core functionality
4. Add error handling
5. Write unit tests
6. Update documentation
```

## 3. Mode Selection Guide

### When to Use Each Mode

- **Code Mode**: Use for writing, modifying, or refactoring code. Best for implementing features, fixing bugs, creating new files, or making code improvements. Default mode for most development tasks.

- **Debug Mode**: Use when troubleshooting issues, investigating errors, or diagnosing problems. Specialized in systematic debugging, adding logging, analyzing stack traces, and identifying root causes.

- **Architect Mode**: Use for planning, designing, or strategizing before implementation. Perfect for breaking down complex problems, creating technical specifications, designing system architecture, or brainstorming solutions.

- **Ask Mode**: Use for explanations, documentation, or answers to technical questions. Best for understanding concepts, analyzing existing code, getting recommendations, or learning about technologies without making changes.

- **Orchestrator Mode**: Use for complex, multi-step projects requiring coordination across different specialties. Ideal for breaking down large tasks into subtasks, managing workflows, or coordinating work spanning multiple domains.

- **Code Reviewer Mode**: Use for conducting thorough code reviews as a senior software engineer. Focus on code quality, best practices, and constructive feedback.

- **Code Skeptic Mode**: Use for critical code quality inspection. Questions everything and identifies potential issues, security concerns, and optimization opportunities.

## 4. Error Handling Workflow

### How to Report and Resolve Issues

1. **Immediate Assessment**: When an error occurs, first check the error message and context provided in the tool response.

2. **Mode Switching**: If in Code mode and encountering persistent issues, switch to Debug mode using `switch_mode` tool.

3. **Information Gathering**: Use `read_file`, `search_files`, or `list_code_definition_names` to gather more context about the error.

4. **Root Cause Analysis**: Analyze error patterns, check dependencies, and verify file paths and permissions.

5. **Incremental Fixes**: Make small, targeted changes and test each fix before proceeding.

6. **Documentation**: Document the error and resolution for future reference.

### Common Error Resolution Steps:
- **File Not Found**: Verify full file paths and check if file exists using `list_files`
- **Tool Parameter Errors**: Double-check all required parameters are provided
- **Mode Restrictions**: Switch to appropriate mode if file editing is blocked
- **Terminal Issues**: Use `execute_command` with clear explanations and verify command syntax

## 5. File Operation Guidelines

### Best Practices for File Editing and Creation

- **Full Paths Required**: Always specify complete file paths relative to workspace directory (c:/Users/Austin/Documents/theporadas_site).

- **Single Edit Calls**: Make all changes to a file in one `edit_file` call rather than multiple separate calls.

- **Context Preservation**: Use `// ... existing code ...` (or appropriate language comment) to indicate unchanged sections when editing existing files.

- **New File Creation**: For new files, provide complete content without `// ... existing code ...` placeholders.

- **Backup Strategy**: Before major changes, consider reading the entire file first to understand the full context.

- **File Organization**: Create logical directory structures and follow project conventions for file naming and placement.

### File Editing Example:
```
target_file: c:/Users/Austin/Documents/theporadas_site/src/app.js
instructions: I am adding error handling to the login function.
code_edit: 
// ... existing code ...
function login(username, password) {
  try {
    // ... existing code ...
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    // ... existing code ...
  } catch (error) {
    console.error('Login failed:', error.message);
    return { success: false, error: error.message };
  }
}
// ... existing code ...
```

## 6. Tool Usage Patterns

### Common Tool Combinations and Workflows

- **Code Analysis Workflow**:
  1. `list_files` - Explore directory structure
  2. `list_code_definition_names` - Get overview of code structure
  3. `read_file` - Examine specific files
  4. `search_files` - Find patterns or specific code

- **File Modification Workflow**:
  1. `read_file` - Understand current implementation
  2. `edit_file` - Make changes with proper context preservation

- **Debugging Workflow**:
  1. `search_files` - Find error-related code
  2. `read_file` - Examine problematic sections
  3. `execute_command` - Run tests or check logs
  4. `edit_file` - Apply fixes

- **Project Setup Workflow**:
  1. `list_files` - Assess current structure
  2. `execute_command` - Install dependencies or run setup scripts
  3. `edit_file` - Create or modify configuration files

- **Research Workflow**:
  1. `search_files` - Find existing implementations
  2. `read_file` - Study patterns and best practices
  3. Use MCP tools (brave-search, context7) for external research

## 7. Quality Assurance Checklist

### Steps to Verify Work Completion

- [ ] **Requirements Met**: Verify all specified requirements have been addressed
- [ ] **Code Quality**: Check for proper formatting, naming conventions, and documentation
- [ ] **Error Handling**: Ensure appropriate error handling and edge cases are covered
- [ ] **Testing**: Run relevant tests and verify functionality works as expected
- [ ] **Dependencies**: Check that all required dependencies are properly configured
- [ ] **File Structure**: Confirm files are organized logically and follow project conventions
- [ ] **Documentation**: Update any relevant documentation or comments
- [ ] **Performance**: Verify changes don't negatively impact performance
- [ ] **Security**: Check for potential security vulnerabilities
- [ ] **Cross-compatibility**: Ensure changes work across different environments/browsers

## 8. Troubleshooting Quick Reference

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| File Not Found | Tool reports file doesn't exist | Verify full path, use `list_files` to confirm file location |
| Tool Parameter Error | Tool execution fails with parameter validation error | Check all required parameters are provided with correct types |
| Mode Restriction Error | File editing blocked | Switch to appropriate mode (e.g., Code mode for file editing) |
| Terminal Command Fails | Command execution returns error | Verify command syntax, check working directory, ensure dependencies are installed |
| Search No Results | `search_files` returns empty | Try broader regex patterns, check file extensions, verify directory path |
| Edit Conflicts | Multiple changes to same file | Make all changes in single `edit_file` call |
| Path Resolution Issues | Long or complex paths fail | Use full absolute paths, avoid special characters |
| Memory/Performance Issues | Tool execution is slow or fails | Break large tasks into smaller steps, use targeted searches |
| MCP Tool Unavailable | External tool access fails | Check MCP server status, verify authentication if required |
| File Encoding Issues | Special characters display incorrectly | Ensure files are UTF-8 encoded, specify encoding if needed |

### Emergency Procedures:
1. **Tool Failure**: If a tool consistently fails, use `ask_followup_question` to request user assistance
2. **Data Loss**: Always read files before major edits to preserve original content
3. **Stuck Tasks**: Break complex tasks into smaller, verifiable steps
4. **Unclear Requirements**: Use `ask_followup_question` with specific clarification requests

---

**Remember**: Always work iteratively, confirm each step's success before proceeding, and maintain clear communication throughout the process. Use the appropriate tools and modes for each task to ensure efficient and high-quality results.</target_file>
