# Browser Containerization

Goals:

- Isolate Playwright / Puppeteer execution from host
- Reduce privilege surface (no root, drop capabilities)
- Constrain resources (memory, CPU, shm)
- Enable future network policy & auditing

Baseline Image:

- `mcr.microsoft.com/playwright` (includes necessary browsers) run as bundled `pwuser`

Recommended Runtime Flags:

- `--cap-drop=ALL --security-opt no-new-privileges:true`
- `--shm-size=512m` (adjust for heavy pages; keep minimal)
- Read-only bind of project with dedicated writable cache volume
- Optional `--memory=768m --cpus=1` for predictability

Data Flow:

1. JSON-RPC harness receives navigation/action request
2. Browser launched within container (already minimal user)
3. Artifacts (screenshots, PDFs) written to ephemeral volume, streamed back
4. Temp files cleaned per session

Future Hardening:

- Add seccomp profile trimming allowed syscalls
- Implement network egress allowlist (DNS + HTTP domains)
- Per-session container (higher isolation; more overhead) vs pooled model
- Audit logging of navigation targets & resource counts

Metrics Integration:

- Expose counts via `sys/metrics` (already added in harness) linking method names to automation calls
- Potential extension: add navigation timing breakdown in result payloads

Open Questions:

- Trade-off of persistent browser vs. fresh per method (memory vs. cross-request state risk)
- Handling video capture (volume size, retention policy)

This document seeds implementation guidance; iterative refinement expected as usage patterns emerge.
