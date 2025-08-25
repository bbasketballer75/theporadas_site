import { waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('main bootstrap', () => {
  it('mounts App into #root with #appShell present', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    vi.resetModules();
    await act(async () => {
      await import('../src/main');
    });
    await waitFor(() => {
      expect(document.getElementById('appShell')).toBeTruthy();
    });
  });

  it('throws if #root missing', async () => {
    // Ensure no root present
    const existing = document.getElementById('root');
    if (existing) existing.remove();
    await expect(
      async () =>
        await act(async () => {
          vi.resetModules();
          await import('../src/main');
        }),
    ).rejects.toThrow(/Root element/);
  });
});
