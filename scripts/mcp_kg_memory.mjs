#!/usr/bin/env node
// Knowledge Graph Memory MCP server using shared harness
import { kgError } from './mcp_error_codes.mjs';
import { register, createServer, appError } from './mcp_rpc_base.mjs';

const triples = [];
const MAX_TRIPLES = parseInt(process.env.MCP_KG_MAX_TRIPLES || '5000', 10);

function match(t, filter) {
  return (
    (filter.subject == null || t.subject === filter.subject) &&
    (filter.predicate == null || t.predicate === filter.predicate) &&
    (filter.object == null || t.object === filter.object)
  );
}

createServer(() => {
  register('kg/add', (params) => {
    const { subject, predicate, object } = params || {};
    if (!subject || !predicate || !object)
      throw appError(1000, 'subject,predicate,object required', {
        domain: 'kg',
        symbol: 'E_INVALID_PARAMS',
      });
    const norm = (v) => String(v).slice(0, 200);
    if (triples.length >= MAX_TRIPLES)
      throw kgError('FULL', { retryable: true, details: String(MAX_TRIPLES) });
    triples.push({
      subject: norm(subject),
      predicate: norm(predicate),
      object: norm(object),
      ts: Date.now(),
    });
    return { added: 1, size: triples.length };
  });
  register('kg/query', ({ subject, predicate, object }) => ({
    triples: triples.filter((t) => match(t, { subject, predicate, object })),
  }));
  register('kg/subjects', () => ({ subjects: Array.from(new Set(triples.map((t) => t.subject))) }));
});
