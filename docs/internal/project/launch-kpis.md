# Launch KPIs

Owner: TBD (assign before production DNS cutover)

Review Cadence: Weekly (automated dashboard target)

## 1. Reliability & Availability

- Uptime (edge served 200/304): >= 99.95% rolling 30d
- Error budget (5xx + handled error pages): <= 0.05%
- Cold start p95 (serverless functions if any): < 1.2s

## 2. Performance (Core Web Vitals)

- LCP p75: < 2.2s mobile (CrUX after live) / synthetic < 1.8s
- CLS p75: < 0.05
- INP p75: < 200ms
- TTFB p75: < 400ms (primary region)

## 3. Security

- CSP violation rate: < 0.01 per 1k requests (after hard enforcement)
- Secrets rotation: Monitor login quarterly (workflow in place) + manual confirmation
- Zero occurrences of `sa` login usage in app/runtime code (CI gate)
- Dependency high severity vulns: 0 open > 7 days

## 4. Quality & Regression

- Unit test pass rate: 100%
- Coverage: > existing thresholds (do not regress)
- Lighthouse performance score (mobile fast 4G): >= 90
- Lighthouse accessibility score: >= 95

## 5. Observability

- Synthetic Lighthouse run (prod) daily: PASS thresholds
- Uptime probe: 1 min interval, alert after 5 consecutive failures
- Error log ingestion (frontend + serverless) established (provider TBD: Sentry / GCP Logs aggregation)

## 6. Release Engineering

- Deployment rollback median time: < 10 min
- Change failure rate (rollback or hotfix within 24h): < 5%

## 7. Growth / Engagement (Post-launch) – Optional

- Bounce rate delta vs baseline: < +5%
- Time to interactive RSVP (if dynamic feature added): < 3s p75

## 8. Data (If DB-enabled at launch)

- DB connection errors: 0 sustained incidents > 5 min
- Backup verification cadence: Weekly sample restore (dev) successful

## Open Items / Instrumentation Tasks

- [ ] Add synthetic prod Lighthouse GitHub Action
- [ ] Add uptime monitoring (service or GitHub Action + external)
- [ ] Decide on error tracking vendor & wire client
- [ ] Hook CSP report endpoint to storage + analyzer
- [ ] CrUX monitoring after 28d (document link once available)
- [ ] Fill OWNER fields below

## Ownership Table

| KPI                   | Owner           | Backup          |
| --------------------- | --------------- | --------------- |
| Uptime                | Ops Lead        | SRE Backup      |
| LCP                   | Perf Champion   | Frontend Dev    |
| CSP Violations        | Security Lead   | Security Backup |
| Rotation Confirmation | DB Admin        | Ops Lead        |
| Lighthouse Daily      | QA Engineer     | Perf Champion   |
| Rollback Time         | Release Manager | Ops Lead        |

## Notes

This document is versioned; edits require PR review. Embed links to dashboards as they are created.
