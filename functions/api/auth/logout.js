import { json, clearCookie } from '../../_lib/auth.js';

// POST /api/auth/logout — clears the session cookie.
export async function onRequestPost() {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}
