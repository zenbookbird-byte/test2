/**
 * Same-origin Solana RPC proxy (Cloudflare Pages Function).
 *
 * Keeps the paid RPC credential server-side so it is never exposed in
 * the static front-end. The browser calls /api/rpc; this function adds
 * the real upstream URL and forwards the JSON-RPC request.
 *
 * Setup — Cloudflare Pages dashboard > Settings > Environment variables:
 *   RPC_UPSTREAM    your full QuickNode/Helius RPC URL (including token)
 *   ALLOWED_ORIGIN  https://your-domain.com   (optional; restricts callers)
 *
 * If you deploy on Netlify/Vercel instead, this file must be adapted to
 * that platform's function format.
 */

const ALLOWED_METHODS = new Set([
  'getAccountInfo', 'getBalance', 'getBlockHeight', 'getEpochInfo',
  'getFeeForMessage', 'getHealth', 'getLatestBlockhash', 'getMultipleAccounts',
  'getMinimumBalanceForRentExemption', 'getParsedAccountInfo',
  'getParsedTransaction', 'getRecentPrioritizationFees', 'getSignatureStatuses',
  'getSignaturesForAddress', 'getSlot', 'getTokenAccountsByOwner',
  'getTokenLargestAccounts', 'getTokenSupply', 'getTransaction',
  'isBlockhashValid', 'sendTransaction', 'simulateTransaction',
]);

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }) {
  const upstream = env.RPC_UPSTREAM;
  if (!upstream) return jsonResponse({ error: 'RPC proxy not configured' }, 503);

  // Optional origin allowlist — stops other sites from using your proxy.
  if (env.ALLOWED_ORIGIN) {
    const origin = request.headers.get('origin');
    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: 'Origin not allowed' }, 403);
    }
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return jsonResponse({ error: 'Unable to read request' }, 400);
  }
  if (raw.length > 100_000) return jsonResponse({ error: 'Payload too large' }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Only forward known, safe JSON-RPC methods — never an open RPC relay.
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > 20) {
    return jsonResponse({ error: 'Invalid batch size' }, 400);
  }
  for (const call of calls) {
    if (!call || typeof call.method !== 'string' || !ALLOWED_METHODS.has(call.method)) {
      return jsonResponse({ error: 'RPC method not allowed' }, 403);
    }
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
    });
  } catch {
    return jsonResponse({ error: 'Upstream RPC unreachable' }, 502);
  }

  const text = await upstreamRes.text();
  return new Response(text, {
    status: upstreamRes.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
