/* Sol Scope — Solana wallet tracker
 * Talks to the public Solana JSON-RPC and CoinGecko price API directly.
 * No external libraries; works as a static file.
 */

const RPC = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
};
const EXPLORER = 'https://explorer.solana.com';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const LAMPORTS_PER_SOL = 1_000_000_000;

const state = {
  network: 'mainnet-beta',
  solPrice: null,
};

/* ---------- DOM helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showStatus(message, variant = 'loading') {
  const el = $('#status');
  el.hidden = false;
  el.className = `status ${variant}`;
  el.textContent = message;
}
function clearStatus() { $('#status').hidden = true; $('#status').textContent = ''; }

function shorten(addr, head = 6, tail = 6) {
  if (!addr || addr.length <= head + tail + 1) return addr || '';
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
function formatNum(n, max = 6) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}
function timeAgo(unixSec) {
  if (!unixSec) return '—';
  const s = Math.floor(Date.now() / 1000 - unixSec);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/* Base58 validation — minimal, no decoding needed for our use case */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isValidAddress(addr) { return BASE58_RE.test(addr.trim()); }

/* ---------- RPC ---------- */
async function rpc(method, params = []) {
  const url = RPC[state.network];
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method}: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

async function fetchSolPrice() {
  if (state.network !== 'mainnet-beta') return null;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    if (!res.ok) return null;
    const json = await res.json();
    return json?.solana?.usd ?? null;
  } catch {
    return null;
  }
}

/* ---------- Renderers ---------- */
function renderAccount(address, accountInfo) {
  $('#account-addr').textContent = address;
  $('#explorer-link').href = `${EXPLORER}/address/${address}?cluster=${state.network === 'mainnet-beta' ? 'mainnet' : state.network}`;

  const exec = accountInfo?.executable === true;
  const owner = accountInfo?.owner;
  $('#tag-executable').hidden = !exec;
  $('#tag-system').hidden = !(owner === '11111111111111111111111111111111' && !exec);
  $('#tag-empty').hidden = !!accountInfo;
}

function renderBalance(lamports) {
  const sol = (lamports ?? 0) / LAMPORTS_PER_SOL;
  $('#sol-balance').textContent = formatNum(sol, 6);
  if (state.solPrice && sol) {
    const usd = sol * state.solPrice;
    $('#sol-usd').textContent = `$${formatNum(usd, 2)}`;
  } else {
    $('#sol-usd').textContent = '—';
  }
}

function renderTokens(accounts) {
  const list = $('#tokens');
  list.innerHTML = '';
  const tmpl = $('#token-row-tmpl');

  const parsed = accounts.map(a => {
    const info = a.account?.data?.parsed?.info;
    const amount = info?.tokenAmount;
    return {
      mint: info?.mint,
      owner: info?.owner,
      ata: a.pubkey,
      decimals: amount?.decimals ?? 0,
      uiAmount: amount?.uiAmount ?? 0,
    };
  });

  const nonzero = parsed.filter(t => t.uiAmount > 0)
                       .sort((a, b) => b.uiAmount - a.uiAmount);

  $('#token-count').textContent = parsed.length;
  $('#nonzero-count').textContent = nonzero.length;
  $('#tokens-meta').textContent = `${nonzero.length} non-zero / ${parsed.length} total`;

  if (!parsed.length) {
    list.innerHTML = `<div class="empty">No SPL token accounts found for this wallet.</div>`;
    return;
  }

  const rows = nonzero.length ? nonzero : parsed.slice(0, 5);
  for (const t of rows) {
    const node = tmpl.content.firstElementChild.cloneNode(true);
    $('.token-mint', node).textContent = shorten(t.mint, 8, 8);
    $('.token-sub', node).textContent = `Account ${shorten(t.ata, 6, 6)} · ${t.decimals} decimals`;
    $('.token-amount', node).textContent = formatNum(t.uiAmount, Math.min(t.decimals, 6));
    // colorize dot from mint hash
    const hue = [...t.mint || ''].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360;
    $('.token-dot', node).style.background =
      `linear-gradient(135deg, hsl(${hue} 80% 65%), hsl(${(hue + 80) % 360} 75% 55%))`;
    list.appendChild(node);
  }
}

