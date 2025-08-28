#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'codeql_alerts.json';
let dataRaw;
try {
  dataRaw = readFileSync(file, 'utf8');
} catch (e) {
  console.error('Cannot read alerts file:', e.message);
  process.exit(1);
}
if (!dataRaw.trim()) {
  console.error('Alerts file is empty');
  process.exit(2);
}
let alerts;
try {
  alerts = JSON.parse(dataRaw);
} catch (e) {
  console.error('Invalid JSON in alerts file:', e.message);
  process.exit(3);
}
if (!Array.isArray(alerts)) {
  console.error('Expected top-level array of alerts');
  process.exit(4);
}

const sevMap = { high: 0, medium: 0, low: 0, note: 0 };
const byRule = {};
const highDetails = [];

for (const a of alerts) {
  const sev = (a.rule?.security_severity_level || a.rule?.severity || '').toLowerCase();
  if (sev in sevMap) sevMap[sev]++;
  const ruleId = a.rule?.id || a.rule?.name || 'unknown';
  byRule[ruleId] = (byRule[ruleId] || 0) + 1;
  if (sev === 'high') {
    highDetails.push({
      number: a.number,
      rule: ruleId,
      path: a.most_recent_instance?.location?.path,
      line: a.most_recent_instance?.location?.start_line
    });
  }
}

const summary = { counts: sevMap, total: alerts.length, distinct_rules: Object.keys(byRule).length, rules: byRule, high_details: highDetails };
console.log(JSON.stringify(summary, null, 2));