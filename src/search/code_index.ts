import crypto from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

import { embedBatch, VectorRecord } from './embeddings.js';

declare const process: {
  cwd(): string;
  argv: string[];
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

const SRC_DIR = join(process.cwd(), 'src');
const OUT_DIR = join(process.cwd(), 'search_index');
const OUT_FILE = join(OUT_DIR, 'code.json');

// We include typical TS/TSX and a few support extensions.
const VALID_EXT = new Set(['.ts', '.tsx']);

interface ExistingIndexMap {
  [hash: string]: VectorRecord;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (VALID_EXT.has(extname(entry.name))) acc.push(full);
  }
  return acc;
}

function loadExisting(): ExistingIndexMap {
  try {
    const raw = readFileSync(OUT_FILE, 'utf-8');
    const arr: VectorRecord[] = JSON.parse(raw);
    const map: ExistingIndexMap = {};
    for (const rec of arr) map[sha256(rec.text)] = rec;
    return map;
  } catch {
    return {};
  }
}

// Extract exported symbol documentation text for embedding.
// Strategy: for each source file, gather its module symbol exports via TypeChecker.
// For each export we build a textual summary combining the symbol name, kind, and any leading JSDoc.
function extractExports(program: ts.Program, file: ts.SourceFile): { id: string; text: string }[] {
  const checker = program.getTypeChecker();
  const symbol = checker.getSymbolAtLocation(file);
  if (!symbol) return [];
  const exports = checker.getExportsOfModule(symbol);
  const out: { id: string; text: string }[] = [];

  function getJsDoc(node: ts.Node): string {
    const docs = ts.getJSDocCommentsAndTags(node);
    if (!docs.length) return '';
    const parts: string[] = [];
    for (const d of docs) {
      if (ts.isJSDoc(d)) {
        const comment = d.comment ? (typeof d.comment === 'string' ? d.comment : '') : '';
        if (comment) parts.push(comment);
      }
    }
    return parts.join('\n');
  }

  for (const exp of exports) {
    const name = exp.getName();
    const declarations = exp.getDeclarations() || [];
    if (!declarations.length) continue;
    const decl = declarations[0];
    const kind = ts.SyntaxKind[decl.kind];
    const doc = getJsDoc(decl);
    let snippet = '';
    try {
      const text = decl.getText();
      snippet = text.length > 800 ? text.slice(0, 800) + '\n/*…trimmed…*/' : text;
    } catch {
      /* ignore */
    }
    const summaryParts = [
      `export ${name} (${kind})`,
      doc ? `JSDoc: ${doc}` : '',
      snippet ? `Snippet:\n${snippet}` : '',
    ].filter(Boolean);
    const textBlock = summaryParts.join('\n\n');
    out.push({ id: name, text: textBlock });
  }
  return out;
}

export async function buildCodeIndex(): Promise<VectorRecord[]> {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = walk(SRC_DIR).filter(
    (f) => !f.includes(`${join('src', 'search', 'search_index')}`),
  );
  // Create TS Program; rely on tsconfig via automatic config lookup.
  const program = ts.createProgram({ rootNames: files, options: { allowJs: false } });
  const existing = loadExisting();
  const records: VectorRecord[] = [];
  const toEmbed: string[] = [];
  const pending: { hash: string; source: string; text: string }[] = [];

  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const exports = extractExports(program, sf);
    exports.forEach((ex) => {
      const hash = sha256(ex.text);
      const source = file.replace(process.cwd() + '\\', '') + `#${ex.id}`;
      const existingRec = existing[hash];
      if (existingRec) records.push(existingRec);
      else {
        toEmbed.push(ex.text);
        pending.push({ hash, source, text: ex.text });
      }
    });
  }

  if (toEmbed.length) {
    const embeddings = await embedBatch(toEmbed);
    embeddings.forEach((embedding, i) => {
      const meta = pending[i];
      records.push({
        id: meta.hash,
        kind: 'code',
        source: meta.source,
        text: meta.text,
        embedding,
      });
    });
  }

  writeFileSync(OUT_FILE, JSON.stringify(records, null, 2));
  return records;
}

// Robust direct-execution detection (works under ts-node ESM loader too)
try {
  const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
  if (entry && import.meta.url === entry) {
    buildCodeIndex()
      .then((r) => {
        console.log(`Code index built: ${r.length} exports -> ${OUT_FILE}`);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
} catch {
  // ignore
}
