# Uptime Monitoring

This project uses an external uptime monitor (recommended: UptimeRobot) plus an internal lightweight scheduled GitHub Action to provide:

- External global reachability + SSL expiry + response time tracking
- Independent internal verification (curl + status code / latency budget)
- A status badge in the `README.md`

## 1. External Monitor (UptimeRobot)

1. Sign in / create an UptimeRobot account.
2. Create a new **HTTPS Monitor**:
   - Friendly Name: `theporadas.com (prod)`
   - URL: `https://theporadas-site.vercel.app/`
   - Interval: 5 minutes (do not set <5; respects fair use)
   - Monitoring Type: HTTPS
   - Advanced: Enable **SSL Expiry** and **Response Time** alerts.
3. Save.
4. (Optional) Add alert contacts (email / Slack / Teams webhook) and associate them with the monitor.
5. Open the monitor detail page → click **Share** (or **Public Status Page**)
   to generate a public status page if you want a detailed history (optional).
6. Copy the badge markdown UptimeRobot provides OR construct a Shields.io badge (see below) and replace the placeholder badge in `README.md`.

### Badge Options

#### Native UptimeRobot Badge

Pros: Simple.
Cons: Styling limited, sometimes slower to load.

```md
![Uptime](https://uptimerobot.com/assets/images/statusPage/badge-<BADGE_ID>.svg)
```

`<BADGE_ID>` is provided on the share modal.

#### Shields.io Proxy Badge (Recommended)

Pros: Consistent styling, caching, dark‑mode friendly.
Cons: Slight delay (~5m) because it pulls summarized status.

Format (public status page required):

```md
![Uptime](https://img.shields.io/uptimerobot/ratio/30/m<MONITOR_ID>?label=uptime)
```

- `m<MONITOR_ID>` comes from the monitor's ID (e.g. `m793309812-4d3b...`).
- Adjust period: `7`, `30`, or `365` days; you can also use `?url=` variant if exposing status page.

If you do not want a public page, keep the native badge.

### Private API Key Variant

If using the API to pull status internally only (not for the public badge), create a **Read-Only API Key** in UptimeRobot settings.

Store in GitHub Actions secrets later if you extend internal checks.

## 2. Internal Scheduled Check (GitHub Action)

A lightweight action (added in this repo at `.github/workflows/uptime-check.yml`) runs on a schedule + manual dispatch to:

- Perform a `curl` against the production URL
- Enforce maximum latency & status code 200
- Emit a job summary for observability
- (Future) Optional Slack / issue creation on persistent failures

Rationale: Independent verification path (GitHub infra) increases confidence when third-party service or region-specific outages occur.

## 3. Placeholder Badge Replacement

In `README.md` locate:

```md
![Uptime (prod) Placeholder](https://img.shields.io/badge/uptime-configuring-lightgrey)
```

Replace with chosen badge once monitor created. Keep commit message conventional e.g.:

```text
chore(docs): add uptime badge
```

## 4. API (Optional Automation)

Create a monitor via API (example). Obtain a **Main API Key** (read/write) from
UptimeRobot dashboard (Settings → API Keys). Store locally; DO NOT COMMIT keys.

Endpoint: `https://api.uptimerobot.com/v2/newMonitor`

```bash
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'api_key=YOUR_MAIN_API_KEY' \
  -d 'format=json' \
  -d 'type=1' \
  -d 'url=https://theporadas-site.vercel.app/' \
  -d 'friendly_name=theporadas.com (prod)' \
  -d 'interval=300'
```

Response (truncated example):

```json
{ "stat": "ok", "monitor": { "id": 7979309812, "status": 2 } }
```

Use the numeric `id` (prefix with `m` for Shields ratio endpoint: `m7979309812`).

## 5. Latency / SLO Guidelines

Initial internal budget: 1500ms TTFB ceiling (cold starts rare on static hosting). If exceeded consistently, investigate:

- Vercel edge / region routing anomalies
- Asset weight regressions (check Lighthouse budgets)
- DNS or TLS setup changes

Consider formalizing an Availability SLO: 99.9% (≈43m downtime / 30d).
UptimeRobot 5‑minute interval supports detecting most outages; for tighter MTTR
consider a parallel 1‑minute internal probe (cost/benefit trade‑off).

## 6. Future Enhancements

- Automatically open a GitHub Issue after N consecutive failed internal checks.
- Integrate a Slack / Teams webhook for alert fan‑out.
- Add synthetic journey test (load hero video, verify DOM markers) via Playwright on a daily schedule distinct from PR visual tests.
- Export uptime history into `artifacts/quality-history.jsonl` for unified operational timeline.

## 7. Security & Secret Handling

Currently no secrets required for the simple curl workflow. If later extending with private API queries:

1. Add secret `UPTIMEROBOT_READ_KEY` in repo settings.
2. Reference in workflow via `${{ secrets.UPTIMEROBOT_READ_KEY }}`.
3. Keep network calls fail-fast and redact keys in logs.

## 8. Maintenance Checklist

- Badge still resolving (renders < 1s) → otherwise switch provider / cache via Shields.
- Monitor interval remains at agreed cadence (5m) – avoid accidental downgrades.
- SSL expiry alerts enabled (renewals 30 days out).
- README uptime badge points to current monitor (correct ID after any recreation).

---

Document version: 1.0 (initial addition). Update this doc upon any material change (new provider, SLO adjustment, automation added).
