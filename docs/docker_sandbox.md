# Docker Sandbox Scaffolding

Initial scaffolding for containerized sandbox of automation + python execution.

Goals:

- Unprivileged user
- Read-only root FS where possible (tmpfs for writable dirs)
- Distinct network aliases for isolation / future egress control
- Capability & seccomp reduction

Example docker-compose addition (not enabled by default):

```yaml
services:
  mcp-python:
    image: python:3.12-slim
    user: 1000:1000
    working_dir: /app
    command: ['node', 'scripts/mcp_python.mjs']
    volumes:
      - ./:/app:ro
      - mcp-tmp:/tmp
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop: ['ALL']
    networks: [mcpnet]
  mcp-playwright:
    image: mcr.microsoft.com/playwright:v1.45.0-jammy
    user: pwuser
    working_dir: /app
    command: ['node', 'scripts/mcp_playwright.mjs']
    volumes:
      - ./:/app:ro
      - pw-tmp:/home/pwuser/.cache
    read_only: true
    shm_size: 512m
    security_opt:
      - no-new-privileges:true
    cap_drop: ['ALL']
    networks: [mcpnet]

volumes:
  mcp-tmp:
  pw-tmp:

networks:
  mcpnet:
    driver: bridge
```

Future enhancements:

- Add seccomp profile restricting syscalls further
- Egress allowlist via network policy / proxy
- Per-container resource limits (CPU quota, memory)
- Distinct service account credentials injection mechanism

This file is scaffolding only; not referenced by runtime yet.
