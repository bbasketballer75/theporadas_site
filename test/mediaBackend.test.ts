import { describe, it, expect } from 'vitest';

import { createMediaBackend } from '../src/media/backend';

describe('MediaBackend', () => {
  it('ingests a new file and returns asset', () => {
    const backend = createMediaBackend();
    const result = backend.ingest({ filePath: 'media/raw/sample.mov' });
    expect(result.asset.id).toBe('media-raw-sample-mov');
    expect(backend.get(result.asset.id)).toBeTruthy();
    expect(result.warnings).toHaveLength(0);
  });

  it('deduplicates ingest and emits warning', () => {
    const backend = createMediaBackend();
    backend.ingest({ filePath: 'media/raw/sample.mov' });
    const second = backend.ingest({ filePath: 'media/raw/sample.mov' });
    expect(second.warnings).toContain('duplicate-ingest');
    expect(backend.list()).toHaveLength(1);
  });
});
