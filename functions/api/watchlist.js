import { json, getSession, ADDR_RE } from '../_lib/auth.js';

async function requireSession(request, env) {
  if (!env.DB) return { error: json({ error: 'Database not configured' }, 503) };
  const s = await getSession(request, env);
  if (!s) return { error: json({ error: 'Not signed in' }, 401) };
  return { wallet: s.wallet };
}

// GET /api/watchlist — the signed-in user's tracked wallets.
export async function onRequestGet({ request, env }) {
  const sess = await requireSession(request, env);
  if (sess.error) return sess.error;
  const wl = await env.DB.prepare(
    'SELECT address, label, added_at FROM watchlist WHERE wallet = ? ORDER BY added_at DESC',
  ).bind(sess.wallet).all();
  return json({
    watchlist: (wl.results || []).map(w => ({ address: w.address, label: w.label, addedAt: w.added_at })),
  });
}

// POST /api/watchlist — add one ({ address, label }) or many ({ wallets: [...] }).
export async function onRequestPost({ request, env }) {
  const sess = await requireSession(request, env);
  if (sess.error) return sess.error;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const items = Array.isArray(body?.wallets) ? body.wallets : (body?.address ? [body] : []);
  if (!items.length) return json({ error: 'No wallets provided' }, 400);
  if (items.length > 200) return json({ error: 'Too many wallets (max 200)' }, 400);

  const now = Date.now();
  const stmts = [];
  for (const it of items) {
    const addr = String(it?.address || '').trim();
    if (!ADDR_RE.test(addr)) continue;
    const label = String(it?.label || '').slice(0, 80);
    stmts.push(env.DB.prepare(
      'INSERT INTO watchlist (wallet, address, label, added_at) VALUES (?,?,?,?) ' +
      'ON CONFLICT(wallet, address) DO UPDATE SET label = excluded.label',
    ).bind(sess.wallet, addr, label, now));
  }
  if (!stmts.length) return json({ error: 'No valid addresses' }, 400);
  await env.DB.batch(stmts);
  return json({ ok: true, added: stmts.length });
}

// DELETE /api/watchlist?address=<address>
export async function onRequestDelete({ request, env }) {
  const sess = await requireSession(request, env);
  if (sess.error) return sess.error;
  const addr = (new URL(request.url).searchParams.get('address') || '').trim();
  if (!ADDR_RE.test(addr)) return json({ error: 'Invalid address' }, 400);
  await env.DB.prepare('DELETE FROM watchlist WHERE wallet = ? AND address = ?')
    .bind(sess.wallet, addr).run();
  return json({ ok: true });
}
