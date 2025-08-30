// Simple in-process log level management + registration helper.
// Exposes method: sys/setLogLevel { level } returning { level }
// Levels: debug, info, warn, error

import { emitEvent } from './mcp_events.mjs';
import { register } from './mcp_rpc_base.mjs';

let currentLevel = process.env.MCP_LOG_LEVEL || 'info';
const levels = ['debug', 'info', 'warn', 'error'];

export function shouldLog(level) {
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

export function log(level, ...args) {
  if (!shouldLog(level)) return;
  const prefix = `[${level}]`;
  if (level === 'error') console.error(prefix, ...args);
  else console.log(prefix, ...args);
}

export function registerLogLevelMethod() {
  try {
    register('sys/setLogLevel', ({ level }) => {
      if (!level || typeof level !== 'string' || !levels.includes(level)) {
        const err = new Error('Invalid params: level');
        err.code = -32602; // JSON-RPC invalid params
        err.data = { allowed: levels };
        throw err;
      }
      const previous = currentLevel;
      currentLevel = level;
      try {
        if (previous !== currentLevel) {
          emitEvent('log/level', { previous, current: currentLevel });
        }
      } catch (error) {
        console.warn(`[mcp-logging] Failed to emit log level change event: ${error.message}`);
      }
      return { level: currentLevel, changed: previous !== currentLevel };
    });
  } catch {
    // ignore duplicate registration
  }
}

registerLogLevelMethod();
