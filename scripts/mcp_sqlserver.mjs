#!/usr/bin/env node
// Persistent minimal MCP server for SQL Server. Provides sql/query method.
import sql from 'mssql';
import './load_env.mjs';
import './mcp_logging.mjs';
import { createServer } from './mcp_rpc_base.mjs';

if (!process.env.SQLSERVER_CONNECTION_STRING) {
  process.stdout.write(
    JSON.stringify({ type: 'error', error: 'SQLSERVER_CONNECTION_STRING not set' }) + '\n',
  );
  process.exit(1);
}

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

createServer(({ register }) => {
  register('sql/query', async (params) => {
    const query = params?.query || 'SELECT 1 AS ok';
    const rows = await doQuery(query);
    return { rows };
  });
});
