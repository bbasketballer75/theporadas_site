# Collaboration Templates

This document provides standardized templates for different types of collaboration requests. These templates ensure consistent communication and align with the guidelines outlined in [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md).

## 1. Bug Report Template

Use this template when reporting bugs or issues that need to be fixed.

### Template:

```
**Bug Report**

**Title:** [Brief, descriptive title]

**Description:**
[Clear description of the issue. What happened? What should have happened?]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen when following the steps above]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Operating System: [e.g., Windows 11, macOS 12.1]
- Browser: [e.g., Chrome 91.0, Firefox 89.0] (if applicable)
- File Path: [Full path to affected file(s)]
- Mode Used: [Code, Debug, etc.]

**Error Messages:**
```

[Copy and paste any error messages or stack traces]

```

**Severity:**
- [ ] Critical (blocks core functionality)
- [ ] High (major feature broken)
- [ ] Medium (minor issue)
- [ ] Low (cosmetic or minor inconvenience)

**Additional Context:**
[Any additional information, screenshots, or context that might help]

**Related Files:**
- [File 1 path]
- [File 2 path]
```

### Example:

```
**Bug Report**

**Title:** Login function throws null pointer exception

**Description:**
The login function crashes when username is null, preventing users from accessing the application.

**Steps to Reproduce:**
1. Navigate to login page
2. Leave username field empty
3. Enter password
4. Click login button

**Expected Behavior:**
Should display validation error message

**Actual Behavior:**
Application crashes with null pointer exception

**Environment:**
- Operating System: Windows 11
- File Path: src/auth/login.js
- Mode Used: Debug

**Error Messages:**
```

TypeError: Cannot read property 'length' of null
at login (src/auth/login.js:45:12)

```

**Severity:**
- [x] High (major feature broken)

**Related Files:**
- src/auth/login.js
- src/components/LoginForm.jsx
```

## 2. Feature Request Template

Use this template when requesting new features or enhancements.

### Template:

```
**Feature Request**

**Title:** [Brief, descriptive title]

**Problem Statement:**
[Describe the problem this feature would solve. Why is this needed?]

**Proposed Solution:**
[Describe your proposed solution. Be specific about what should be implemented]

**Alternative Solutions:**
[Describe any alternative solutions you've considered]

**User Story:**
As a [type of user], I want [goal] so that [benefit]

**Requirements:**
- [ ] Must-have requirement 1
- [ ] Must-have requirement 2
- [ ] Nice-to-have requirement 1

**Technical Considerations:**
[Programming language, framework, file paths, dependencies, etc.]

**Estimated Complexity:**
- [ ] Low (1-2 hours)
- [ ] Medium (3-8 hours)
- [ ] High (1-2 days)
- [ ] Very High (3+ days)

**Priority:**
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

**Acceptance Criteria:**
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3
```

### Example:

```
**Feature Request**

**Title:** Add dark mode toggle to user interface

**Problem Statement:**
Users working in low-light environments experience eye strain due to bright white interface.

**Proposed Solution:**
Add a toggle button in the header that switches between light and dark themes, with preference saved in localStorage.

**User Story:**
As a developer, I want dark mode so that I can work comfortably at night

**Requirements:**
- [x] Toggle button in header
- [x] CSS variables for theme colors
- [ ] Save preference in localStorage

**Technical Considerations:**
- Framework: React
- Files: src/components/Header.jsx, src/styles/themes.css
- Dependencies: None additional

**Estimated Complexity:**
- [x] Medium (3-8 hours)

**Acceptance Criteria:**
- [ ] Toggle switches theme instantly
- [ ] Preference persists across sessions
- [ ] Accessible color contrast maintained
```

## 3. Code Review Request Template

Use this template when requesting code review for completed work.

### Template:

```
**Code Review Request**

**Title:** [Brief description of changes]

**Changes Made:**
[Summary of what was implemented or modified]

**Files Modified:**
- [File 1 path] - [Brief description of changes]
- [File 2 path] - [Brief description of changes]

**Testing Performed:**
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

**Key Decisions:**
[Important architectural or implementation decisions made]

**Known Issues/Limitations:**
[Any known issues or limitations in the current implementation]

**Review Focus Areas:**
- [ ] Code quality and style
- [ ] Error handling
- [ ] Performance implications
- [ ] Security considerations
- [ ] Documentation updates

**Testing Instructions:**
[Steps to test the changes]

**Related Issues/PRs:**
[Links to related issues or pull requests]
```

### Example:

```
**Code Review Request**

**Title:** Implement user authentication with JWT tokens

**Changes Made:**
Added JWT-based authentication system with login, logout, and token refresh functionality.

**Files Modified:**
- src/auth/authService.js - New authentication service
- src/components/LoginForm.jsx - Updated login form
- src/middleware/auth.js - New authentication middleware

**Testing Performed:**
- [x] Unit tests for auth service
- [x] Integration tests for login flow
- [x] Manual testing of login/logout

**Key Decisions:**
Used JWT tokens over sessions for stateless authentication. Implemented refresh token rotation for security.

**Review Focus Areas:**
- [x] Security considerations
- [x] Error handling
- [x] Code quality

**Testing Instructions:**
1. Navigate to /login
2. Enter valid credentials
3. Verify JWT token is stored
4. Try accessing protected route
```

## 4. Task Assignment Template

Use this template when assigning tasks to team members.

### Template:

```
**Task Assignment**

**Task Title:** [Brief, descriptive title]

**Assignee:** [Team member name or @username]

**Priority:** [Critical/High/Medium/Low]

**Due Date:** [Date or milestone]

**Description:**
[Detailed description of what needs to be done]

**Requirements:**
- [ ] Requirement 1
- [ ] Requirement 2

**Resources:**
- Related files: [File paths]
- Documentation: [Links to relevant docs]
- Dependencies: [Any prerequisites]

**Acceptance Criteria:**
- [ ] Criteria 1
- [ ] Criteria 2

**Communication Plan:**
- Daily standup updates
- Progress reports every [frequency]
- Final review by [date]
```

## 5. Documentation Update Template

Use this template when requesting documentation updates.

### Template:

```
**Documentation Update Request**

**Document:** [Document name and path]

**Section/Page:** [Specific section or page to update]

**Current Issue:**
[What's wrong or missing in the current documentation]

**Proposed Changes:**
[What should be added, modified, or removed]

**Reason for Update:**
[Why this update is needed]

**Impact:**
[Who will be affected by this change]

**Review Required:**
- [ ] Technical review
- [ ] Editorial review
- [ ] Stakeholder approval
```

## Best Practices

### Template Usage Guidelines:

1. **Always use the appropriate template** for your request type
2. **Fill in all required fields** marked with [brackets]
3. **Be specific and detailed** in descriptions
4. **Include file paths** using full paths relative to workspace
5. **Reference the workflow guide** for communication best practices
6. **Use checklists** for complex requests

### Integration with Workflow Guide:

- Follow communication guidelines from Section 1 of [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md)
- Use appropriate mode selection from Section 3
- Follow error handling workflow from Section 4
- Apply file operation guidelines from Section 5

### Error Handling:

- If template fields are unclear, reference examples provided
- For complex requests, break down using task breakdown best practices (Section 2)
- Use quality assurance checklist from Section 7 before submission

---

**Reference:** This document integrates with [`kilo_code_workflow_guide.md`](kilo_code_workflow_guide.md) and should be used alongside the communication protocols defined there.</target_file>
