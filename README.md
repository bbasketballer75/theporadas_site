# Project Structure and Rationale

This project uses a clean, logical folder structure to keep assets, documentation, and code organized:

- `.env`: Environment variables
- `.git/`: Version control
- `.github/`: GitHub workflows, prompts, instructions
- `assets/`
  - `public/`
    - `media/`
      - `audio/`
      - `photos/`
      - `posters/`
      - `videos/`
  - `wedding/`
    - `public_images/`
      - `manifest.json`
- `servers/`: MCP server implementations and related resources

## Additional Notes

- All documentation is in the root README files and server subfolders.
- No separate docs/ or src/ folders are present; all code is under servers/.


## Rationale

- Media assets are organized by type and event for easy access.
- Documentation and source code are separated for clarity and maintainability.
- Environment and workflow files are easy to locate and manage.


## Best Practices

- Capture workflow improvements and lessons learned in README_MCP_WORKFLOW.md and README_MCP_ENV_WRAPPERS.md.
- Document major changes and resets for reproducibility and continuous improvement.
- Keep the structure simple and logical to avoid confusion and inefficiency.
