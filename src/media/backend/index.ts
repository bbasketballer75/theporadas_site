// Minimal media backend scaffolding (placeholder)
// Responsibilities (future):
// - Abstract media storage (local FS, cloud bucket, CDN publish)
// - Generate derived assets (thumbnails, posters, adaptive ladders)
// - Enforce naming & path conventions
// - Provide metadata typing for pipeline steps

export interface MediaAsset {
  id: string;
  kind: 'raw' | 'encoded' | 'poster' | 'lqip';
  sourcePath: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
  createdAt: string;
}

export interface MediaIngestRequest {
  filePath: string; // path to local raw media file
  inferDimensions?: boolean;
}

export interface MediaIngestResult {
  asset: MediaAsset;
  warnings: string[];
}

export class MediaBackend {
  private assets: Map<string, MediaAsset> = new Map();

  ingest(req: MediaIngestRequest): MediaIngestResult {
    const id = this.generateId(req.filePath);
    if (this.assets.has(id)) {
      return { asset: this.assets.get(id)!, warnings: ['duplicate-ingest'] };
    }
    const asset: MediaAsset = {
      id,
      kind: 'raw',
      sourcePath: req.filePath,
      createdAt: new Date().toISOString(),
    };
    this.assets.set(id, asset);
    return { asset, warnings: [] };
  }

  get(id: string): MediaAsset | undefined {
    return this.assets.get(id);
  }

  list(): MediaAsset[] {
    return [...this.assets.values()];
  }

  private generateId(filePath: string): string {
    // Simple deterministic id (future: content hash)
    return filePath
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }
}

export function createMediaBackend(): MediaBackend {
  return new MediaBackend();
}
