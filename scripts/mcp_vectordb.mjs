#!/usr/bin/env node
// In-process simple vector DB MCP server storing vectors + metadata in a JSONL file.
// Methods:
//  vec/add { id?, vector: number[], metadata? } -> { id }
//  vec/batchAdd { items: [{id?, vector, metadata?}] } -> { added }
//  vec/search { vector, k?, metric? } -> { matches:[{id, score, metadata}] }
//  vec/stats -> { count, dim }
//  vec/reset -> { cleared }
// Cosine similarity (default). Data persisted to VECTOR_DB_PATH (default: .vectordb.jsonl).

import './load_env.mjs';
import { createServer, appError } from './mcp_rpc_base.mjs';
import { writeFileSync, appendFileSync, readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const path = process.env.VECTOR_DB_PATH || '.vectordb.jsonl';
let dim = null;
const store = new Map(); // id -> { vector: Float64Array, metadata }

function load() {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (!obj.id || !Array.isArray(obj.vector)) continue;
      if (dim == null) dim = obj.vector.length;
      store.set(obj.id, { vector: Float64Array.from(obj.vector), metadata: obj.metadata });
    } catch (_) {}
  }
}

function persist(item) {
  appendFileSync(
    path,
    JSON.stringify({ id: item.id, vector: Array.from(item.vector), metadata: item.metadata }) +
      '\n',
  );
}

function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i],
      y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function ensureVector(v) {
  if (!Array.isArray(v) || !v.length)
    throw appError(2300, 'vector required', { domain: 'vectordb', symbol: 'E_PARAMS' });
  if (!v.every((n) => typeof n === 'number' && Number.isFinite(n)))
    throw appError(2301, 'vector elements must be finite numbers', {
      domain: 'vectordb',
      symbol: 'E_PARAMS',
    });
  if (dim == null) dim = v.length;
  else if (v.length !== dim)
    throw appError(2302, 'dimension mismatch', { domain: 'vectordb', symbol: 'E_DIM' });
  return Float64Array.from(v);
}

function addOne({ id, vector, metadata }) {
  const vec = ensureVector(vector);
  const finalId = id || randomUUID();
  store.set(finalId, { vector: vec, metadata });
  persist({ id: finalId, vector: vec, metadata });
  return finalId;
}

load();

createServer(({ register }) => {
  register('vec/add', (p = {}) => ({ id: addOne(p) }));
  register('vec/batchAdd', (p = {}) => {
    if (!Array.isArray(p.items))
      throw appError(2303, 'items array required', { domain: 'vectordb', symbol: 'E_PARAMS' });
    const added = [];
    for (const it of p.items.slice(0, 1000)) {
      try {
        added.push(addOne(it));
      } catch (e) {
        /* skip invalid */
      }
    }
    return { added };
  });
  register('vec/search', (p = {}) => {
    const { vector, k = 5, metric = 'cosine' } = p;
    const q = ensureVector(vector);
    const results = [];
    for (const [id, rec] of store.entries()) {
      let score = 0;
      if (metric === 'cosine') score = cosine(q, rec.vector);
      else throw appError(2304, 'unsupported metric', { domain: 'vectordb', symbol: 'E_METRIC' });
      results.push({ id, score, metadata: rec.metadata });
    }
    results.sort((a, b) => b.score - a.score);
    return {
      matches: results
        .slice(0, Math.min(k, 100))
        .map((m) => ({ id: m.id, score: +m.score.toFixed(6), metadata: m.metadata })),
    };
  });
  register('vec/stats', () => ({ count: store.size, dim }));
  register('vec/reset', () => {
    store.clear();
    writeFileSync(path, '');
    dim = null;
    return { cleared: true };
  });
});
