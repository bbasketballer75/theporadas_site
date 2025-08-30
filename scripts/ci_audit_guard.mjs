#!/usr/bin/env node
/**
 * Audit Guard
 *
 * Purpose: Consume `npm audit --json` output, filter to production (runtime) dependencies,
 * compare against a baseline file, and fail CI if new moderate+ vulnerabilities appear
 * or if severity of a baseline vulnerability increases.
 *
 * Baseline format (security/audit-baseline.json):
 * {
 *   "advisories": {
 *     "<id>": { "severity": "low|moderate|high|critical", "module_name": "pkg", "title": "..." }
 *   }
 * }
 * Only advisory IDs (numeric for legacy, GHSA id, or arbitrary string) are tracked.
 *
 * Exit codes:
 *  0 - pass
 *  1 - new disallowed vulnerability detected
 *  2 - malformed input / internal error
 *
 * Env overrides:
 *  AUDIT_FAIL_LEVEL: minimum severity level that triggers failure (default moderate)
 *    allowed: low, moderate, high, critical
 *  AUDIT_ALLOW_DEV: when '1', ignores dev/prod distinction (treats all)
 */

import fs from 'node:fs';

const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical'];

function parseArgs(argv) {
  const args = { input: null, baseline: null };
  for (let i = 2; i < argv.length; ) {
    const a = argv[i];
    if (a === '--input') {
      args.input = argv[i + 1];
      i += 2;
    } else if (a === '--baseline') {
      args.baseline = argv[i + 1];
      i += 2;
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/ci_audit_guard.mjs --input audit.json --baseline security/audit-baseline.json',
      );
      process.exit(0);
    } else {
      i += 1;
    }
  }
  if (!args.input || !args.baseline) {
    console.error('[audit-guard] Missing required --input or --baseline');
    process.exit(2);
  }
  return args;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('[audit-guard] Failed to parse JSON', file, e.message);
    process.exit(2);
  }
}

function severityRank(s) {
  return SEVERITY_ORDER.indexOf(s);
}

function loadBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) {
    return { advisories: {} };
  }
  const data = readJson(baselinePath);
  return data.advisories ? data : { advisories: {} };
}

function normalizeFindings(auditJson) {
  // npm audit v9+ (lockfile v3) uses vulnerabilities object; older outputs had advisories
  if (auditJson.vulnerabilities) {
    const out = {};
    for (const [name, meta] of Object.entries(auditJson.vulnerabilities)) {
      // meta via current schema has 'severity' and 'via' which can be array of strings/objects
      const findings = Array.isArray(meta.via) ? meta.via.filter((v) => typeof v === 'object') : [];
      for (const f of findings) {
        const id = f.source || f.url || `${name}-${f.name || 'unknown'}`;
        out[id] = {
          id,
          module_name: name,
          severity: f.severity || meta.severity || 'info',
          title: f.title || f.name || 'unknown',
          url: f.url || (typeof f.url === 'string' ? f.url : undefined),
          via: f.via,
          dependency: name,
          isDev: meta.dev === true,
        };
      }
    }
    return out;
  }
  if (auditJson.advisories) {
    // Legacy format
    return Object.fromEntries(
      Object.entries(auditJson.advisories).map(([id, adv]) => [
        id,
        {
          id,
          module_name: adv.module_name,
          severity: adv.severity,
          title: adv.title,
          url: adv.url,
          dependency: adv.module_name,
          isDev: adv.dev === true,
        },
      ]),
    );
  }
  return {};
}

function validateConfig(minFail, allowDev) {
  if (!SEVERITY_ORDER.includes(minFail)) {
    console.error('[audit-guard] Invalid AUDIT_FAIL_LEVEL', minFail);
    process.exit(2);
  }
  return { minFail, allowDev };
}

function analyzeVulnerabilities(findings, baselineAdvisories, minFail, allowDev) {
  const newIssues = [];
  const escalations = [];

  for (const adv of Object.values(findings)) {
    if (!allowDev && adv.isDev) continue;
    if (severityRank(adv.severity) < severityRank(minFail)) continue;

    const base = baselineAdvisories[adv.id];
    if (!base) {
      newIssues.push(adv);
    } else if (severityRank(adv.severity) > severityRank(base.severity)) {
      escalations.push({ from: base.severity, to: adv.severity, adv });
    }
  }

  return { newIssues, escalations };
}

function reportResults(newIssues, escalations, minFail) {
  if (newIssues.length === 0 && escalations.length === 0) {
    console.log('[audit-guard] PASS: No new or escalated vulnerabilities at/above', minFail);
    return;
  }

  console.error('[audit-guard] FAIL: Detected disallowed vulnerability changes');

  if (newIssues.length) {
    console.error('\nNew issues:');
    for (const n of newIssues) {
      console.error(` - ${n.id} (${n.severity}) ${n.module_name} :: ${n.title}`);
    }
  }

  if (escalations.length) {
    console.error('\nEscalations:');
    for (const e of escalations) {
      console.error(` - ${e.adv.id} severity increased ${e.from} -> ${e.to}`);
    }
  }

  process.exit(1);
}

function main() {
  const { input, baseline } = parseArgs(process.argv);
  const audit = readJson(input);
  const baselineData = loadBaseline(baseline);
  const findings = normalizeFindings(audit);

  const minFail = process.env.AUDIT_FAIL_LEVEL || 'moderate';
  const allowDev = process.env.AUDIT_ALLOW_DEV === '1';
  validateConfig(minFail, allowDev);

  const baselineAdvisories = baselineData.advisories || {};
  const { newIssues, escalations } = analyzeVulnerabilities(
    findings,
    baselineAdvisories,
    minFail,
    allowDev,
  );

  reportResults(newIssues, escalations, minFail);
}

main();
