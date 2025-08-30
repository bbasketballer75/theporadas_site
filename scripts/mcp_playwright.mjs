#!/usr/bin/env node
// Playwright MCP server using shared harness
import { pwError } from './mcp_error_codes.mjs';
import './mcp_logging.mjs';
import { createServer, register } from './mcp_rpc_base.mjs';

let playwright;
try {
  playwright = await import('playwright');
} catch {
  // playwright unavailable; structured errors will surface when methods invoked
  playwright = null;
}

const sessions = new Map();
let nextId = 1;
const SESSION_LIMIT = parseInt(process.env.MCP_PW_SESSION_LIMIT || '5', 10);
const NAV_TIMEOUT = parseInt(process.env.MCP_PW_NAV_TIMEOUT_MS || '15000', 10);

createServer(() => {
  register('pw/launch', async (params) => {
    if (!playwright)
      throw pwError('BROWSER_LAUNCH', { details: 'playwright unavailable', retryable: false });
    if (sessions.size >= SESSION_LIMIT)
      throw pwError('BROWSER_LAUNCH', { details: 'session limit reached', retryable: true });
    const browserType = params?.browser || 'chromium';
    const type = playwright[browserType];
    if (!type) throw pwError('INVALID_SELECTOR', { details: 'unknown browser ' + browserType });
    const browser = await type.launch({ headless: true });
    const page = await browser.newPage();
    const id = String(nextId++);
    sessions.set(id, { browser, page });
    return { sessionId: id };
  });
  register('pw/goto', async ({ sessionId, url }) => {
    if (!playwright) throw pwError('BROWSER_LAUNCH', { details: 'playwright unavailable' });
    const sess = sessions.get(sessionId);
    if (!sess) throw pwError('BROWSER_LAUNCH', { details: 'invalid session ' + sessionId });
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url))
      throw pwError('NAVIGATION', { details: 'invalid url ' + String(url) });
    await sess.page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    return { url: sess.page.url() };
  });
  register('pw/text', async ({ sessionId, selector }) => {
    if (!playwright) throw pwError('BROWSER_LAUNCH', { details: 'playwright unavailable' });
    const sess = sessions.get(sessionId);
    if (!sess) throw pwError('BROWSER_LAUNCH', { details: 'invalid session ' + sessionId });
    if (typeof selector !== 'string' || selector.length > 200)
      throw pwError('INVALID_SELECTOR', { details: String(selector).slice(0, 100) });
    const el = await sess.page.locator(selector).first();
    const text = await el.innerText().catch(() => '');
    return { text };
  });
  register('pw/close', async ({ sessionId }) => {
    const sess = sessions.get(sessionId);
    if (sess) {
      await sess.browser.close();
      sessions.delete(sessionId);
    }
    return { closed: true };
  });
  register('pw/list', () => ({ sessions: Array.from(sessions.keys()) }));
});
