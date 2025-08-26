#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
  Compute approximate token delta between the PR HEAD and its base branch.
  Strategy:
    - Determine base ref from GITHUB_BASE_REF (PR context) or fallback to 'main'.
    - Ensure the base ref is fetched (checkout action with fetch-depth: 0 recommended).
    - Run git diff (no context) for the full tree: base...HEAD.
    - Count tokens as whitespace-delimited words on added/removed lines (excluding diff headers).
    - Emit artifacts/token-deltas.json with { added, removed, net }.

  This heuristic (word-level) is intentionally lightweight. It provides a directional
  signal for content / code growth that can be tightened later (e.g., true model tokenization).
*/

function safeExec(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function countTokens(lines) {
  let tokens = 0;
  for (const line of lines) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    tokens += parts.length;
  }
  return tokens;
}

function main() {
  const baseRef = process.env.GITHUB_BASE_REF || 'main';
  let diff = '';
  try {
    // Use three-dot to diff against merge base.
    diff = safeExec(`git diff --unified=0 --no-color origin/${baseRef}...HEAD`);
  } catch (e) {
    console.error('[token-deltas] Failed to obtain diff:', e.message);
  }
  if (!diff) {
    console.warn('[token-deltas] Empty diff; writing zeros.');
  }
  const addedLines = [];
  const removedLines = [];
  for (const rawLine of diff.split(/\r?\n/)) {
    if (!rawLine) continue;
    // Skip diff metadata lines
    if (rawLine.startsWith('+++') || rawLine.startsWith('---') || rawLine.startsWith('@@')) continue;
    if (rawLine.startsWith('+')) {
      addedLines.push(rawLine.substring(1));
    } else if (rawLine.startsWith('-')) {
      removedLines.push(rawLine.substring(1));
    }
  }
  const added = countTokens(addedLines);
  const removed = countTokens(removedLines);
  const net = added - removed;
  const outDir = resolve('artifacts');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'token-deltas.json');
  writeFileSync(outPath, JSON.stringify({ added, removed, net, baseRef }, null, 2));
  console.log(`[token-deltas] added=${added} removed=${removed} net=${net} base=${baseRef}`);
}

main();
