import crypto from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { embedBatch, VectorRecord } from './embeddings.js';

declare const process: {
  cwd(): string;
  argv: string[];
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

const CONTENT_DIR = join(process.cwd(), 'content');
const OUT_DIR = join(process.cwd(), 'search_index');
const OUT_FILE = join(OUT_DIR, 'content.json');
const MAX_CHUNK = 600;
const MIN_CHUNK = 300;

interface ExistingIndexMap {
  [hash: string]: VectorRecord;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function listMarkdown(): string[] {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(CONTENT_DIR, f));
}

export function chunkMarkdown(raw: string): string[] {
  const paragraphs = raw
    .split(/\r?\n\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;
  const flush = () => {
    if (bufLen > 0) {
      chunks.push(buf.join('\n\n'));
      buf = [];
      bufLen = 0;
    }
  };
  for (const para of paragraphs) {
    if (bufLen + para.length > MAX_CHUNK && bufLen >= MIN_CHUNK) {
      flush();
    }
    buf.push(para);
    bufLen += para.length;
    if (bufLen >= MAX_CHUNK) flush();
  }
  flush();
  return chunks;
}

function loadExisting(): ExistingIndexMap {
  try {
    const raw = readFileSync(OUT_FILE, 'utf-8');
    const arr: VectorRecord[] = JSON.parse(raw);
    const map: ExistingIndexMap = {};
    for (const rec of arr) {
      map[sha256(rec.text)] = rec;
    }
    return map;
  } catch {
    return {};
  }
}

export async function buildContentIndex(): Promise<VectorRecord[]> {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = listMarkdown();
  const existing = loadExisting();
  const newRecords: VectorRecord[] = [];
  const toEmbed: string[] = [];
  const pendingMeta: { hash: string; source: string; text: string }[] = [];
  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    const chunks = chunkMarkdown(raw);
    chunks.forEach((text, idx) => {
      const hash = sha256(text);
      const source = file.replace(process.cwd() + '\\', '') + `#${idx}`;
      const existingRec = existing[hash];
      if (existingRec) {
        newRecords.push(existingRec);
      } else {
        toEmbed.push(text);
        pendingMeta.push({ hash, source, text });
      }
    });
  }
  if (toEmbed.length) {
    const embedded = await embedBatch(toEmbed);
    embedded.forEach((embedding, i) => {
      const meta = pendingMeta[i];
      newRecords.push({
        id: meta.hash,
        kind: 'content',
        source: meta.source,
        text: meta.text,
        embedding,
      });
    });
  }
  writeFileSync(OUT_FILE, JSON.stringify(newRecords, null, 2));
  return newRecords;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildContentIndex()
    .then((r) => {
      console.log(`Content index built: ${r.length} chunks -> ${OUT_FILE}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
