#!/usr/bin/env node
// GitHub MCP server: lightweight subset using REST API v3.
// Methods:
//  gh/repo { owner, repo } -> basic metadata
//  gh/issues { owner, repo, state? } -> list issues (first page)
//  gh/createIssue { owner, repo, title, body? } -> create (if token scopes allow)
//  gh/rateLimit -> remaining core rate limit
// Requires GITHUB_TOKEN (fine-grained or classic) for authenticated requests; unauth OK for public repo reads.

import fetch from 'node-fetch';
import './load_env.mjs';
import './mcp_logging.mjs';

import { ghError } from './mcp_error_codes.mjs'; // Domain-specific error helper.
import { createServer } from './mcp_rpc_base.mjs';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const token = process.env.GITHUB_TOKEN || '';

function headers() {
  const h = { 'User-Agent': 'mcp-github/0.1', Accept: 'application/vnd.github+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch(path, options = {}) {
  const url = `${API}${path}`;
  let res;
  try {
    res = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  } catch (e) {
    throw ghError('NETWORK', { details: e.message });
  }
  if (res.status === 401 || res.status === 403) {
    throw ghError('AUTH_FAILED', { details: `${res.status}` });
  }
  if (!res.ok) {
    const txt = await res.text();
    throw ghError('HTTP_ERROR', { details: `${res.status} ${txt.slice(0, 200)}` });
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return { json: await res.json(), res };
  return { json: null, res };
}

async function repoMeta(p) {
  if (!p?.owner || !p?.repo) throw ghError('INVALID_PARAMS', { details: 'owner/repo required' });
  const { json } = await ghFetch(
    `/repos/${encodeURIComponent(p.owner)}/${encodeURIComponent(p.repo)}`,
  );
  return {
    repo: {
      full_name: json.full_name,
      private: json.private,
      default_branch: json.default_branch,
      stars: json.stargazers_count,
      forks: json.forks_count,
      open_issues: json.open_issues,
    },
  };
}

async function listIssues(p) {
  if (!p?.owner || !p?.repo) throw ghError('INVALID_PARAMS', { details: 'owner/repo required' });
  const state = p.state && ['open', 'closed', 'all'].includes(p.state) ? p.state : 'open';
  const { json } = await ghFetch(
    `/repos/${encodeURIComponent(p.owner)}/${encodeURIComponent(p.repo)}/issues?per_page=20&state=${state}`,
  );
  const issues = (json || [])
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      user: i.user?.login,
      comments: i.comments,
      created_at: i.created_at,
    }));
  return { issues };
}

async function createIssue(p) {
  if (!token) throw ghError('AUTH_MISSING', { details: 'createIssue requires token' });
  if (!p?.owner || !p?.repo || !p?.title)
    throw ghError('INVALID_PARAMS', { details: 'owner/repo/title required' });
  const body = { title: p.title, body: p.body || '' };
  const { json } = await ghFetch(
    `/repos/${encodeURIComponent(p.owner)}/${encodeURIComponent(p.repo)}/issues`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return { number: json.number, url: json.html_url };
}

async function rateLimit() {
  const { json } = await ghFetch('/rate_limit');
  const core = json?.resources?.core || {};
  const search = json?.resources?.search || {};
  return {
    core: { remaining: core.remaining, limit: core.limit, reset: core.reset },
    search: { remaining: search.remaining, limit: search.limit },
  };
}

createServer(({ register }) => {
  register('gh/repo', repoMeta);
  register('gh/issues', listIssues);
  register('gh/createIssue', createIssue);
  register('gh/rateLimit', rateLimit);
});
