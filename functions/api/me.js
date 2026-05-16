import { json, getSession } from '../_lib/auth.js';

// Trial Pro lapses to free once trial_until passes — computed server-side
// so the front-end can never grant itself Pro.
function effectiveTier(u) {
  if (u.tier === 'pro' && u.tier_billing === 'trial' && u.trial_until && Date.now() > u.trial_until) {
    return 'free';
  }
  return u.tier || 'free';
}

// GET /api/me — the signed-in user (or { user: null }).
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 503);

  const sess = await getSession(request, env);
  if (!sess) return json({ user: null });

  const u = await env.DB.prepare('SELECT * FROM users WHERE wallet = ?').bind(sess.wallet).first();
  if (!u) return json({ user: null });

  const wl = await env.DB.prepare(
    'SELECT address, label, added_at FROM watchlist WHERE wallet = ? ORDER BY added_at DESC',
  ).bind(sess.wallet).all();

  return json({
    user: {
      wallet: u.wallet,
      name: u.name,
      email: u.email,
      createdAt: u.created_at,
      tier: effectiveTier(u),
      tierBilling: u.tier_billing,
      trialUntil: u.trial_until,
      watchlist: (wl.results || []).map(w => ({
        address: w.address, label: w.label, addedAt: w.added_at,
      })),
    },
  });
}
