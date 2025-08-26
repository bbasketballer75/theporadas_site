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

Current scope now includes coverage drop and Lighthouse metric/category regression analysis:

- Coverage drop: sequential record comparison (positive drop values collected)
- Lighthouse metrics: positive regressions (current - previous > 0) for lcp/cls/tbt/inp
- Lighthouse categories: score decreases (previous - current > 0)

Threshold suggestions appear after minimum sample counts:

- Coverage drops ≥10
- Metric deltas ≥10
- Category drops per category ≥5

Heuristics:

- WARN ≈ max(p90, median + 2 \* IQR)
- FAIL ≈ max(p95, 1.5 \* WARN)

If insufficient data (<10 samples) the script reports distributions without threshold suggestions.

Future Enhancements (planned):

1. JSON output flag (`--json`) for CI artifact consumption.
2. Exclusion list support via `.quality-history-ignore` (commit SHAs).
3. Relative (% based) tolerance mode for Lighthouse metrics (optional) alongside absolute.
4. Adaptive ratcheting (auto-lower thresholds when stable over N consecutive runs).

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

## Recent Enhancements

### Analyzer Metric Expansion

- Added bundle delta metrics: `bundle.delta.total.gzip`, `bundle.delta.total.raw`.
- Added token net metric: `tokens.net` for net structural token growth.
- Threshold suggestions now include delta & net token metrics after ≥10 samples.

### Artifact Retrieval Resilience

- Explicit `actions: read` permission added to workflow.
- Artifact download steps are `continue-on-error: true` with `if_no_artifact_found: ignore`.
- Summarizing step synthesizes placeholder previous artifacts when absent (report-only mode).

### Submodule Warning Suppression

- Checkout sets `submodules: false` to silence unused `lighthouse` submodule path warning.

### Sample Data Accumulation Automation

- Script `scripts/create_sample_pr.mjs` generates trivial marker PRs and auto-labels `auto-merge`.

### Next Rollout Steps

1. Gather ≥10 samples; run analyzer for initial WARN thresholds (bundle/token + coverage drop + Lighthouse metrics).
2. Introduce warn-only env vars (uncomment suggestions) for bundle/token first, then coverage drop & Lighthouse metrics after observation.
3. After ≥20 stable samples, enable fail thresholds (hard gates) for bundle/token.
4. Promote coverage & Lighthouse warn thresholds to fail once variance acceptable.
5. Monitor false positive rate; adjust or exclude outlier SHAs via ignore file once feature exists.

## Automation Workflow (Quality History CI)

A dedicated GitHub Actions workflow `quality-history.yml` now automates sample accumulation on every push to `main` (and manual dispatch):

Steps (summary):

1. Checkout repository
2. Install dependencies with cached Node 22 toolchain
3. Run full test suite with coverage (Vitest + v8)
4. Append a new quality history record (`scripts/append_quality_history.mjs`)
5. Run analyzer to produce latest distribution stats (saved to `artifacts/quality-analysis-latest.txt`)
6. Upload artifacts (`artifacts/` directory + `quality-history.jsonl`)
7. Commit updated history using a skip-ci commit (`[skip ci]`) to prevent recursive workflow runs

Safeguards:

- Commit only occurs when a diff is detected for `quality-history.jsonl`.
- Analyzer runs even if no commit (ensures artifact availability for observability).
- Artifact upload precedes commit so a failed commit does not lose analysis output.

Local Reproduction:

```bash
npm test -- --coverage
node scripts/append_quality_history.mjs
node scripts/analyze_quality_history.mjs > artifacts/quality-analysis-latest.txt
```

Rationale:

- Consistent sampling cadence for statistical threshold suggestion (≥10 records).
- Removes manual friction; developers focus on feature work.
- Skip CI tag prevents an infinite loop while still persisting updated history.

Planned Enhancements:

- Add a scheduled (cron) run to detect drift during low-commit periods.
- Gate commits on preliminary WARN thresholds before writing history (dry-run mode).
- Optional Lighthouse run integration (invoke local LHCI) before append so delta metrics populate earlier.

## Roadmap Addendum (Post-Automation)

Short-Term (next 10 samples):

- Observe variance; verify no anomalous spikes in bundle/token metrics.
- Begin enabling WARN env vars once analyzer starts producing suggestions.

Mid-Term (after ≥20 samples):

- Introduce FAIL thresholds for bundle/token; keep coverage/Lighthouse at WARN.
- Implement JSON output flag for analyzer and ingest in a summary step comment.

Long-Term:

- Ratchet mechanism: auto-lower WARN/FAIL if distribution shifts downward ≥3 consecutive windows.
- Regression graph artifact (sparkline per metric) generated from history JSONL.
- MCP filesystem + memory bank servers for agent-assisted historical anomaly queries.

## MCP Integration Note

MCP stubs (filesystem, memory bank, KG, etc.) can surface quality history analysis interactively once promoted to persistent servers.
Future extension: register a `qh/query` method returning filtered subsets (e.g. records where
`coverage.branches < 90`).

## Coverage & Lighthouse Gating Strategy (Implemented Phase 1)

### Coverage Delta

- Sequential comparison implemented in analyzer; gating script already reads `GATE_MAX_COVERAGE_DROP_*` if set.
- Suggested fail thresholds derived after ≥10 positive drop samples (p95 & heuristic).
- Ratchet plan: start with conservative 1.0pp limits; tighten to analyzer suggestion after stability.

### Lighthouse Categories

- Analyzer accumulates score decreases; placeholder min category env vars already present in workflow.
- Manual category mins (Performance 0.90, others 1.00) active; future dynamic lowering only if warranted.
- Potential future: auto-suggest category mins based on lower bound (p05) of stable distribution.

### Key Metrics (LCP, CLS, TBT, INP)

- Analyzer records positive deltas; env var suggestions appear after sample threshold.
- Absolute delta gating first; relative delta mode planned (see enhancements).

### Implementation Order (Completed Elements)

1. History append includes needed coverage/bundle/token (Lighthouse metrics captured when artifact present).
2. Analyzer extended for coverage drop + Lighthouse metrics & categories.
3. Gating script already supports coverage drop & Lighthouse metric/category gates (pending env activation).
4. Next: Activate warn thresholds post sufficient history, then escalate.
