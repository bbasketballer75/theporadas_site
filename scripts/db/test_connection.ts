#!/usr/bin/env ts-node
import { createClientFromEnv } from '../../src/db/retryClient.js';

async function main() {
  const client = createClientFromEnv();
  try {
    const rows = await client.query<{ One: number }>('SELECT 1 AS One');

    console.log('Test query result:', rows);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Connection test failed:', err);
  process.exitCode = 1;
});
