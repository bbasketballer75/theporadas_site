#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

import { config } from 'dotenv';

config();

function log(obj) {
  console.log(JSON.stringify({ type: 'status', ...obj }, null, 2));
}

// Check if MCP supervisor is running
function checkSupervisor() {
  try {
    const child = spawn('tasklist', ['/FI', 'IMAGENAME eq node.exe'], { stdio: 'pipe' });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', () => {
      const isRunning = output.includes('mcp_supervisor.mjs');
      log({
        supervisor: {
          running: isRunning,
          status: isRunning ? 'active' : 'inactive',
          note: isRunning
            ? 'MCP servers should be available'
            : 'Run "npm run mcp:start" to start servers',
        },
      });
    });
  } catch (error) {
    log({
      supervisor: {
        running: false,
        status: 'unknown',
        error: error.message,
      },
    });
  }
}

// Test individual server connectivity
async function testServer(name, cmd, args) {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000,
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const isReady = output.includes('"type":"ready"') || output.includes('"method":"fs/ready"');
        resolve({
          name,
          available: code === 0 && isReady,
          exitCode: code,
          hasOutput: output.length > 0,
          hasErrors: errorOutput.length > 0,
        });
      });

      child.on('error', (error) => {
        resolve({
          name,
          available: false,
          error: error.message,
        });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          name,
          available: false,
          error: 'timeout',
        });
      }, 5000);
    } catch (error) {
      resolve({
        name,
        available: false,
        error: error.message,
      });
    }
  });
}

async function checkServers() {
  const servers = [
    { name: 'filesystem', cmd: process.execPath, args: [resolve('scripts/mcp_filesystem.mjs')] },
    { name: 'tavily', cmd: process.execPath, args: [resolve('scripts/mcp_tavily.mjs')] },
  ];

  log({ message: 'Testing MCP server availability...' });

  const results = await Promise.all(
    servers.map((server) => testServer(server.name, server.cmd, server.args)),
  );

  const serverStatus = {};
  results.forEach((result) => {
    serverStatus[result.name] = result;
  });

  log({ servers: serverStatus });
}

async function main() {
  log({ message: 'MCP Status Check', timestamp: new Date().toISOString() });

  checkSupervisor();

  // Wait a bit for supervisor check to complete
  setTimeout(() => {
    checkServers();
  }, 1000);
}

main().catch(console.error);
