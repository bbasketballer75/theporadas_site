// Shared safe fetch utilities with basic http-to-file-access mitigations.
// Features:
//  - Domain allowlist enforcement
//  - Optional max size limit
//  - Optional content-type allowlist
//  - JSON convenience wrapper
//  - Ensures only https scheme
//  - Rejects redirects to disallowed hosts

const DEFAULT_ALLOWED_HOSTS = new Set(['api.github.com']);

export async function safeFetch(url, opts = {}) {
  const { allowedHosts = DEFAULT_ALLOWED_HOSTS, maxBytes = 512_000, allowedContentTypes } = opts;
  const u = new URL(url);
  if (u.protocol !== 'https:') {
    throw new Error('Only https protocol allowed');
  }
  if (!allowedHosts.has(u.hostname)) {
    throw new Error(`Host not in allowlist: ${u.hostname}`);
  }
  const res = await fetch(u, {
    redirect: 'manual',
    headers: opts.headers,
    method: opts.method || 'GET',
    body: opts.body,
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error('Redirects blocked to prevent host bypass');
  }
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (allowedContentTypes) {
    const ok = allowedContentTypes.some((t) => ct.startsWith(t));
    if (!ok) throw new Error(`Unexpected content-type: ${ct}`);
  }
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) {
      throw new Error('Response exceeds maxBytes limit');
    }
    chunks.push(value);
  }
  const all = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  return {
    bytes: all,
    text: () => new TextDecoder().decode(all),
    json: () => JSON.parse(new TextDecoder().decode(all)),
    contentType: ct,
  };
}

export async function safeFetchJson(url, opts = {}) {
  const res = await safeFetch(url, {
    ...opts,
    allowedContentTypes: opts.allowedContentTypes || ['application/json'],
  });
  return res.json();
}
