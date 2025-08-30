import { spawn } from 'node:child_process';

const servers = ['mcp_pieces', 'mcp_python', 'mcp_playwright', 'mcp_puppeteer'];

for (const s of servers) {
  await new Promise((resolve) => {
    const child = spawn(process.execPath, [`scripts/${s}.mjs`], {
      env: { ...process.env, DISABLE_MCP_KEEPALIVE: '1' },
    });
    let out = '';
    let invoked = false;
    const timeout = setTimeout(() => {
      if (!child.killed) child.kill();
      resolve();
    }, 2500);
    child.stdout.on('data', (d) => {
      out += d.toString();
      if (!invoked && out.includes('"type":"ready"')) {
        invoked = true;
        try {
          child.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'sys/setLogLevel',
              params: { level: 'debug' },
            }) + '\n',
          );
        } catch {}
        setTimeout(() => {
          if (!child.killed) child.kill();
        }, 300);
      }
    });
    child.on('exit', () => {
      clearTimeout(timeout);
      const hasMethodListed = /setLogLevel/.test(out);
      console.log(
        `${s}: ${hasMethodListed ? 'method listed' : 'ready observed'}; attempted log-level set`,
      );
      resolve();
    });
  });
}
