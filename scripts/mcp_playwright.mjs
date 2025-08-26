#!/usr/bin/env node
// Playwright MCP server using shared harness
import { register, createServer, appError } from './mcp_rpc_base.mjs';

let playwright;
try {
  playwright = await import('playwright');
} catch (e) {
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
      throw appError(1003, 'playwright unavailable', {
        domain: 'playwright',
        symbol: 'E_NOT_INSTALLED',
        retryable: false,
      });
    if (sessions.size >= SESSION_LIMIT)
      throw appError(1002, 'session limit reached', {
        domain: 'playwright',
        symbol: 'E_LIMIT_EXCEEDED',
        retryable: true,
      });
    const browserType = params?.browser || 'chromium';
    const type = playwright[browserType];
    if (!type)
      throw appError(1000, 'Unknown browser', {
        domain: 'playwright',
        symbol: 'E_INVALID_PARAMS',
        details: browserType,
      });
    const browser = await type.launch({ headless: true });
    const page = await browser.newPage();
    const id = String(nextId++);
    sessions.set(id, { browser, page });
    return { sessionId: id };
  });
  register('pw/goto', async ({ sessionId, url }) => {
    if (!playwright)
      throw appError(1003, 'playwright unavailable', {
        domain: 'playwright',
        symbol: 'E_NOT_INSTALLED',
      });
    const sess = sessions.get(sessionId);
    if (!sess)
      throw appError(1004, 'Invalid session', {
        domain: 'playwright',
        symbol: 'E_SESSION_NOT_FOUND',
        retryable: false,
        details: sessionId,
      });
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url))
      throw appError(1000, 'invalid url', {
        domain: 'playwright',
        symbol: 'E_INVALID_PARAMS',
        details: String(url),
      });
    await sess.page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    return { url: sess.page.url() };
  });
  register('pw/text', async ({ sessionId, selector }) => {
    if (!playwright)
      throw appError(1003, 'playwright unavailable', {
        domain: 'playwright',
        symbol: 'E_NOT_INSTALLED',
      });
    const sess = sessions.get(sessionId);
    if (!sess)
      throw appError(1004, 'Invalid session', {
        domain: 'playwright',
        symbol: 'E_SESSION_NOT_FOUND',
        details: sessionId,
      });
    if (typeof selector !== 'string' || selector.length > 200)
      throw appError(1000, 'invalid selector', {
        domain: 'playwright',
        symbol: 'E_INVALID_PARAMS',
        details: String(selector).slice(0, 100),
      });
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
