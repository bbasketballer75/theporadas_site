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

    const entry = {
      ts: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      ua: req.headers.get('user-agent') || '',
      report: report || bodyText,
    };

    // For now, just log. (Vercel will aggregate in function logs)
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
