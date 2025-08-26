# System Patterns

## Architectural Patterns

- Pattern 1: Description

## Design Patterns

- Pattern 1: Description

## Common Idioms

- Idiom 1: Description

## Collaboration & Communication Patterns

- Structured Response: Always provide (1) Direct Answer, (2) Step-by-step reasoning, (3) Alternatives, (4) Action Plan.
- Autonomy Loop: For multi-step tasks create TODO list, mark each step in-progress → completed before proceeding.
- Coverage Improvement Cycle: Identify uncovered high-value branches → add focused tests → re-run suite → log deltas.
- A11y Enforcement: Post-process generated artifacts (e.g., coverage HTML)
  instead of committing modified vendor output; enforce via STRICT env mode.

## Assistant Autonomy Patterns

- Environment Audit: Search for `process.env` and tokens to proactively suggest `.env.example` additions.
- Safe Mutation: Prefer minimal diff patches, avoid unrelated refactors during targeted changes.
- Deterministic Tests: Use explicit mocks (e.g., IntersectionObserver, matchMedia) and flush microtasks/act wrappers to prevent flakiness.
