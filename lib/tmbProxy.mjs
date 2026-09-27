/**
 * Shared TMB iTransit proxy logic (Vercel function api/tmb.js and server/index.mjs).
 * Keeps TMB app_id/app_key on the server: the TMB reuse licence is bound to the
 * registered app and keys in client JavaScript could be copied by anyone.
 */
const ALLOWED = [/^itransit\/bus\/parades\/[0-9]{1,6}$/, /^itransit\/metro\/estacions$/];

// Origins allowed to call the proxy from another origin (the Android app runs on https://localhost).
const CORS_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost'];

export function corsHeaders(origin) {
  const extra = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && [...CORS_ORIGINS, ...extra].includes(origin)) {
    return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
  }
  return {};
}

/** @returns {Promise<{ status: number, body: string, cacheSeconds?: number }>} */
export async function proxyTmb(subPath, query) {
  const { TMB_APP_ID, TMB_APP_KEY } = process.env;
  const API = process.env.TMB_API_BASE || 'https://api.tmb.cat/v1';
  if (!TMB_APP_ID || !TMB_APP_KEY) return { status: 503, body: JSON.stringify({ error: 'TMB real time not configured' }) };
  const sub = String(subPath || '').replace(/^\/+/, '');
  if (!ALLOWED.some((re) => re.test(sub))) return { status: 404, body: JSON.stringify({ error: 'not allowed' }) };
  const qs = new URLSearchParams();
  const est = query?.estacions;
  if (est !== undefined) {
    if (typeof est !== 'string' || !/^[0-9,]{1,200}$/.test(est)) return { status: 400, body: JSON.stringify({ error: 'bad estacions' }) };
    qs.set('estacions', est);
  }
  qs.set('app_id', TMB_APP_ID);
  qs.set('app_key', TMB_APP_KEY);
  try {
    const r = await fetch(`${API}/${sub}?${qs}`, { signal: AbortSignal.timeout(8000) });
    const body = await r.text();
    return { status: r.status, body, cacheSeconds: r.ok ? 15 : 0 };
  } catch {
    return { status: 502, body: JSON.stringify({ error: 'TMB API unreachable' }) };
  }
}
