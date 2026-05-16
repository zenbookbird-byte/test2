import { json, ADDR_RE } from '../../_lib/auth.js';

function randHex(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

// GET /api/auth/challenge?wallet=<address>
// Returns a one-time message for the wallet to sign.
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 503);
  const wallet = (new URL(request.url).searchParams.get('wallet') || '').trim();
  if (!ADDR_RE.test(wallet)) return json({ error: 'Invalid wallet address' }, 400);

  const nonce = randHex(16);
  const issuedAt = new Date().toISOString();
  const message =
    `Helix wants you to sign in with your Solana account.\n\n` +
    `Wallet: ${wallet}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}\n\n` +
    `Signing is free and only proves wallet ownership. ` +
    `It does NOT approve any transaction or transfer.`;

  await env.DB.prepare(
    'INSERT INTO auth_nonces (nonce, wallet, message, created_at) VALUES (?,?,?,?)',
  ).bind(nonce, wallet, message, Date.now()).run();

  // Opportunistic cleanup of stale challenges.
  await env.DB.prepare('DELETE FROM auth_nonces WHERE created_at < ?')
    .bind(Date.now() - 10 * 60 * 1000).run();

  return json({ nonce, message });
}
