/* Sol Scope — Solana Wallet Portfolio Tracker
 * Static, no-build. Talks directly to:
 *   - Solana JSON-RPC (mainnet/devnet)
 *   - DexScreener (price + 24h change, CORS-friendly)
 *   - Jupiter token registry (symbol/name/logo, CORS-friendly)
 */

const RPC = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
};
const EXPLORER = 'https://explorer.solana.com';
const SOLSCAN = 'https://solscan.io';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const LAMPORTS_PER_SOL = 1_000_000_000;

const state = {
  network: 'mainnet-beta',
  address: null,
  holdings: [],          // [{mint, ata, decimals, uiAmount, meta?, price?, change24h?, value?}]
  txs: [],
  txBefore: null,        // pagination cursor
  hideDust: false,
  filter: '',
  jupTokenMap: null,     // Map<mint, {symbol,name,logoURI}>
  totalValue: 0,
};

/* ---------------- DOM helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function showStatus(message, variant = 'loading') {
  const el = $('#status');
  el.hidden = false;
  el.className = `status ${variant}`;
  el.textContent = message;
}
function clearStatus() { $('#status').hidden = true; }

function shorten(addr, head = 6, tail = 6) {
  if (!addr || addr.length <= head + tail + 1) return addr || '';
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
function fmt(n, max = 6) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: Math.min(max, 4) });
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}
function fmtUSD(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (abs >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
  if (abs >= 0.01) return `$${n.toFixed(3)}`;
  if (abs === 0) return '$0.00';
  return `$${n.toFixed(6)}`;
}
function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}
function fmtDelta(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${fmtUSD(Math.abs(n))}`;
}
function timeAgo(unixSec) {
  if (!unixSec) return '—';
  const s = Math.floor(Date.now() / 1000 - unixSec);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const isValidAddress = (a) => BASE58_RE.test((a || '').trim());

/* Trending tokens (curated popular Solana mints) */
const TRENDING_MINTS = [
  { mint: 'So11111111111111111111111111111111111111112',  sym: 'SOL'  },
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  sym: 'USDC' },
  { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',  sym: 'USDT' },
  { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   sym: 'JUP'  },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  sym: 'BONK' },
  { mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  sym: 'WIF'  },
  { mint: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',   sym: 'MEW'  },
  { mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',  sym: 'ETH'  },
  { mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',  sym: 'BTC'  },
  { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',   sym: 'mSOL' },
  { mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',   sym: 'RENDER'},
  { mint: '8wXtPeU6557ETkp9WHFY1n1EcU6NxDvbAggHGsMYiHsB',  sym: 'GMT'  },
  { mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',  sym: 'RAY'  },
  { mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',  sym: 'POPCAT'},
];

async function loadTrendingTicker() {
  if (state.network !== 'mainnet-beta') {
    $('#ticker-track').innerHTML = '<span class="ticker-loading muted">Prices unavailable on devnet</span>';
    return;
  }
  const mints = TRENDING_MINTS.map(t => t.mint);
  const priceMap = await fetchDexscreenerForMints(mints);
  const items = TRENDING_MINTS.map(t => {
    const p = priceMap.get(t.mint);
    if (!p) return null;
    return { sym: t.sym, mint: t.mint, price: p.price, change: p.change24h, logo: p.logoURI };
  }).filter(Boolean);

  if (!items.length) {
    $('#ticker-track').innerHTML = '<span class="ticker-loading muted">No price data right now</span>';
    return;
  }

  const renderItem = (it) => {
    const cls = it.change > 0 ? 'pos' : it.change < 0 ? 'neg' : '';
    const arrow = it.change > 0 ? '↗' : it.change < 0 ? '↘' : '→';
    return `
      <span class="ticker-item" data-mint="${it.mint}">
        ${it.logo ? `<img src="${it.logo}" alt="" onerror="this.remove()">` : ''}
        <span class="ticker-sym">${it.sym}</span>
        <span class="ticker-price">${fmtUSD(it.price, it.price < 1 ? 4 : 2)}</span>
        <span class="ticker-chg ${cls}">${arrow} ${fmtPct(it.change)}</span>
      </span>
    `;
  };

  // Duplicate the list so the marquee can loop seamlessly
  const html = items.map(renderItem).join('') + items.map(renderItem).join('');
  $('#ticker-track').innerHTML = html;
}

function explorerCluster() { return state.network === 'mainnet-beta' ? 'mainnet' : state.network; }

/* ---------------- RPC ---------------- */
async function rpc(method, params = []) {
  const res = await fetch(RPC[state.network], {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method}: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

/* ---------------- Token registry & prices ---------------- */
async function loadJupTokenMap() {
  if (state.jupTokenMap) return state.jupTokenMap;
  const map = new Map();
  // Always inject native SOL pseudo-entry
  map.set(WSOL_MINT, { symbol: 'SOL', name: 'Solana', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', decimals: 9 });
  try {
    // Jupiter strict (verified) token list
    const r = await fetch('https://tokens.jup.ag/tokens?tags=verified');
    if (r.ok) {
      const list = await r.json();
      for (const t of list) {
        map.set(t.address, { symbol: t.symbol, name: t.name, logoURI: t.logoURI, decimals: t.decimals });
      }
    }
  } catch (_) { /* offline: degrade gracefully */ }
  state.jupTokenMap = map;
  return map;
}

async function fetchDexscreenerForMints(mints) {
  // Returns Map<mint, {price, change24h, name, symbol, logoURI}>
  const out = new Map();
  if (!mints.length) return out;
  // DexScreener supports up to 30 addresses per request, comma-separated
  const chunks = [];
  for (let i = 0; i < mints.length; i += 30) chunks.push(mints.slice(i, i + 30));
  await Promise.all(chunks.map(async (chunk) => {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`);
      if (!r.ok) return;
      const json = await r.json();
      const pairs = json?.pairs || [];
      // For each mint, pick the pair with the highest 24h volume (USD)
      const bestByMint = new Map();
      for (const p of pairs) {
        const base = p.baseToken?.address;
        const vol = Number(p.volume?.h24 || 0);
        if (!base) continue;
        const prev = bestByMint.get(base);
        if (!prev || vol > prev._vol) bestByMint.set(base, { ...p, _vol: vol });
      }
      for (const [mint, p] of bestByMint) {
        out.set(mint, {
          price: Number(p.priceUsd) || null,
          change24h: Number(p.priceChange?.h24 ?? 0),
          symbol: p.baseToken?.symbol,
          name: p.baseToken?.name,
          logoURI: p.info?.imageUrl || null,
        });
      }
    } catch (_) { /* network: skip */ }
  }));
  return out;
}

/* ---------------- Main load flow ---------------- */
async function trackAddress(address) {
  address = address.trim();
  if (!isValidAddress(address)) {
    showStatus('That doesn’t look like a Solana address (base58, 32–44 chars).', 'error');
    return;
  }
  state.address = address;
  state.txBefore = null;
  state.txs = [];
  showStatus('Loading wallet…', 'loading');
  $('#empty-state').hidden = true;
  $('#dashboard').hidden = true;

  try {
    const [tokenMap, accountInfo, lamports, splV1, splV2, sigs] = await Promise.all([
      loadJupTokenMap(),
      rpc('getAccountInfo', [address, { encoding: 'base64' }]).then(r => r?.value).catch(() => null),
      rpc('getBalance', [address]).then(r => r?.value ?? 0).catch(() => 0),
      rpc('getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM_ID }, { encoding: 'jsonParsed' }])
        .then(r => r?.value ?? []).catch(() => []),
      rpc('getTokenAccountsByOwner', [address, { programId: TOKEN_2022_PROGRAM_ID }, { encoding: 'jsonParsed' }])
        .then(r => r?.value ?? []).catch(() => []),
      rpc('getSignaturesForAddress', [address, { limit: 20 }]).catch(() => []),
    ]);

    // Build holdings (SOL + SPL)
    const splAccounts = [...splV1, ...splV2].map(a => {
      const info = a.account?.data?.parsed?.info;
      const amount = info?.tokenAmount;
      return {
        mint: info?.mint,
        ata: a.pubkey,
        owner: info?.owner,
        decimals: amount?.decimals ?? 0,
        uiAmount: amount?.uiAmount ?? 0,
      };
    });

    const solHolding = {
      mint: WSOL_MINT,
      isNative: true,
      decimals: 9,
      uiAmount: (lamports || 0) / LAMPORTS_PER_SOL,
      ata: null,
    };
    const holdings = [solHolding, ...splAccounts.filter(t => t.uiAmount > 0)];

    // Fetch prices for distinct mints (skip pure dust to save calls, but include SOL always)
    const mints = [...new Set(holdings.map(h => h.mint).filter(Boolean))];
    const priceMap = state.network === 'mainnet-beta'
      ? await fetchDexscreenerForMints(mints)
      : new Map();

    // Merge metadata + prices
    for (const h of holdings) {
      const meta = tokenMap.get(h.mint) || {};
      const px = priceMap.get(h.mint) || {};
      h.symbol = px.symbol || meta.symbol || null;
      h.name = px.name || meta.name || null;
      h.logoURI = meta.logoURI || px.logoURI || null;
      h.price = px.price ?? null;
      h.change24h = (px.change24h ?? null);
      h.value = h.price ? h.uiAmount * h.price : 0;
    }

    // Add empty-token accounts AFTER price merge so allocation isn't skewed
    const emptyAtas = splAccounts.filter(t => t.uiAmount === 0);

    state.holdings = holdings.sort((a, b) => (b.value || 0) - (a.value || 0));
    state.totalValue = state.holdings.reduce((s, h) => s + (h.value || 0), 0);
    state.emptyAtasCount = emptyAtas.length;

    state.txs = sigs || [];
    state.txBefore = state.txs.length ? state.txs[state.txs.length - 1].signature : null;

    renderAll(accountInfo, lamports);
    $('#dashboard').hidden = false;
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus(`Couldn't load wallet: ${err.message}`, 'error');
  }
}

/* ---------------- Rendering ---------------- */
function renderAll(accountInfo, lamports) {
  renderAccount(accountInfo);
  renderPortfolio(lamports);
  renderHoldings();
  renderActivity();
  renderAnalytics(accountInfo);
  renderPnL();
}

function renderAccount(accountInfo) {
  const a = state.address;
  $('#account-addr').textContent = a;
  $('#explorer-link').href = `${EXPLORER}/address/${a}?cluster=${explorerCluster()}`;
  $('#solscan-link').href = `${SOLSCAN}/account/${a}${state.network !== 'mainnet-beta' ? `?cluster=${state.network}` : ''}`;

  const exec = accountInfo?.executable === true;
  const owner = accountInfo?.owner;
  $('#tag-executable').hidden = !exec;
  $('#tag-system').hidden = !(owner === '11111111111111111111111111111111' && !exec);
  $('#tag-empty').hidden = !!accountInfo;

  // Avatar gradient from address hash
  const hue = [...a].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 360;
  $('#avatar').style.background =
    `conic-gradient(from 180deg at 50% 50%, hsl(${hue} 90% 60%), hsl(${(hue + 100) % 360} 80% 55%), hsl(${(hue + 220) % 360} 85% 60%), hsl(${hue} 90% 60%))`;
}

function renderPortfolio(lamports) {
  const sol = (lamports || 0) / LAMPORTS_PER_SOL;
  $('#sol-balance').textContent = fmt(sol, 4);
  const solPrice = state.holdings.find(h => h.isNative)?.price;
  $('#sol-usd').textContent = solPrice ? `${fmtUSD(sol * solPrice)} @ ${fmtUSD(solPrice, 2)}` : '—';

  const total = state.totalValue;
  $('#portfolio-total').textContent = fmtUSD(total);
  $('#donut-total').textContent = fmtUSD(total);

  // 24h portfolio change estimate
  const pnl24h = state.holdings.reduce((s, h) => {
    if (!h.price || h.change24h == null) return s;
    const prev = h.value / (1 + h.change24h / 100);
    return s + (h.value - prev);
  }, 0);
  const prevTotal = total - pnl24h;
  const pct = prevTotal ? (pnl24h / prevTotal) * 100 : 0;
  const pnlEl = $('#portfolio-change');
  pnlEl.textContent = `${pnl24h >= 0 ? '▲' : '▼'} ${fmtDelta(pnl24h)} (${fmtPct(pct)})`;
  pnlEl.className = `delta ${pnl24h > 0 ? 'pos' : pnl24h < 0 ? 'neg' : 'neutral'}`;
  $('#pnl-24h').textContent = fmtDelta(pnl24h);
  $('#pnl-24h').style.color = pnl24h > 0 ? 'var(--pos)' : pnl24h < 0 ? 'var(--neg)' : '';
  $('#pnl-24h-pct').textContent = fmtPct(pct);

  const tokensWithBal = state.holdings.filter(h => h.uiAmount > 0);
  $('#token-count').textContent = tokensWithBal.length;
  $('#nonzero-count').textContent = tokensWithBal.length;
  $('#badge-holdings').textContent = tokensWithBal.length;
  $('#portfolio-sub').textContent = `${fmt(sol, 2)} SOL · ${tokensWithBal.length} tokens` + (state.emptyAtasCount ? ` · ${state.emptyAtasCount} empty ATAs` : '');
}

function renderHoldings() {
  const body = $('#holdings-body');
  body.innerHTML = '';
  const tmpl = $('#holdings-row-tmpl');

  let rows = state.holdings.filter(h => h.uiAmount > 0);
  if (state.hideDust) rows = rows.filter(h => (h.value || 0) >= 1);
  if (state.filter) {
    const q = state.filter.toLowerCase();
    rows = rows.filter(h =>
      (h.symbol || '').toLowerCase().includes(q) ||
      (h.name || '').toLowerCase().includes(q) ||
      (h.mint || '').toLowerCase().includes(q)
    );
  }

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty">No holdings to show.</div></td></tr>`;
    return;
  }

  const total = state.totalValue || 1;
  for (const h of rows) {
    const node = tmpl.content.firstElementChild.cloneNode(true);
    if (h.mint) node.dataset.mint = h.mint;
    const sym = h.symbol || 'Unknown';
    const sub = h.isNative ? 'Native SOL' : (h.name ? `${h.name} · ${shorten(h.mint, 4, 4)}` : shorten(h.mint, 6, 6));
    $('.token-sym', node).textContent = sym;
    $('.token-sub', node).textContent = sub;
    const img = $('.token-logo', node);
    if (h.logoURI) {
      img.src = h.logoURI;
      img.onerror = () => { img.removeAttribute('src'); img.classList.add('fallback'); img.textContent = (sym || '?').slice(0, 2).toUpperCase(); };
    } else {
      img.removeAttribute('src');
      img.classList.add('fallback');
      img.textContent = (sym || '?').slice(0, 2).toUpperCase();
      const hue = [...(h.mint || '')].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 0) % 360;
      img.style.background = `linear-gradient(135deg, hsl(${hue} 80% 65%), hsl(${(hue + 80) % 360} 75% 55%))`;
    }
    $('.t-price', node).textContent = h.price ? fmtUSD(h.price, h.price < 1 ? 6 : 4) : '—';
    const chg = $('.t-change', node);
    if (h.change24h == null) {
      chg.textContent = '—';
      chg.classList.add('neutral');
    } else {
      chg.textContent = fmtPct(h.change24h);
      chg.classList.add(h.change24h > 0 ? 'pos' : h.change24h < 0 ? 'neg' : 'neutral');
    }
    $('.t-balance', node).textContent = fmt(h.uiAmount, Math.min(h.decimals || 4, 6));
    $('.t-value', node).textContent = h.value ? fmtUSD(h.value) : '—';
    const alloc = h.value ? (h.value / total) * 100 : 0;
    $('.alloc-fill', node).style.width = `${Math.min(alloc, 100)}%`;
    $('.t-alloc', node).textContent = h.value ? `${alloc.toFixed(1)}%` : '—';
    body.appendChild(node);
  }
}

function renderActivity() {
  const list = $('#tx-list');
  list.innerHTML = '';
  const tmpl = $('#tx-row-tmpl');
  const sigs = state.txs || [];
  $('#tx-meta').textContent = sigs.length ? `Last ${sigs.length} signatures` : 'No history';
  $('#badge-activity').textContent = sigs.length;
  $('#load-more-tx').hidden = sigs.length < 20;

  if (!sigs.length) {
    list.innerHTML = `<li class="empty">No transactions found.</li>`;
    return;
  }
  for (const s of sigs) {
    const node = tmpl.content.firstElementChild.cloneNode(true);
    const failed = !!s.err;
    const icon = $('.tx-icon', node);
    icon.textContent = failed ? '×' : '↔';
    icon.classList.toggle('err', failed);
    $('.tx-title', node).textContent = failed
      ? `Failed transaction${s.memo ? ` · ${s.memo}` : ''}`
      : (s.memo ? `Memo: ${s.memo}` : (s.confirmationStatus ? `Confirmed (${s.confirmationStatus})` : 'Confirmed'));
    const sigEl = $('.tx-sig', node);
    sigEl.textContent = shorten(s.signature, 10, 10);
    sigEl.href = `${EXPLORER}/tx/${s.signature}?cluster=${explorerCluster()}`;
    $('.tx-fee', node).textContent = '';
    $('.tx-time', node).textContent = timeAgo(s.blockTime);
    $('.tx-slot', node).textContent = `slot ${s.slot}`;
    list.appendChild(node);
  }
}

function renderAnalytics(accountInfo) {
  // Donut + legend (top 6, rest in "Other")
  const ranked = state.holdings.filter(h => h.value > 0).sort((a, b) => b.value - a.value);
  const top = ranked.slice(0, 6);
  const otherVal = ranked.slice(6).reduce((s, h) => s + h.value, 0);
  const slices = [...top.map(h => ({ name: h.symbol || shorten(h.mint, 4, 4), val: h.value })),
                  ...(otherVal > 0 ? [{ name: 'Other', val: otherVal }] : [])];
  const total = state.totalValue;

  const svg = $('#donut-svg');
  // Clear previous segments
  $$('.donut-seg', svg).forEach(n => n.remove());
  let offset = 0;
  const palette = ['#9945ff', '#14f195', '#4f8bff', '#ffb347', '#ff6ad5', '#c4b1ff', '#7b61ff'];
  slices.forEach((s, i) => {
    const pct = total ? (s.val / total) * 100 : 0;
    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    seg.setAttribute('cx', '21');
    seg.setAttribute('cy', '21');
    seg.setAttribute('r', '15.9155');
    seg.setAttribute('class', 'donut-seg');
    seg.setAttribute('stroke', palette[i % palette.length]);
    seg.setAttribute('stroke-dasharray', `${pct} ${100 - pct}`);
    seg.setAttribute('stroke-dashoffset', `${100 - offset}`);
    svg.appendChild(seg);
    offset += pct;
  });

  const legend = $('#composition-legend');
  legend.innerHTML = '';
  slices.forEach((s, i) => {
    const li = document.createElement('li');
    const pct = total ? (s.val / total) * 100 : 0;
    li.innerHTML = `
      <span class="dot" style="background:${palette[i % palette.length]}"></span>
      <span class="name">${escapeHtml(s.name)}</span>
      <span class="val">${fmtUSD(s.val)}</span>
      <span class="pct">${pct.toFixed(1)}%</span>`;
    legend.appendChild(li);
  });
  if (!slices.length) {
    legend.innerHTML = `<li class="empty">No priced holdings</li>`;
  }

  // Top movers (24h, by |change| × value)
  const movers = state.holdings
    .filter(h => h.value > 0 && h.change24h != null)
    .map(h => ({ ...h, impact: Math.abs(h.change24h) * (h.value || 0) }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6);
  const moversEl = $('#movers');
  moversEl.innerHTML = '';
  if (!movers.length) {
    moversEl.innerHTML = `<li class="empty">No 24h price data</li>`;
  }
  for (const h of movers) {
    const li = document.createElement('li');
    const cls = h.change24h > 0 ? 'pos' : 'neg';
    li.innerHTML = `
      <div class="left">
        ${h.logoURI ? `<img src="${h.logoURI}" alt="" onerror="this.remove()">` : ''}
        <div>
          <div style="font-weight:600">${escapeHtml(h.symbol || shorten(h.mint, 4, 4))}</div>
          <div class="muted small">${fmtUSD(h.value)}</div>
        </div>
      </div>
      <div class="delta ${cls}">${fmtPct(h.change24h)}</div>`;
    moversEl.appendChild(li);
  }

  // Account info KV
  $('#kv-owner').textContent = accountInfo?.owner || '—';
  $('#kv-exec').textContent = accountInfo?.executable ? 'yes' : 'no';
  $('#kv-rent').textContent = accountInfo?.rentEpoch ?? '—';
  $('#kv-size').textContent = accountInfo?.space != null ? `${accountInfo.space} bytes` : '—';
  const sigs = state.txs;
  if (sigs.length) {
    const newest = sigs[0]?.blockTime;
    const oldest = sigs[sigs.length - 1]?.blockTime;
    $('#kv-first').textContent = oldest ? new Date(oldest * 1000).toLocaleString() : '—';
    $('#kv-last').textContent = newest ? new Date(newest * 1000).toLocaleString() : '—';
    $('#wallet-first').textContent = oldest ? `first seen ${timeAgo(oldest)}` : 'first seen —';
    $('#wallet-age').textContent = oldest ? timeAgo(oldest).replace(' ago', '') : '—';
  } else {
    $('#kv-first').textContent = '—';
    $('#kv-last').textContent = '—';
    $('#wallet-first').textContent = 'no activity';
    $('#wallet-age').textContent = '—';
  }
}

function renderPnL() {
  const body = $('#pnl-body');
  body.innerHTML = '';
  const rows = state.holdings.filter(h => h.value > 0 && h.change24h != null);
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="4"><div class="empty">No priced holdings with 24h data.</div></td></tr>`;
    return;
  }
  for (const h of rows) {
    const prev = h.value / (1 + h.change24h / 100);
    const delta = h.value - prev;
    const cls = delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'neutral';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="token-id">
          ${h.logoURI ? `<img class="token-logo" src="${h.logoURI}" alt="" onerror="this.remove()">` : `<span class="token-logo fallback" style="display:inline-flex;width:32px;height:32px;border-radius:50%;align-items:center;justify-content:center;color:#0a0820;font-weight:700;font-size:11px;background:linear-gradient(135deg,#9945ff,#14f195)">${escapeHtml((h.symbol || '?').slice(0,2).toUpperCase())}</span>`}
          <div class="token-text">
            <div class="token-sym">${escapeHtml(h.symbol || 'Unknown')}</div>
            <div class="token-sub muted">${h.isNative ? 'Native SOL' : escapeHtml(shorten(h.mint, 6, 6))}</div>
          </div>
        </div>
      </td>
      <td class="num">${fmtUSD(h.value)}</td>
      <td class="num delta ${cls}">${fmtPct(h.change24h)}</td>
      <td class="num delta ${cls}">${fmtDelta(delta)}</td>`;
    body.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- Activity pagination ---------------- */
async function loadMoreTx() {
  if (!state.address || !state.txBefore) return;
  const btn = $('#load-more-tx');
  btn.disabled = true; btn.textContent = 'Loading…';
  try {
    const more = await rpc('getSignaturesForAddress', [state.address, { limit: 20, before: state.txBefore }]);
    if (more?.length) {
      state.txs = state.txs.concat(more);
      state.txBefore = more[more.length - 1].signature;
      renderActivity();
    } else {
      btn.hidden = true;
    }
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false; btn.textContent = 'Load more';
  }
}

/* ---------------- Trading modals (Latest / Trending / Gainers / Volume / Memescope) ---------------- */
const TRADING_VIEWS = {
  latest:    { title: 'Latest Tokens',  sub: 'Recently launched Solana tokens, ranked by listing time' },
  trending:  { title: 'Trending',       sub: 'Top trending Solana tokens by 24h volume' },
  gainers:   { title: 'Top Gainers',    sub: 'Best 24h price performance' },
  volume:    { title: 'High Volume',    sub: 'Highest 24h trading volume' },
  memescope: { title: 'Memescope',      sub: 'Boosted launchpad tokens & memecoins' },
  copy:      { title: 'Copy Trading',   sub: 'Mirror top wallets automatically (coming soon)' },
};

function openModal(title, sub) {
  $('#modal-title').textContent = title;
  $('#modal-sub').textContent = sub || '';
  $('#modal-body').innerHTML = '<div class="modal-loading">Loading…</div>';
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

async function fetchSolanaPairs() {
  // DexScreener search returns up to ~30 pairs per query. We aggregate a few popular base symbols
  // to get a broader set, then dedupe by base token mint.
  const queries = ['SOL', 'USDC', 'BONK', 'WIF', 'JUP'];
  const seen = new Map();
  await Promise.all(queries.map(async q => {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${q}`);
      if (!r.ok) return;
      const json = await r.json();
      for (const p of json?.pairs || []) {
        if (p.chainId !== 'solana') continue;
        const base = p.baseToken?.address;
        if (!base) continue;
        const prev = seen.get(base);
        const vol = Number(p.volume?.h24 || 0);
        if (!prev || vol > Number(prev.volume?.h24 || 0)) seen.set(base, p);
      }
    } catch (_) {}
  }));
  return Array.from(seen.values());
}

async function fetchLatestTokenProfiles() {
  try {
    const r = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
    if (!r.ok) return [];
    const json = await r.json();
    const list = Array.isArray(json) ? json : (json.profiles || []);
    return list.filter(p => p.chainId === 'solana');
  } catch { return []; }
}

async function fetchBoostedTokens() {
  try {
    const r = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
    if (!r.ok) return [];
    const json = await r.json();
    const list = Array.isArray(json) ? json : (json.boosts || []);
    return list.filter(p => p.chainId === 'solana');
  } catch { return []; }
}

function pairsRowHtml(p, rank) {
  const price = Number(p.priceUsd) || null;
  const ch = Number(p.priceChange?.h24 ?? 0);
  const vol = Number(p.volume?.h24 || 0);
  const mc = Number(p.marketCap || p.fdv || 0);
  const created = p.pairCreatedAt ? timeAgo(Math.floor(p.pairCreatedAt / 1000)) : '—';
  const logo = p.info?.imageUrl;
  const sym = p.baseToken?.symbol || '?';
  const name = p.baseToken?.name || '';
  const cls = ch > 0 ? 'pos' : ch < 0 ? 'neg' : 'neutral';
  return `
    <tr>
      <td class="rank-cell">${rank}</td>
      <td>
        <div class="token-id">
          ${logo ? `<img class="token-logo" src="${logo}" alt="" onerror="this.remove()">` : `<span class="token-logo fallback" style="display:inline-flex;width:32px;height:32px;border-radius:50%;align-items:center;justify-content:center;color:#0a0820;font-weight:700;font-size:11px;background:linear-gradient(135deg,#9945ff,#14f195)">${escapeHtml(sym.slice(0,2).toUpperCase())}</span>`}
          <div class="token-text">
            <div class="token-sym">${escapeHtml(sym)}</div>
            <div class="token-sub muted">${escapeHtml(name)} · ${shorten(p.baseToken.address, 4, 4)}</div>
          </div>
        </div>
      </td>
      <td class="num">${price ? fmtUSD(price, price < 1 ? 6 : 2) : '—'}</td>
      <td class="num delta ${cls}">${fmtPct(ch)}</td>
      <td class="num">${vol ? fmtUSD(vol) : '—'}</td>
      <td class="num">${mc ? fmtUSD(mc) : '—'}</td>
      <td class="num"><a class="ext" href="${p.url}" target="_blank" rel="noopener">DEX ↗</a></td>
    </tr>`;
}

function renderPairsTable(rows, emptyMsg = 'No data available right now.') {
  if (!rows.length) return `<div class="empty">${emptyMsg}</div>`;
  return `
    <table class="modal-table">
      <thead><tr>
        <th>#</th><th>Token</th><th class="num">Price</th><th class="num">24h</th>
        <th class="num">Volume 24h</th><th class="num">Market Cap</th><th class="num"></th>
      </tr></thead>
      <tbody>${rows.map((p, i) => pairsRowHtml(p, i + 1)).join('')}</tbody>
    </table>`;
}

async function loadTradingView(view) {
  const meta = TRADING_VIEWS[view];
  if (!meta) return;
  openModal(meta.title, meta.sub);
  const body = $('#modal-body');

  try {
    if (view === 'copy') {
      body.innerHTML = `<div class="empty">Copy Trading is a placeholder in this demo.<br>Real wallet-mirroring needs a paid swap-execution API.</div>`;
      return;
    }

    if (view === 'latest') {
      const profiles = await fetchLatestTokenProfiles();
      if (!profiles.length) { body.innerHTML = `<div class="empty">Couldn't load latest tokens.</div>`; return; }
      const mints = profiles.slice(0, 30).map(p => p.tokenAddress);
      const prices = await fetchDexscreenerForMints(mints);
      // Build rows from profile + price info
      const rows = profiles.slice(0, 30).map(p => {
        const px = prices.get(p.tokenAddress);
        return {
          baseToken: { address: p.tokenAddress, symbol: px?.symbol || (p.label || '?'), name: px?.name || (p.description?.slice(0, 40) || '') },
          priceUsd: px?.price,
          priceChange: { h24: px?.change24h ?? null },
          volume: { h24: null },
          info: { imageUrl: p.icon || px?.logoURI },
          url: p.url || `https://dexscreener.com/solana/${p.tokenAddress}`,
        };
      });
      body.innerHTML = renderPairsTable(rows, 'No new Solana tokens reported.');
      return;
    }

    if (view === 'memescope') {
      const boosts = await fetchBoostedTokens();
      if (!boosts.length) { body.innerHTML = `<div class="empty">No boosted tokens right now.</div>`; return; }
      const mints = boosts.slice(0, 30).map(b => b.tokenAddress);
      const prices = await fetchDexscreenerForMints(mints);
      const rows = boosts.slice(0, 30).map(b => {
        const px = prices.get(b.tokenAddress);
        return {
          baseToken: { address: b.tokenAddress, symbol: px?.symbol || '?', name: px?.name || (b.description?.slice(0, 40) || '') },
          priceUsd: px?.price,
          priceChange: { h24: px?.change24h ?? null },
          volume: { h24: null },
          info: { imageUrl: b.icon || px?.logoURI },
          url: b.url || `https://dexscreener.com/solana/${b.tokenAddress}`,
        };
      });
      body.innerHTML = renderPairsTable(rows, 'No boosted tokens.');
      return;
    }

    // trending / gainers / volume — derived from a fetched pair set
    const pairs = await fetchSolanaPairs();
    let sorted;
    if (view === 'trending') sorted = pairs.sort((a, b) => Number(b.volume?.h24 || 0) - Number(a.volume?.h24 || 0));
    else if (view === 'gainers') sorted = pairs.sort((a, b) => Number(b.priceChange?.h24 ?? -1e9) - Number(a.priceChange?.h24 ?? -1e9));
    else if (view === 'volume') sorted = pairs.sort((a, b) => Number(b.volume?.h24 || 0) - Number(a.volume?.h24 || 0));
    else sorted = pairs;
    body.innerHTML = renderPairsTable(sorted.slice(0, 25));
  } catch (err) {
    console.error(err);
    body.innerHTML = `<div class="empty">Couldn't load data: ${escapeHtml(err.message)}</div>`;
  }
}

/* ---------------- Token detail modal ---------------- */
async function openTokenDetail(mint) {
  openModal('Token detail', shorten(mint, 10, 10));
  const body = $('#modal-body');
  try {
    const [tokenMap, priceMap] = await Promise.all([
      loadJupTokenMap(),
      fetchDexscreenerForMints([mint]),
    ]);
    const meta = tokenMap.get(mint) || {};
    const px = priceMap.get(mint) || {};
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const json = r.ok ? await r.json() : {};
    const pairs = (json.pairs || []).filter(p => p.chainId === 'solana')
      .sort((a, b) => Number(b.volume?.h24 || 0) - Number(a.volume?.h24 || 0))
      .slice(0, 8);

    const sym = px.symbol || meta.symbol || '?';
    const name = px.name || meta.name || '';
    const logo = meta.logoURI || px.logoURI;
    const price = px.price;
    const ch = px.change24h;
    const chCls = ch > 0 ? 'pos' : ch < 0 ? 'neg' : 'neutral';

    $('#modal-title').textContent = `${sym}${name ? ` · ${name}` : ''}`;
    $('#modal-sub').innerHTML = `<span class="mono">${escapeHtml(mint)}</span>`;

    body.innerHTML = `
      <div class="td-summary">
        <div class="td-id">
          ${logo ? `<img class="td-logo" src="${logo}" alt="" onerror="this.remove()">` : ''}
          <div>
            <div class="td-price">${price ? fmtUSD(price, price < 1 ? 6 : 2) : '—'}</div>
            <div class="td-chg delta ${chCls}">${fmtPct(ch)} <span class="muted small">24h</span></div>
          </div>
        </div>
        <div class="td-links">
          <a class="ghost-btn small" target="_blank" rel="noopener" href="https://dexscreener.com/solana/${mint}">DexScreener ↗</a>
          <a class="ghost-btn small" target="_blank" rel="noopener" href="https://birdeye.so/token/${mint}?chain=solana">Birdeye ↗</a>
          <a class="ghost-btn small" target="_blank" rel="noopener" href="${SOLSCAN}/token/${mint}">Solscan ↗</a>
          <button class="ghost-btn small" data-copy="${escapeHtml(mint)}">Copy mint</button>
        </div>
      </div>
      <h4 class="td-h4">Top pairs by volume</h4>
      ${pairs.length ? `
        <table class="modal-table">
          <thead><tr><th>Pair</th><th>DEX</th><th class="num">Liquidity</th><th class="num">24h vol</th><th class="num">24h chg</th><th></th></tr></thead>
          <tbody>${pairs.map(p => {
            const c = Number(p.priceChange?.h24 ?? 0);
            const cc = c > 0 ? 'pos' : c < 0 ? 'neg' : 'neutral';
            return `<tr>
              <td>${escapeHtml(p.baseToken?.symbol || '?')}/${escapeHtml(p.quoteToken?.symbol || '?')}</td>
              <td>${escapeHtml(p.dexId || '—')}</td>
              <td class="num">${p.liquidity?.usd ? fmtUSD(p.liquidity.usd) : '—'}</td>
              <td class="num">${p.volume?.h24 ? fmtUSD(p.volume.h24) : '—'}</td>
              <td class="num delta ${cc}">${fmtPct(c)}</td>
              <td class="num"><a class="ext" target="_blank" rel="noopener" href="${p.url}">Open ↗</a></td>
            </tr>`;
          }).join('')}</tbody>
        </table>` : `<div class="empty">No active pairs found on DexScreener.</div>`}
    `;

    body.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(e.currentTarget.dataset.copy); e.currentTarget.textContent = 'Copied'; } catch {}
    });
  } catch (err) {
    body.innerHTML = `<div class="empty">Couldn't load token: ${escapeHtml(err.message)}</div>`;
  }
}

/* ---------------- Tools modals ---------------- */
function promptModal(title, sub, placeholder, onSubmit) {
  openModal(title, sub);
  const body = $('#modal-body');
  body.innerHTML = `
    <form class="prompt-form" id="prompt-form">
      <input id="prompt-input" placeholder="${escapeHtml(placeholder)}" class="filter-input" style="flex:1;min-width:0;font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px 14px" autofocus />
      <button class="primary-btn small" type="submit">Analyze →</button>
    </form>
    <div id="prompt-result"></div>`;
  $('#prompt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = $('#prompt-input').value.trim();
    if (!v) return;
    $('#prompt-result').innerHTML = '<div class="modal-loading">Analyzing…</div>';
    try { await onSubmit(v, $('#prompt-result')); }
    catch (err) { $('#prompt-result').innerHTML = `<div class="empty">Error: ${escapeHtml(err.message)}</div>`; }
  });
}

async function toolTokenChecker(mintInput, out) {
  const mint = mintInput.trim();
  if (!isValidAddress(mint)) { out.innerHTML = `<div class="empty">Not a valid Solana mint address.</div>`; return; }
  const [supplyR, accountInfo, ds, tokenMap] = await Promise.all([
    rpc('getTokenSupply', [mint]).catch(() => null),
    rpc('getAccountInfo', [mint, { encoding: 'jsonParsed' }]).then(r => r?.value).catch(() => null),
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    loadJupTokenMap(),
  ]);
  const supply = supplyR?.value?.uiAmount ?? null;
  const decimals = supplyR?.value?.decimals ?? null;
  const info = accountInfo?.data?.parsed?.info || {};
  const owner = accountInfo?.owner;
  const verified = tokenMap.has(mint);
  const pairs = (ds.pairs || []).filter(p => p.chainId === 'solana');
  const liquidity = pairs.reduce((s, p) => s + Number(p.liquidity?.usd || 0), 0);
  const volume = pairs.reduce((s, p) => s + Number(p.volume?.h24 || 0), 0);
  const price = pairs[0]?.priceUsd;

  // Naive scoring
  let score = 50;
  if (verified) score += 25;
  if (!info.mintAuthority) score += 10;
  if (!info.freezeAuthority) score += 10;
  if (liquidity > 50_000) score += 10;
  if (liquidity > 500_000) score += 5;
  if (volume > 50_000) score += 5;
  if (pairs.length >= 3) score += 5;
  score = Math.min(score, 100);
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';
  const gradeCls = score >= 85 ? 'pos' : score >= 50 ? '' : 'neg';

  out.innerHTML = `
    <div class="checker">
      <div class="checker-score">
        <div class="grade ${gradeCls}">${grade}</div>
        <div>
          <div class="muted small">Safety score (heuristic)</div>
          <div class="big-sm">${score}/100</div>
        </div>
      </div>
      <ul class="checker-flags">
        <li class="${verified ? 'good' : 'warn'}">${verified ? '✓' : '!'} ${verified ? 'Listed on Jupiter verified registry' : 'Not on Jupiter verified registry'}</li>
        <li class="${info.mintAuthority ? 'warn' : 'good'}">${info.mintAuthority ? '!' : '✓'} Mint authority ${info.mintAuthority ? 'present — supply can change' : 'renounced'}</li>
        <li class="${info.freezeAuthority ? 'warn' : 'good'}">${info.freezeAuthority ? '!' : '✓'} Freeze authority ${info.freezeAuthority ? 'present — holders can be frozen' : 'renounced'}</li>
        <li class="${liquidity > 50_000 ? 'good' : 'warn'}">${liquidity > 50_000 ? '✓' : '!'} Liquidity ${fmtUSD(liquidity)} across ${pairs.length} pair(s)</li>
        <li class="${volume > 10_000 ? 'good' : 'warn'}">${volume > 10_000 ? '✓' : '!'} 24h volume ${fmtUSD(volume)}</li>
      </ul>
      <dl class="kv">
        <div><dt>Price</dt><dd>${price ? fmtUSD(Number(price), Number(price) < 1 ? 6 : 2) : '—'}</dd></div>
        <div><dt>Supply</dt><dd>${supply != null ? fmt(supply) : '—'}</dd></div>
        <div><dt>Decimals</dt><dd>${decimals ?? '—'}</dd></div>
        <div><dt>Owner program</dt><dd>${shorten(owner || '—', 8, 8)}</dd></div>
        <div><dt>Mint authority</dt><dd>${info.mintAuthority ? shorten(info.mintAuthority, 8, 8) : 'none'}</dd></div>
        <div><dt>Freeze authority</dt><dd>${info.freezeAuthority ? shorten(info.freezeAuthority, 8, 8) : 'none'}</dd></div>
      </dl>
      <p class="muted small note">Heuristic only. Score combines authority renouncement, registry status, and liquidity / volume thresholds.</p>
    </div>`;
}

async function toolHolderInsights(mint, out) {
  if (!isValidAddress(mint)) { out.innerHTML = `<div class="empty">Not a valid Solana mint address.</div>`; return; }
  const [largestR, supplyR, tokenMap] = await Promise.all([
    rpc('getTokenLargestAccounts', [mint]).catch(() => null),
    rpc('getTokenSupply', [mint]).catch(() => null),
    loadJupTokenMap(),
  ]);
  const meta = tokenMap.get(mint) || {};
  const supply = supplyR?.value?.uiAmount;
  const list = (largestR?.value || []).slice(0, 20);
  if (!list.length) { out.innerHTML = `<div class="empty">No holder data returned.</div>`; return; }

  const top10 = list.slice(0, 10).reduce((s, a) => s + Number(a.uiAmount || 0), 0);
  const concentration = supply ? (top10 / supply) * 100 : null;

  out.innerHTML = `
    <div class="kv" style="margin-bottom:14px">
      <div><dt>Token</dt><dd>${escapeHtml(meta.symbol || shorten(mint, 8, 8))}</dd></div>
      <div><dt>Supply</dt><dd>${supply != null ? fmt(supply) : '—'}</dd></div>
      <div><dt>Top 10 concentration</dt><dd>${concentration != null ? concentration.toFixed(2) + '%' : '—'}</dd></div>
    </div>
    <table class="modal-table">
      <thead><tr><th>#</th><th>Token account</th><th class="num">Amount</th><th class="num">% supply</th></tr></thead>
      <tbody>${list.map((a, i) => `
        <tr>
          <td class="rank-cell">${i + 1}</td>
          <td><a class="ext" target="_blank" rel="noopener" href="${SOLSCAN}/account/${a.address}">${shorten(a.address, 8, 8)} ↗</a></td>
          <td class="num">${fmt(Number(a.uiAmount || 0))}</td>
          <td class="num">${supply ? ((Number(a.uiAmount || 0) / supply) * 100).toFixed(2) + '%' : '—'}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

async function toolDecoder(sig, out) {
  sig = sig.trim();
  if (sig.length < 64) { out.innerHTML = `<div class="empty">Paste a full transaction signature (base58).</div>`; return; }
  const tx = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]).catch(() => null);
  if (!tx) { out.innerHTML = `<div class="empty">Transaction not found on ${state.network}.</div>`; return; }

  const m = tx.transaction.message;
  const accounts = m.accountKeys.map(a => a.pubkey || a);
  const ix = m.instructions.map((i, idx) => {
    const prog = (typeof i.programId === 'string') ? i.programId : accounts[i.programIdIndex];
    return { idx, program: prog, parsed: i.parsed, data: i.data };
  });
  const inner = (tx.meta?.innerInstructions || []).flatMap(g => g.instructions.map(i => ({
    program: (typeof i.programId === 'string') ? i.programId : accounts[i.programIdIndex],
    parsed: i.parsed,
  })));
  const balDelta = (tx.meta?.preBalances || []).map((pre, i) => ({
    account: accounts[i],
    delta: ((tx.meta.postBalances[i] - pre) / LAMPORTS_PER_SOL),
  })).filter(b => Math.abs(b.delta) > 0);

  const logs = tx.meta?.logMessages || [];
  out.innerHTML = `
    <div class="kv" style="margin-bottom:14px">
      <div><dt>Status</dt><dd>${tx.meta?.err ? '<span class="delta neg">failed</span>' : '<span class="delta pos">success</span>'}</dd></div>
      <div><dt>Slot</dt><dd>${tx.slot}</dd></div>
      <div><dt>Block time</dt><dd>${tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : '—'}</dd></div>
      <div><dt>Fee</dt><dd>${tx.meta?.fee ? (tx.meta.fee / LAMPORTS_PER_SOL).toFixed(6) + ' SOL' : '—'}</dd></div>
      <div><dt>Instructions</dt><dd>${ix.length} top-level + ${inner.length} inner</dd></div>
      <div><dt>Accounts</dt><dd>${accounts.length}</dd></div>
    </div>
    <h4 class="td-h4">Instructions</h4>
    <ol class="ix-list">
      ${ix.map(i => `<li><span class="mono">${shorten(i.program, 6, 6)}</span> ${i.parsed?.type ? `<span class="ix-type">${escapeHtml(i.parsed.type)}</span>` : '<span class="muted">raw</span>'}</li>`).join('')}
    </ol>
    <h4 class="td-h4">SOL balance changes</h4>
    <ul class="bal-list">
      ${balDelta.length ? balDelta.map(b => `<li><span class="mono">${shorten(b.account, 6, 6)}</span> <span class="delta ${b.delta > 0 ? 'pos' : 'neg'}">${b.delta > 0 ? '+' : ''}${b.delta.toFixed(6)} SOL</span></li>`).join('') : '<li class="muted">No SOL deltas.</li>'}
    </ul>
    <h4 class="td-h4">Program logs</h4>
    <pre class="logs">${escapeHtml(logs.slice(0, 60).join('\n')) || '<em>No logs.</em>'}</pre>
    <p><a class="ghost-btn small" target="_blank" rel="noopener" href="${EXPLORER}/tx/${sig}?cluster=${explorerCluster()}">Open in Explorer ↗</a></p>`;
}

async function openSwap() {
  openModal('Swap', 'Quote any token pair via Jupiter Lite API');
  $('#modal-body').innerHTML = `
    <div class="swap-card">
      <label class="swap-row"><span>You pay</span>
        <div class="swap-input"><input id="swap-from" class="filter-input" value="So11111111111111111111111111111111111111112" placeholder="From mint"></div>
        <div class="swap-input"><input id="swap-amt" class="filter-input" type="number" value="1" min="0" step="0.1"></div>
      </label>
      <div class="swap-arrow">↓</div>
      <label class="swap-row"><span>You receive</span>
        <div class="swap-input"><input id="swap-to" class="filter-input" value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" placeholder="To mint"></div>
        <div class="swap-input"><span id="swap-out" class="muted">—</span></div>
      </label>
      <button id="swap-quote" class="primary-btn small">Get quote</button>
      <div id="swap-result" class="muted small"></div>
      <p class="muted small note">Read-only quote via Jupiter. Real swap execution requires a wallet adapter, not included.</p>
    </div>`;
  $('#swap-quote').addEventListener('click', async () => {
    const from = $('#swap-from').value.trim();
    const to = $('#swap-to').value.trim();
    const amt = parseFloat($('#swap-amt').value || '0');
    if (!isValidAddress(from) || !isValidAddress(to) || !(amt > 0)) {
      $('#swap-result').textContent = 'Enter valid mints and amount.';
      return;
    }
    $('#swap-result').textContent = 'Fetching quote…';
    try {
      // Need decimals of input mint to compute lamports
      const sup = await rpc('getTokenSupply', [from]).catch(() => null);
      const dec = sup?.value?.decimals ?? 9;
      const amount = BigInt(Math.round(amt * 10 ** dec)).toString();
      const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${from}&outputMint=${to}&amount=${amount}&slippageBps=50&restrictIntermediateTokens=true`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Jupiter: ${r.status}`);
      const q = await r.json();
      const outSup = await rpc('getTokenSupply', [to]).catch(() => null);
      const outDec = outSup?.value?.decimals ?? 9;
      const outAmt = Number(q.outAmount) / 10 ** outDec;
      $('#swap-out').textContent = `≈ ${fmt(outAmt, 6)}`;
      $('#swap-result').innerHTML = `Best route via <strong>${q.routePlan?.map(r => r.swapInfo?.label).join(' → ') || '—'}</strong>. Price impact ${(Number(q.priceImpactPct || 0) * 100).toFixed(3)}%.`;
    } catch (err) {
      $('#swap-result').textContent = `Quote failed: ${err.message}`;
    }
  });
}

function openInfoModal(title, sub, bodyHtml) {
  openModal(title, sub);
  $('#modal-body').innerHTML = bodyHtml;
}

const PRODUCT_INFO = {
  'data-api':  ['Data API',         'Comprehensive Solana blockchain data API',
    `<p>This demo uses public APIs (Solana JSON-RPC, DexScreener, Jupiter). A production "Data API" service would offer historical trades, OHLCV bars, holder snapshots, and wallet PnL with cost-basis.</p>`],
  'rpc':       ['Solana RPC',       'High-performance, low-latency Solana RPC nodes',
    `<p>The current network is <code>${state.network}</code>. Public RPC endpoints rate-limit heavily; a dedicated RPC plan removes the limits and adds priority fee estimation, gRPC streams, and isolated mempool access.</p>`],
  'dedicated': ['Dedicated Nodes',  'Fully managed dedicated Solana infrastructure',
    `<p>Dedicated nodes give you predictable latency under load — co-located in <em>fra1 / nyc1 / sgp1</em> with hot-swap failover. Not part of this demo.</p>`],
  'grpc':      ['Yellowstone gRPC', 'Real-time Solana data streaming',
    `<p>Subscribe to account, slot, transaction, and block updates over gRPC. The demo polls JSON-RPC; production trackers stream Geyser to keep PnL realtime.</p>`],
  'raptor':    ['Raptor Swap API',  'Integrate seamless token swaps into your apps',
    `<p>This demo wires the <code>Swap</code> link to <em>Jupiter Lite</em> for quotes (read-only). A first-party swap API would add MEV-protection, priority-fee tuning, and your own fee bps.</p>`],
  'teams':     ['Teams',            'Collaborate and share access with your team',
    `<p>Share saved wallets, alerts, and dashboards across an org. Not implemented in this demo.</p>`],
};

const DEVELOPERS_INFO = ['Developers', 'API reference & guides',
  `<p>This static demo talks directly to:</p>
   <ul class="dev-list">
     <li><strong>Solana JSON-RPC</strong> — <code>getBalance</code>, <code>getTokenAccountsByOwner</code>, <code>getSignaturesForAddress</code>, <code>getTransaction</code>, <code>getTokenSupply</code>, <code>getTokenLargestAccounts</code>.</li>
     <li><strong>DexScreener</strong> — <code>/latest/dex/tokens</code>, <code>/latest/dex/search</code>, <code>/token-profiles/latest/v1</code>, <code>/token-boosts/top/v1</code>.</li>
     <li><strong>Jupiter</strong> — <code>tokens.jup.ag</code> (registry) and <code>lite-api.jup.ag/swap/v1/quote</code> (quotes).</li>
   </ul>
   <p>Deep-link to a wallet: <code>?addr=&lt;ADDRESS&gt;</code></p>`];

/* ---------------- UI wiring ---------------- */
function init() {
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#address').value.trim();
    if (v) trackAddress(v);
  });

  $('#paste-btn').addEventListener('click', async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { $('#address').value = t.trim(); $('#address').focus(); }
    } catch {
      showStatus('Clipboard blocked — paste manually.', 'error');
    }
  });

  $('#copy-btn').addEventListener('click', async () => {
    const a = $('#account-addr').textContent;
    if (!a || a === '—') return;
    try {
      await navigator.clipboard.writeText(a);
      const btn = $('#copy-btn'); const prev = btn.textContent;
      btn.textContent = 'Copied'; setTimeout(() => btn.textContent = prev, 1200);
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
    loadTrendingTicker();
    const v = $('#address').value.trim();
    if (v && isValidAddress(v)) trackAddress(v);
  }));

  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(b => {
      b.classList.toggle('active', b === t);
      b.setAttribute('aria-selected', b === t ? 'true' : 'false');
    });
    const target = t.dataset.tab;
    $$('.tab-panel').forEach(p => p.hidden = (p.dataset.panel !== target));
  }));

  $('#holdings-filter').addEventListener('input', (e) => {
    state.filter = e.target.value;
    renderHoldings();
  });

  $('#hide-dust').addEventListener('click', (e) => {
    state.hideDust = !state.hideDust;
    e.currentTarget.setAttribute('aria-pressed', state.hideDust ? 'true' : 'false');
    renderHoldings();
  });

  $('#load-more-tx').addEventListener('click', loadMoreTx);

  // Trading dropdown items
  $$('.ddi[data-trading]').forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    const v = el.dataset.trading;
    if (v === 'wallet') return; // we're already here
    loadTradingView(v);
  }));

  // Tools dropdown items
  $$('.ddi[data-tool]').forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    const t = el.dataset.tool;
    if (t === 'checker')  promptModal('Token Checker', 'Heuristic safety analysis — paste an SPL mint', 'Paste an SPL mint address…', toolTokenChecker);
    else if (t === 'holders')  promptModal('Holder Insights', 'Top holders & concentration for a token', 'Paste an SPL mint address…', toolHolderInsights);
    else if (t === 'decoder')  promptModal('Transaction Decoder', 'Parse and explain any Solana transaction', 'Paste a transaction signature…', toolDecoder);
  }));

  // Products dropdown items
  $$('.ddi[data-product]').forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    const p = el.dataset.product;
    const info = PRODUCT_INFO[p];
    if (info) openInfoModal(info[0], info[1], info[2]);
  }));

  // Top-bar action links (Swap / Developers)
  $$('[data-action]').forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    const a = el.dataset.action;
    if (a === 'swap') openSwap();
    else if (a === 'developers') openInfoModal(DEVELOPERS_INFO[0], DEVELOPERS_INFO[1], DEVELOPERS_INFO[2]);
  }));

  // Click ticker items to open token detail
  $('#ticker-track').addEventListener('click', (e) => {
    const item = e.target.closest('.ticker-item');
    if (item?.dataset.mint) openTokenDetail(item.dataset.mint);
  });

  // Click a holdings row to open token detail
  $('#holdings-body').addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (tr?.dataset.mint) openTokenDetail(tr.dataset.mint);
  });

  // Modal close
  $$('#modal [data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  });

  // Trending ticker
  loadTrendingTicker();
  setInterval(loadTrendingTicker, 60_000);

  // Deep-link support: /?addr=...
  const params = new URLSearchParams(location.search);
  const initAddr = params.get('addr');
  if (initAddr) {
    $('#address').value = initAddr;
    trackAddress(initAddr);
  }
}

init();
