export const config = { runtime: 'edge' };

// Minimal CSP report collection endpoint (report-to or report-uri)
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  try {
    const bodyText = await req.text();
    let report = null;
    try {
      report = JSON.parse(bodyText);
    } catch {
      // Some browsers send application/csp-report with JSON structure already
    }

    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const entry = {
      ts: now.toISOString(),
      day: dayKey,
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      ua: req.headers.get('user-agent') || '',
      blockedURI: report?.['csp-report']?.['blocked-uri'] || report?.['blocked-uri'] || null,
      violatedDirective:
        report?.['csp-report']?.['violated-directive'] || report?.['violated-directive'] || null,
      effectiveDirective:
        report?.['csp-report']?.['effective-directive'] || report?.['effective-directive'] || null,
      originalPolicy:
        report?.['csp-report']?.['original-policy'] || report?.['original-policy'] || null,
      disposition: report?.['csp-report']?.disposition || report?.disposition || null,
      sourceFile: report?.['csp-report']?.['source-file'] || report?.['source-file'] || null,
      lineNumber: report?.['csp-report']?.['line-number'] || report?.['line-number'] || null,
      columnNumber: report?.['csp-report']?.['column-number'] || report?.['column-number'] || null,
      raw: report || bodyText,
    };

    console.log('[csp-report]', JSON.stringify(entry));

    return new Response(JSON.stringify({ received: true }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
