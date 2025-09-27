Curated triage outputs

This folder contains compact, curated results produced by `scripts/generate-curated-triage.ps1`.

Files produced:

- triage-summary.csv — small CSV with Pattern,Count (sorted by count)
- samples/*.md — up to N sample lines per pattern (keeps files small and safe to commit)

Guidance:

- Do NOT commit full raw scan outputs into the repository. If you must retain full raw outputs, upload them to a secure artifact store (S3, private file share, GitHub Releases, or your organization's artifact server) and include links in triage issues.
- Use the curated summary and samples in issues and PRs to keep repository size reasonable.

Additional notes — optional raw artifact handling

- If you need to retain full raw scan outputs (not recommended in the repository), use the `-RawOutputPath` option of `scripts/generate-curated-triage.ps1` to write raw outputs to a local folder (for example `security-scans/raw`).
- To upload raw artifacts to a secure store (S3/GCS), use `scripts/upload-raw-artifacts.ps1` and ensure the CI runner has credentials via environment secrets. Do NOT enable this unless you have an appropriately secured bucket and an organizational policy allowing it.

Rotation evidence automation

- The repository includes a `rotation-evidence-check` workflow that listens for issue comments that contain the phrase `rotation-evidence:` (case-insensitive). When such a comment is posted on an issue labeled `needs-rotation`, the workflow will add a `rotation-evidence-provided` label, remove `needs-rotation`, and post an acknowledgement comment with next steps.
- Example rotation evidence comment format:

  `rotation-evidence: Rotated at 2025-09-26T12:34:56Z; New secret stored in AWS Secrets Manager at arn:aws:secretsmanager:...; Rollout verified by job id: 12345`

- The rotation-evidence workflow is intentionally conservative — it only marks the evidence label. Repository maintainers must still verify rollout and close the issue when satisfied.
