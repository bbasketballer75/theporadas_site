# Quality History Analyzer

Script: `scripts/analyze_quality_history.mjs`

Run:

```bash
npm run analyze:quality
```

Input file: `artifacts/quality-history.jsonl` (append-only JSON Lines created by `append_quality_history.mjs`).

Outputs (stdout):

- Record count
- Per-metric distribution (min, p25, p50, p75, p90, p95, max, mean, std)
- Outliers (IQR fence and Modified Z > 3.5)
- Suggested WARN / FAIL thresholds for growth-oriented metrics (bundle gzip/raw total, token added) once ≥10 samples
- Commented env var lines ready to copy/uncomment in `.github/workflows/auto_merge.yml`

Current scope intentionally excludes coverage & Lighthouse regression thresholds because they require
delta-based logic; those will be added after enough history accumulates.

Heuristics:

- WARN ≈ max(p90, median + 2 \* IQR)
- FAIL ≈ max(p95, 1.5 \* WARN)

If insufficient data (<10 samples) the script reports distributions without threshold suggestions.

Future Enhancements (planned):

1. Delta-based coverage drop detection (derive negative delta distribution).
2. Lighthouse category regression thresholds (percentage point drops).
3. Key metric regression tolerances (LCP/TBT/INP ms, CLS units) using relative % over median.
4. JSON output flag (`--json`) for CI artifact consumption.
5. Exclusion list support via `.quality-history-ignore` (commit SHAs).

Example partial output:

```text
Quality History Analysis
Records: 18

Metric: bundle.total.gzip
  Count: 18
  Min..Max: 152340 .. 153210
  p25/p50/p75: 152500 / 152620 / 152990
  p90/p95: 153100 / 153180
  Mean: 152780.56  Std: 270.12
  Suggested WARN: 153100  FAIL: 229650  (Warn ~p90/median+2*IQR; Fail ~max(p95,1.5*warn))

--- Suggested env var lines (copy/uncomment as needed) ---
# Suggested thresholds for bundle gzip (from analyzer)
# BUNDLE_GZIP_TOTAL_WARN=153100
# BUNDLE_GZIP_TOTAL_MAX=229650
```

Execution safety: If the history file is missing or empty, script exits 0 with a notice (non-fatal).

See also: `docs/implementation_roadmap.md` for broader quality gating strategy.
