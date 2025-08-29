# Beast Mode Chat Guidelines (Optimized)

This file distills the operative rules from the user-level Beast Mode prompt to
reduce verbosity while keeping enforceable behaviors explicit. Use it for quick
reference when maintaining or extending agent workflows.

## Core Principles

1. Autonomy: Complete multi-step tasks end‑to‑end before yielding.
2. Transparency: Emit concise preambles before grouped tool calls.
3. Rigor: Plan via structured TODO list; mark each item immediately when done.
4. Incrementality: Make minimal, testable code changes; verify after each.
5. Research Discipline: Use live web/documentation fetches for any 3rd‑party
   library usage uncertainties (do not rely solely on prior knowledge).
6. Non-blocking: Avoid unnecessary clarification requests when intent is clear.
7. Safety: Never fabricate results; prefer explicit uncertainty statements.

## Operational Loop

1. (Plan) If task >1 step, write TODO list (markdown, fenced code block).
2. (Select) Mark exactly one item `in-progress` using the todo tool.
3. (Act) Perform required file reads/searches BEFORE edits.
4. (Edit) Apply focused patch(es); avoid unrelated reformatting.
5. (Validate) Run tests / lint / custom verifications if available.
6. (Record) Mark item completed; proceed to next until all done.
7. (Summarize) Provide final concise result + optional next steps.

## Tool Usage Rules

- `manage_todo_list`: Always for multi-step tasks; single active in-progress.
- `read_file` before modifying a file unless already read during current step.
- `apply_patch` for updates; `create_file` only for new files.
- `grep_search` / `file_search` to narrow scope instead of broad reading.
- `runTests` only after edits that could affect runtime/test outcomes.
- `fetch_webpage` for any required real-time external documentation.

## Logging / Output Style

- Preambles: 1 short sentence (“Editing supervisor for readiness fix”).
- Avoid repeating previous context verbatim; reference deltas instead.
- Use fenced code blocks only for commands, config snippets, or examples.
- Keep final answer ≤ ~10 concise lines unless complexity warrants detail.

## Common Pitfalls & Resolutions

| Pitfall                                | Resolution                                      |
| -------------------------------------- | ----------------------------------------------- |
| Forgot to mark todo complete           | Update via `manage_todo_list` immediately.      |
| Large sweeping refactor                | Split into discrete, reviewable steps.          |
| Missing file context before patch      | Read file first (avoid blind patch).            |
| Inline PowerShell env assignment fails | Use `$env:VAR='value'` on its own line.         |
| Regressing readiness detection         | Ensure `type==='ready'` JSON includes `server`. |

## Readiness JSON Contract

A server is considered ready when it emits a single line JSON object:

```json
{
  "type": "ready",
  "server": "<name>",
  "methods": ["x/y", "z/w"],
  "schema": { "service": "foo", "version": 1 }
}
```

Omitting `server` prevents supervisor readiness marking.

## Commit Message Template

```text
feat(supervisor): add fs readiness server field

Include server property in filesystem ready JSON so supervisor marks it ready.
Adds PowerShell helper script and docs clarifying env var syntax.
```

Adjust conventional commit type/scope as appropriate.

## When To Stop

Stop only when:

- All TODO items are `completed`.
- Changes are applied & validated (tests/linters run when relevant).
- Final summary lists what changed and potential next optional steps.

## Optional Future Enhancements

- Automated readiness integration tests across all servers.
- Standard schema validator for readiness line.
- Centralized capability registry aggregator script.

---

Last updated: (maintain manually)
