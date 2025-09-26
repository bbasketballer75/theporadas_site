---
description: "Reliable CLI access for Windows development tools. Always add the full bin path for CLI tools to PATH, verify CLI availability after install, and avoid adding project folders to PATH."
applyTo: "**/windows/**,**/*.cmd,**/*.exe"
---

# Windows CLI Setup Memory

Ensures correct and reliable command-line access for development tools on Windows.

## VS Code Insiders CLI Path Setup

- Always add the full `bin` path for CLI tools to PATH (e.g., `C:\Users\<YourUsername>\AppData\Local\Programs\Microsoft VS Code Insiders\bin`).
- Verify CLI availability after install by running `code-insiders --version` in a new terminal.
- Do not add project folders or parent VS Code folders to PATH—only the `bin` subfolder.
- Clean up duplicate or obsolete PATH entries to avoid hitting Windows’ length limit.

## Common Mistake

- Adding only the parent directory (e.g., `...VS Code Insiders\`) instead of the `bin` subfolder will not enable the CLI.

## Best Practice

- After any major software install, check for CLI executables and update PATH as needed.
- If you install a new tool and want to run it from anywhere, add its install directory to PATH.
