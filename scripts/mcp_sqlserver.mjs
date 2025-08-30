#!/usr/bin/env node
// Persistent minimal MCP server for SQL Server. Provides sql/query method.
import './load_env.mjs';
import './mcp_logging.mjs';
import sql from 'mssql';

if (!process.env.SQLSERVER_CONNECTION_STRING) {
  process.stdout.write(
    JSON.stringify({ type: 'error', error: 'SQLSERVER_CONNECTION_STRING not set' }) + '\n',
  );
  process.exit(1);
}

const methods = ['sql/query'];
process.stdout.write(
  JSON.stringify({ type: 'ready', methods, schema: { service: 'sqlserver', version: 1 } }) + '\n',
);

let poolPromise;
async function getPool() {
  if (!poolPromise) poolPromise = sql.connect(process.env.SQLSERVER_CONNECTION_STRING);
  return poolPromise;
}

async function doQuery(q) {
  const pool = await getPool();
  const result = await pool.request().query(q);
  return result.recordset;
}

process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  const lines = buf.split(/\n/);
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.jsonrpc !== '2.0' || !msg.method) continue;
    if (msg.method === 'sql/query') {
      const query = msg.params?.query || 'SELECT 1 AS ok';
      doQuery(query)
        .then((rows) => sendResult(msg.id, { rows }))
        .catch((e) => sendError(msg.id, 'QUERY_FAILED', e.message));
      continue;
    }
    if (/listMethods$/i.test(msg.method)) {
      sendResult(msg.id, { methods });
      continue;
    }
    sendError(msg.id, 'NOT_IMPLEMENTED', 'Unknown method');
  }
});

function sendResult(id, result) {
  if (id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function sendError(id, code, message) {
  if (id !== undefined)
    process.stdout.write(
      JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, data: { code }, message } }) +
        '\n',
    );
}
