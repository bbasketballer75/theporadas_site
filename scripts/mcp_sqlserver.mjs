#!/usr/bin/env node
// Minimal placeholder MCP-style server for SQL Server queries
import sql from 'mssql';
import { out, fail } from './mcp_util.mjs';

const conn = process.env.SQLSERVER_CONNECTION_STRING;
if (!conn) fail('SQLSERVER_CONNECTION_STRING not set');

async function run(query) {
  const pool = await sql.connect(conn);
  const result = await pool.request().query(query);
  return result.recordset;
}

const query = process.argv.slice(2).join(' ') || 'SELECT 1 AS ok';
run(query)
  .then((rows) => {
    out({ query, rows });
    process.exit(0);
  })
  .catch((e) => fail(e.message));
