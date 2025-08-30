#!/usr/bin/env ts-node
/* Idempotent DB seed script */
import { createClientFromEnv } from '../../src/db/retryClient.js';

async function main() {
  const client = createClientFromEnv();
  try {
    // Simple example schema & seed (adjust to real domain later)
    await client.query(`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Guest')
      CREATE TABLE Guest (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );`);

    // Insert sample rows only if table empty
    const rows = await client.query<{ Id: number }>('SELECT TOP 1 Id FROM Guest');
    if (rows.length === 0) {
      await client.query("INSERT INTO Guest (Name) VALUES ('Alice'), ('Bob'), ('Charlie')");

      console.log('Seeded Guest table with sample data');
    } else {
      console.log('Guest table already has data; skipping inserts');
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
