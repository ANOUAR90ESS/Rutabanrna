/**
 * Production server: serves the built app (dist/) and proxies the TMB iTransit API so the
 * TMB app_id/app_key stay on the server (the TMB licence is bound to the registered app;
 * keys in client JS could be copied and reused by anyone).
 *
 *   TMB_APP_ID=… TMB_APP_KEY=… PORT=3000 node server/index.mjs
 *
 * Build the client with VITE_TMB_PROXY_URL=/api/tmb so it calls this proxy.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { TMB_APP_ID, TMB_APP_KEY, PORT = 3000 } = process.env;
const API = process.env.TMB_API_BASE || 'https://api.tmb.cat/v1';
const CACHE_MS = 15000;

// Only the endpoints the app uses: never an open relay for our licence keys.
const ALLOWED = [/^itransit\/bus\/parades\/[0-9]{1,6}$/, /^itransit\/metro\/estacions$/];
const cache = new Map();

const app = express();
app.disable('x-powered-by');

app.get('/api/tmb/*', async (req, res) => {
  const sub = req.params[0];
  if (!TMB_APP_ID || !TMB_APP_KEY) return res.status(503).json({ error: 'TMB real time not configured' });
  if (!ALLOWED.some((re) => re.test(sub))) return res.status(404).json({ error: 'not allowed' });
  const qs = new URLSearchParams();
  if (typeof req.query.estacions === 'string') {
    if (!/^[0-9,]{1,200}$/.test(req.query.estacions)) return res.status(400).json({ error: 'bad estacions' });
    qs.set('estacions', req.query.estacions);
  }
  const key = `${sub}?${qs}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return res.set('Cache-Control', 'no-store').type('json').send(hit.body);
  qs.set('app_id', TMB_APP_ID);
  qs.set('app_key', TMB_APP_KEY);
  try {
    const r = await fetch(`${API}/${sub}?${qs}`, { signal: AbortSignal.timeout(8000) });
    const body = await r.text();
    if (r.ok) cache.set(key, { at: Date.now(), body });
    res.status(r.status).set('Cache-Control', 'no-store').type('json').send(body);
  } catch {
    res.status(502).json({ error: 'TMB API unreachable' });
  }
});

// Static app (SPA fallback); sw.js and data must not be cached forever
app.use(
  express.static(path.join(ROOT, 'dist'), {
    setHeaders: (res, file) => {
      if (/sw\.js$|index\.html$|tmb-network\.json$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);
app.get('*', (_req, res) => res.sendFile(path.join(ROOT, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`BarnaTransit on :${PORT} (TMB real time ${TMB_APP_ID ? 'on' : 'off'})`));
