import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('main bootstrap', () => {
  it('mounts App into #root with #appShell present', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    vi.resetModules();
    await import('../src/main');
    await waitFor(() => {
      expect(document.getElementById('appShell')).toBeTruthy();
    });
  });
});
