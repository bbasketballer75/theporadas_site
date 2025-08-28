import fs from 'fs';

const text = fs.readFileSync('codeql_alerts.json', 'utf8');
const data = JSON.parse(text);
const groups = {};
for (const al of data) {
  const k = al.rule.id;
  if (!groups[k])
    groups[k] = { count: 0, sev: al.rule.severity, sec: al.rule.security_severity_level };
  groups[k].count++;
}
const sorted = Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
for (const [r, d] of sorted) {
  console.log(`${r}\t${d.sev}\t${d.sec}\t${d.count}`);
}
const highs = data.filter((al) => al.rule.security_severity_level === 'high');
console.log(
  'HIGH_ALERTS_JSON=' +
    JSON.stringify(
      highs.map((h) => ({
        number: h.number,
        rule: h.rule.id,
        path: h.most_recent_instance.location.path,
        line: h.most_recent_instance.location.start_line,
      })),
    ),
);
