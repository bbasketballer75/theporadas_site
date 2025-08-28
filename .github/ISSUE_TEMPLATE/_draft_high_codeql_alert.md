---
name: '(DRAFT) High CodeQL Alert'
about: Temporary draft file - will be converted into a GitHub issue and then removed.
title: 'fix: Address high CodeQL alert(s) - insecure temp file & file-system race'
labels: [security, codeql, high]
assignees: []
---

## Summary

Address the set of current CodeQL high security severity alerts
(file-system race conditions and insecure temporary file usage)
plus a regex injection risk in `scripts/verify_workflows.mjs`.

## High Alerts Snapshot

Extracted from latest CodeQL run (see immutable baseline section in `SECURITY_NOTES.md`).

| Alert # | Rule                       | Path                               | Line |
| ------- | -------------------------- | ---------------------------------- | ---- |
| 38      | js/file-system-race        | scripts/verify_workflows.mjs       | 457  |
| 37      | js/file-system-race        | scripts/verify_workflows.mjs       | 445  |
| 36      | js/file-system-race        | scripts/verify_workflows.mjs       | 359  |
| 35      | js/regex-injection         | scripts/verify_workflows.mjs       | 507  |
| 7       | js/insecure-temporary-file | test/mcp_supervisor.spec.ts        | 84   |
| 3       | js/file-system-race        | scripts/compute_bundle_sizes.mjs   | 22   |
| 2       | js/file-system-race        | scripts/append_quality_history.mjs | 94   |
| 1       | js/file-system-race        | scripts/append_quality_history.mjs | 93   |

## Risk Description

- File system race (TOCTOU) can allow an attacker to replace or pre-create a file after existence checks.
- Insecure temporary file creation may leak or allow tampering in shared temp directories.
- Regex injection could enable denial-of-service or unexpected pattern behavior if untrusted input reaches a constructed regex.

## Remediation Plan

1. Replace existence + subsequent write sequences with:
   `fs.openSync(path, fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600)`
   and write via file descriptor.
2. For temp files in tests, use a secure helper (for example `fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'))`) or a library like `tmp`.
3. Ensure regex construction does not interpolate untrusted input
   without escaping. Use `new RegExp(escape(userInput), '...')`
   with an escape helper.
4. Add unit tests for new secure temp file and file creation helper.
5. Centralize file path derivation to avoid duplicated race patterns.

## Acceptance Criteria

- All listed alert locations refactored.
- New helper: `secureOpenExclusive(path)` with tests.
- CodeQL subsequent run shows 0 high severity alerts for these rule IDs.
- SECURITY_NOTES updated (mutable section) with remediation status.

## References

- CWE-367: Time-of-check Time-of-use race condition.
- Node.js fs docs: <https://nodejs.org/api/fs.html>
- `tmp` npm: <https://www.npmjs.com/package/tmp>

## SLA

Target completion: 7 days from creation.

## Next Steps

After verification of fix, remove this draft file if committed and rely on GitHub issue tracking only.
