#!/usr/bin/env node
// Puppeteer MCP server using shared harness
import { register, createServer, appError } from './mcp_rpc_base.mjs';
let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch (e) {
  /* ignore */
}

const sessions = new Map();
let nextId = 1;
const SESSION_LIMIT = parseInt(process.env.MCP_PT_SESSION_LIMIT || '5', 10);
const NAV_TIMEOUT = parseInt(process.env.MCP_PT_NAV_TIMEOUT_MS || '15000', 10);

createServer(() => {
  register('pt/launch', async () => {
    if (!puppeteer)
      throw appError(1003, 'puppeteer not installed', {
        domain: 'puppeteer',
        symbol: 'E_NOT_INSTALLED',
      });
    if (sessions.size >= SESSION_LIMIT)
      throw appError(1002, 'session limit reached', {
        domain: 'puppeteer',
        symbol: 'E_LIMIT_EXCEEDED',
        retryable: true,
      });
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const id = String(nextId++);
    sessions.set(id, { browser, page });
    return { sessionId: id };
  });
  register('pt/goto', async ({ sessionId, url }) => {
    if (!puppeteer)
      throw appError(1003, 'puppeteer not installed', {
        domain: 'puppeteer',
        symbol: 'E_NOT_INSTALLED',
      });
    const sess = sessions.get(sessionId);
    if (!sess)
      throw appError(1004, 'Invalid session', {
        domain: 'puppeteer',
        symbol: 'E_SESSION_NOT_FOUND',
        details: sessionId,
      });
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url))
      throw appError(1000, 'invalid url', {
        domain: 'puppeteer',
        symbol: 'E_INVALID_PARAMS',
        details: String(url),
      });
    await sess.page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    return { url: sess.page.url() };
  });
  register('pt/text', async ({ sessionId, selector }) => {
    if (!puppeteer)
      throw appError(1003, 'puppeteer not installed', {
        domain: 'puppeteer',
        symbol: 'E_NOT_INSTALLED',
      });
    const sess = sessions.get(sessionId);
    if (!sess)
      throw appError(1004, 'Invalid session', {
        domain: 'puppeteer',
        symbol: 'E_SESSION_NOT_FOUND',
        details: sessionId,
      });
    if (typeof selector !== 'string' || selector.length > 200)
      throw appError(1000, 'invalid selector', {
        domain: 'puppeteer',
        symbol: 'E_INVALID_PARAMS',
        details: String(selector).slice(0, 100),
      });
    const el = await sess.page.$(selector);
    let textContent = '';
    if (el) textContent = await el.evaluate((n) => n.textContent || '');
    return { text: textContent };
  });
  register('pt/close', async ({ sessionId }) => {
    const sess = sessions.get(sessionId);
    if (sess) {
      await sess.browser.close();
      sessions.delete(sessionId);
    }
    return { closed: true };
  });
  register('pt/list', () => ({ sessions: Array.from(sessions.keys()) }));
});
