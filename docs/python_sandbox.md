# Python Sandbox Strategy

Objectives:

- Prevent arbitrary host file access beyond allowed mounts
- Limit CPU / memory / execution time
- Restrict networking (default deny, optional allowlist)
- Provide deterministic resource cleanup per invocation

Approach (staged):

1. Baseline constraints (Phase 1)
   - Execute python scripts via child process with timeout & size limits
   - Enforce max stdout/err bytes captured
   - Use temp working directory wiped after run
2. Container isolation (Phase 2)
   - Run within dedicated Docker container (see docker_sandbox.md)
   - Read-only code volume, writable ephemeral /tmp
   - CPU quota & memory limit (e.g. 0.5 CPU, 256MB)
3. Fine-grained policy (Phase 3)
   - SELinux / AppArmor or seccomp profile
   - Network namespace with egress allowlist
   - Optional Firejail / gVisor for syscall mediation
4. Future enhancements
   - WASM execution for pure-python subset
   - Out-of-process evaluator service with queue & concurrency caps

Guardrails Implemented (current):

- Error taxonomy for python (PY_ERRORS) ensures structured failure surfaces
- Timeout codes (PY_ERRORS.TIMEOUT) mapped distinctly for monitoring
- Line-length guard at harness level (MCP_MAX_LINE_LEN)

Planned Additions:

- Resource usage metrics (cpu time, peak RSS) appended to result metadata
- Optional deterministic dependency resolution via locked virtualenv image
- Rate limiting integration (see forthcoming hooks) per origin caller

Open Considerations:

- Balancing cold start overhead of container-per-invoke vs. long-lived with reaper
- Sandboxing for dynamic C extensions (likely disallow or isolate separately)

This document is an initial blueprint; implementation will iterate based on observed workload characteristics.
