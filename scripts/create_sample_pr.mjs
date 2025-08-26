#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/*
  Creates a trivial README marker change PR to accumulate quality history samples.
  Requirements: GITHUB_TOKEN env var with repo scope (uses gh CLI if available, else REST via curl).
*/

function sh(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

function hasGh() {
  try {
    sh('gh --version');
    return true;
  } catch {
    return false;
  }
}

function main() {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
  const branch = `chore/sample-${ts}`;
  const base = 'main';
  // If there is already an open sample PR today, skip creating another to avoid spam.
  const datePrefix = ts.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
  try {
    if (hasGh()) {
      const open = sh(`gh pr list --state open --search "sample ${datePrefix}" --limit 1 || true`);
      if (open && open.includes('chore/sample')) {
        console.log('Open sample PR for today detected; skipping.');
        return;
      }
    } else if (process.env.GITHUB_TOKEN) {
      const repo =
        process.env.GITHUB_REPOSITORY ||
        sh('git config --get remote.origin.url').replace(/.*github.com[/:]|\.git$/g, '');
      const prsJson = sh(
        `curl -s -H "Authorization: Bearer ${process.env.GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${repo}/pulls?state=open&per_page=30"`,
      );
      try {
        const list = JSON.parse(prsJson);
        if (
          Array.isArray(list) &&
          list.some(
            (p) => p.title?.includes('chore(sample): add marker') && p.title.includes(datePrefix),
          )
        ) {
          console.log('Open sample PR for today (API) detected; skipping.');
          return;
        }
      } catch {}
    }
  } catch {
    /* ignore detection errors */
  }
  sh(`git fetch origin ${base}`);
  sh(`git checkout -b ${branch} origin/${base}`);
  const readme = 'README.md';
  const marker = `\n<!-- sample-run: ${ts} -->\n`;
  const content = readFileSync(readme, 'utf8');
  if (content.includes(marker)) {
    console.log('Marker already present; aborting to avoid duplicate.');
    return;
  }
  writeFileSync(readme, content + marker, 'utf8');
  sh(`git add ${readme}`);
  sh(`git commit -m "chore(sample): add marker ${ts}"`);
  sh(`git push origin ${branch}`);
  const title = `chore(sample): add marker ${ts}`;
  const body = 'Automated sample PR to build quality history baseline.';
  if (hasGh()) {
    sh(`gh pr create --title "${title}" --body "${body}" --base ${base}`);
    sh(`gh pr edit --add-label auto-merge || true`);
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('GITHUB_TOKEN required when gh CLI not available.');
      process.exit(1);
    }
    const repo =
      process.env.GITHUB_REPOSITORY ||
      sh('git config --get remote.origin.url').replace(/.*github.com[/:]|\.git$/g, '');
    const data = JSON.stringify({ title, head: branch, base, body });
    const pr = sh(
      `curl -s -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -d '${data}' https://api.github.com/repos/${repo}/pulls`,
    );
    console.log(pr);
    try {
      const prJson = JSON.parse(pr);
      if (prJson.number) {
        sh(
          `curl -s -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -d '{"labels":["auto-merge"]}' https://api.github.com/repos/${repo}/issues/${prJson.number}/labels`,
        );
      }
    } catch {}
  }
  console.log('Sample PR created and labeled (auto-merge).');
}

main();
