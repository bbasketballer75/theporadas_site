#!/usr/bin/env node
import { spawn } from 'node:child_process';

const child = spawn(
  'cmd.exe',
  ['/c', 'C:\\Users\\Austin\\AppData\\Local\\nvm\\v22.17.1\\npx.cmd', '-y', '@mem0/mcp-server'],
  {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  },
);

child.on('exit', (code) => {
  console.log(`Child exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});

// Forward stdin to child
process.stdin.pipe(child.stdin);

// Forward stdout from child
child.stdout.pipe(process.stdout);

// Forward stderr from child
child.stderr.pipe(process.stderr);
