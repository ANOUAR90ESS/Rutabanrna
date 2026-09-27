// Vercel Function: /api/tmb/<path> is rewritten here as /api/tmb?path=<path> (see vercel.json).
// Env (Vercel project settings): TMB_APP_ID, TMB_APP_KEY. Responses are cached 15 s at the edge.
import { corsHeaders, proxyTmb } from '../lib/tmbProxy.mjs';

export default async function handler(req, res) {
  const cors = corsHeaders(req.headers.origin);
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  const { path, ...query } = req.query;
  const r = await proxyTmb(Array.isArray(path) ? path.join('/') : path, query);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', r.cacheSeconds ? `public, s-maxage=${r.cacheSeconds}, max-age=0` : 'no-store');
  res.status(r.status).send(r.body);
}
