#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';

/*
  Creates a trivial README marker change PR to accumulate quality history samples.
  Security hardening: removes shell interpolation & curl usage; restricts network calls to api.github.com.
*/

function run(cmd, args, { allowFail = false } = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return (res.stdout || '').trim();
}

function hasGh() {
  try {
    run('gh', ['--version']);
    return true;
  } catch {
    return false;
  }
}

function getRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const remote = run('git', ['config', '--get', 'remote.origin.url']);
  // Extract owner/repo from common git URL forms.
  const m = remote.match(/github.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!m) throw new Error('Unable to derive repo from remote.origin.url');
  return m[1];
}

async function ghApi(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN required for API operations');
  const base = 'https://api.github.com';
  const full = new URL(path, base).toString();
  if (!full.startsWith(base + '/')) throw new Error('Unexpected API path outside github.com');
  const res = await fetch(full, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'sample-pr-script',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${method} ${path} failed: ${res.status} ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
  const branch = `chore/sample-${ts}`;
  const base = 'main';
  const datePrefix = ts.split('-').slice(0, 3).join('-');

  try {
    if (hasGh()) {
      const open = run(
        'gh',
        ['pr', 'list', '--state', 'open', '--search', `sample ${datePrefix}`, '--limit', '1'],
        { allowFail: true },
      );
      if (open && open.includes('chore/sample')) {
        console.log('Open sample PR for today detected; skipping.');
        return;
      }
    } else if (process.env.GITHUB_TOKEN) {
      try {
        const repo = getRepo();
        const list = await ghApi(`/repos/${repo}/pulls?state=open&per_page=30`);
        if (
          Array.isArray(list) &&
          list.some(
            (p) => p.title?.includes('chore(sample): add marker') && p.title.includes(datePrefix),
          )
        ) {
          console.log('Open sample PR for today (API) detected; skipping.');
          return;
        }
      } catch {
        /* ignore detection failures */
      }
    }
  } catch {
    /* ignore detection errors */
  }

  run('git', ['fetch', 'origin', base]);
  run('git', ['checkout', '-b', branch, `origin/${base}`]);

  const readme = 'README.md';
  const marker = `\n<!-- sample-run: ${ts} -->\n`;
  const content = readFileSync(readme, 'utf8');
  if (content.includes(marker)) {
    console.log('Marker already present; aborting to avoid duplicate.');
    return;
  }
  writeFileSync(readme, content + marker, 'utf8');
  run('git', ['add', readme]);
  run('git', ['commit', '-m', `chore(sample): add marker ${ts}`]);
  run('git', ['push', 'origin', branch]);

  const title = `chore(sample): add marker ${ts}`;
  const body = 'Automated sample PR to build quality history baseline.';

  if (hasGh()) {
    run('gh', ['pr', 'create', '--title', title, '--body', body, '--base', base]);
    run('gh', ['pr', 'edit', '--add-label', 'auto-merge'], { allowFail: true });
  } else {
    const repo = getRepo();
    try {
      const pr = await ghApi(`/repos/${repo}/pulls`, {
        method: 'POST',
        body: { title, head: branch, base, body },
      });
      if (pr?.number) {
        await ghApi(`/repos/${repo}/issues/${pr.number}/labels`, {
          method: 'POST',
          body: { labels: ['auto-merge'] },
        });
      }
    } catch (e) {
      console.error('Failed creating PR via API:', e.message);
      process.exit(1);
    }
  }
  console.log('Sample PR created and labeled (auto-merge).');
}

// Top-level await not universally available depending on Node flags; wrap.
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
