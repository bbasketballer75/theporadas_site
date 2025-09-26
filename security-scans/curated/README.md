Curated triage outputs

This folder contains compact, curated results produced by `scripts/generate-curated-triage.ps1`.

Files produced:
- triage-summary.csv — small CSV with Pattern,Count (sorted by count)
- samples/*.md — up to N sample lines per pattern (keeps files small and safe to commit)

Guidance:
- Do NOT commit full raw scan outputs into the repository. If you must retain full raw outputs, upload them to a secure artifact store (S3, private file share, GitHub Releases, or your organization's artifact server) and include links in triage issues.
- Use the curated summary and samples in issues and PRs to keep repository size reasonable.
