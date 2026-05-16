import { json, bs58decode, verifyEd25519, signJWT, sessionCookie, SESSION_TTL } from '../../_lib/auth.js';

// POST /api/auth/verify   body: { nonce, signature }
// signature = base64 of the 64-byte Ed25519 signature over the challenge.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 503);
  if (!env.SESSION_SECRET) return json({ error: 'Auth not configured (SESSION_SECRET)' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const nonce = body?.nonce;
  const signature = body?.signature;
  if (!nonce || !signature) return json({ error: 'Missing nonce or signature' }, 400);

  const row = await env.DB.prepare(
    'SELECT wallet, message, created_at FROM auth_nonces WHERE nonce = ?',
  ).bind(nonce).first();
  if (!row) return json({ error: 'Invalid or already-used challenge' }, 400);

  // One-time use: consume the nonce regardless of outcome.
  await env.DB.prepare('DELETE FROM auth_nonces WHERE nonce = ?').bind(nonce).run();
  if (Date.now() - row.created_at > 5 * 60 * 1000) {
    return json({ error: 'Challenge expired — try again' }, 400);
  }

  let pubKey, sigBytes;
  try {
    pubKey = bs58decode(row.wallet);
    sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  } catch {
    return json({ error: 'Malformed signature' }, 400);
  }
  if (pubKey.length !== 32 || sigBytes.length !== 64) {
    return json({ error: 'Malformed signature' }, 400);
  }

  const ok = await verifyEd25519(new TextEncoder().encode(row.message), sigBytes, pubKey);
  if (!ok) return json({ error: 'Signature verification failed' }, 401);

  const now = Date.now();
  const existing = await env.DB.prepare('SELECT wallet FROM users WHERE wallet = ?')
    .bind(row.wallet).first();
  if (!existing) {
    // New user — grant the standard 24-hour Pro trial.
    await env.DB.prepare(
      'INSERT INTO users (wallet, created_at, tier, tier_billing, tier_since, trial_until) VALUES (?,?,?,?,?,?)',
    ).bind(row.wallet, now, 'pro', 'trial', now, now + 24 * 3600 * 1000).run();
  }

  const token = await signJWT(
    { wallet: row.wallet, exp: Math.floor(now / 1000) + SESSION_TTL },
    env.SESSION_SECRET,
  );
  return json({ ok: true, wallet: row.wallet }, 200, { 'set-cookie': sessionCookie(token) });
}
