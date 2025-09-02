describe('filesystem policy & errors', () => {
  it.skip('enforces allowlist, size limit, mkdir/delete, traversal, stat', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fs-pol-'));
    writeFileSync(join(root, 'seed.txt'), 'hello');
    const serverPath = join(process.cwd(), 'scripts', 'mcp_filesystem.mjs');
    const env = {
      ...process.env,
      MCP_FS_ROOT: root,
      MCP_FS_MAX_BYTES: '5',
      MCP_FS_ALLOW_WRITE_GLOBS: 'allowed/**',
    } as Record<string, string>;
    const c = rpc(serverPath, env);
    await c.next((o) => o.method === 'fs/ready');

    c.send({ jsonrpc: '2.0', id: 1, method: 'fs/read', params: { path: '../hack.txt' } });
    const trav = (await c.next((o) => o.id === 1)) as RpcEnvelope;
    expect(trav.error).toBeDefined();
    expect(trav.error?.code).toBe(2500);

    c.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'fs/write',
      params: { path: 'other/out.txt', content: 'ok' },
    });
    const denied = (await c.next((o) => o.id === 2)) as RpcEnvelope;
    expect(denied.error?.code).toBe(2501);

    c.send({
      jsonrpc: '2.0',
      id: 3,
      method: 'fs/write',
      params: { path: 'allowed/big.txt', content: '123456' },
    });
    const tooLarge = (await c.next((o) => o.id === 3)) as RpcEnvelope;
    expect(tooLarge.error?.code).toBe(2503);

    c.send({ jsonrpc: '2.0', id: 4, method: 'fs/mkdir', params: { path: 'allowed/dir1' } });
    const mk = (await c.next((o) => o.id === 4)) as RpcEnvelope;
    expect(mk.result?.created).toBe(true);

    c.send({
      jsonrpc: '2.0',
      id: 5,
      method: 'fs/write',
      params: { path: 'allowed/dir1/file.txt', content: '12345' },
    });
    const wsmall = (await c.next((o) => o.id === 5)) as RpcEnvelope;
    expect(wsmall.result?.written).toBe(true);

    c.send({ jsonrpc: '2.0', id: 6, method: 'fs/stat', params: { path: 'allowed/dir1/file.txt' } });
    const st = (await c.next((o) => o.id === 6)) as RpcEnvelope;
    expect(st.result?.size).toBe(5);

    c.send({
      jsonrpc: '2.0',
      id: 7,
      method: 'fs/delete',
      params: { path: 'allowed/dir1/file.txt' },
    });
    const del = (await c.next((o) => o.id === 7)) as RpcEnvelope;
    expect(del.result?.deleted).toBe(true);

    c.send({ jsonrpc: '2.0', id: 8, method: 'fs/stat', params: { path: 'allowed/dir1/file.txt' } });
    const nf = (await c.next((o) => o.id === 8)) as RpcEnvelope;
    expect(nf.error?.code).toBe(2502);

    c.child.kill();
  });
});
