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
import { corsHeaders, proxyTmb } from '../lib/tmbProxy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { TMB_APP_ID, PORT = 3000 } = process.env;
const CACHE_MS = 15000;

const cache = new Map();

const app = express();
app.disable('x-powered-by');

app.options('/api/tmb/*', (req, res) => res.set(corsHeaders(req.headers.origin)).sendStatus(204));
app.get('/api/tmb/*', async (req, res) => {
  res.set(corsHeaders(req.headers.origin));
  const key = req.url;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return res.set('Cache-Control', 'no-store').type('json').send(hit.body);
  const r = await proxyTmb(req.params[0], req.query);
  if (r.cacheSeconds) cache.set(key, { at: Date.now(), body: r.body });
  res.status(r.status).set('Cache-Control', 'no-store').type('json').send(r.body);
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