function renderTransactions(sigs) {
  const list = $('#tx-list');
  list.innerHTML = '';
  const tmpl = $('#tx-row-tmpl');

  $('#tx-count').textContent = sigs.length;
  $('#tx-meta').textContent = sigs.length ? `Last ${sigs.length} signatures` : 'No history';

  if (!sigs.length) {
    list.innerHTML = `<li class="empty">No transactions found.</li>`;
    return;
  }

  for (const s of sigs) {
    const node = tmpl.content.firstElementChild.cloneNode(true);
    const failed = !!s.err;
    $('.tx-status', node).classList.toggle('err', failed);
    const sigEl = $('.tx-sig', node);
    sigEl.textContent = shorten(s.signature, 8, 8);
    sigEl.href = `${EXPLORER}/tx/${s.signature}?cluster=${state.network === 'mainnet-beta' ? 'mainnet' : state.network}`;
    $('.tx-sub', node).textContent = failed
      ? `Failed${s.memo ? ` · ${s.memo}` : ''}`
      : (s.memo || 'Confirmed');
    $('.tx-time', node).textContent = timeAgo(s.blockTime);
    $('.tx-slot', node).textContent = `slot ${s.slot}`;
    list.appendChild(node);
  }
}

/* ---------- Main flow ---------- */
async function trackAddress(address) {
  if (!isValidAddress(address)) {
    showStatus('That doesn’t look like a Solana address (base58, 32–44 chars).', 'error');
    return;
  }
  showStatus('Fetching wallet…', 'loading');
  $('#dashboard').hidden = true;

  try {
    state.solPrice = await fetchSolPrice();

    const [accountInfo, lamports, splV1, splV2, sigs] = await Promise.all([
      rpc('getAccountInfo', [address, { encoding: 'base64' }]).then(r => r?.value).catch(() => null),
      rpc('getBalance', [address]).then(r => r?.value ?? 0).catch(() => 0),
      rpc('getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM_ID }, { encoding: 'jsonParsed' }])
        .then(r => r?.value ?? []).catch(() => []),
      rpc('getTokenAccountsByOwner', [address, { programId: TOKEN_2022_PROGRAM_ID }, { encoding: 'jsonParsed' }])
        .then(r => r?.value ?? []).catch(() => []),
      rpc('getSignaturesForAddress', [address, { limit: 15 }]).catch(() => []),
    ]);

    renderAccount(address, accountInfo);
    renderBalance(lamports);
    renderTokens([...splV1, ...splV2]);
    renderTransactions(sigs || []);

    $('#dashboard').hidden = false;
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus(`Couldn't load wallet: ${err.message}`, 'error');
  }
}

/* ---------- Wire up UI ---------- */
function init() {
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#address').value.trim();
    if (v) trackAddress(v);
  });

  $('#paste-btn').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        $('#address').value = text.trim();
        $('#address').focus();
      }
    } catch {
      showStatus('Clipboard access blocked — paste manually.', 'error');
    }
  });

  $('#copy-btn').addEventListener('click', async () => {
    const addr = $('#account-addr').textContent;
    if (!addr || addr === '—') return;
    try {
      await navigator.clipboard.writeText(addr);
      const btn = $('#copy-btn');
      const prev = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = prev; }, 1200);
    } catch {}
  });

  $$('.chip').forEach(c => c.addEventListener('click', () => {
    const v = c.dataset.addr;
    $('#address').value = v;
    trackAddress(v);
  }));

  $$('.net-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.net-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    state.network = btn.dataset.network;
    const v = $('#address').value.trim();
    if (v && isValidAddress(v)) trackAddress(v);
  }));
}

init();
