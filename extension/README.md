# Slipstream — Smart Money Overlay (browser extension)

Slipstream is a Chrome/Edge (Manifest V3) extension that sits **on top of every
wallet address and holder** on the sites you already use — block explorers, DEX
screeners, and X — and overlays who that wallet is: label, type (smart money /
KOL / sniper / fresh / risky), 30-day PnL, win rate, risk score, hold time, and
recent trades.

This is the same idea as the Frontrun-style overlay extensions, rebuilt as an
independent product with a distinct name and codebase.

## What it does

- **Inline badges** — every recognised address on a page gets a pill showing its
  label and PnL. Colour-coded by wallet type.
- **Hover card** — hover an address or badge for a full wallet card: type, PnL,
  win rate, transparent risk score, 30-day equity sparkline, recent trades, tags.
- **Truncated-address resolution** — explorers show `0x8a9f…7f8a`; Slipstream
  reads the full address from the link and labels it anyway.
- **Works inside tweets** — addresses mentioned in X posts get resolved too.
- **Your own labels** — click any badge → *Add label*, or use the popup. Custom
  labels sync across every page and override the bundled data.
- **Floating HUD** — bottom-right panel shows how many labeled / smart / risky
  wallets are on the current page, with a one-click pause toggle.
- **Risk flags** — fresh wallets and known rug deployers are highlighted in
  amber/red so you spot them before you ape.

## Try the demo (no install needed)

Open `extension/demo/holders.html` in any browser — it loads the overlay
directly and behaves exactly like the installed extension.

## Install the extension (Chrome / Edge / Brave)

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin Slipstream, then visit Solscan, Etherscan, BaseScan, GMGN, DexScreener,
   or X — addresses light up automatically.
5. To use it on the local demo file, enable **Allow access to file URLs** on the
   Slipstream card in `chrome://extensions`.

## Supported sites (content-script matches)

Solscan · Etherscan · BaseScan · BscScan · Arbiscan · GMGN · DexScreener ·
DEXTools · Photon · X / Twitter. Add more domains in `manifest.json`.

## Files

```
extension/
  manifest.json        MV3 manifest
  src/data.js          bundled wallet intelligence (swap for a live API)
  src/content.js       overlay engine — scan, badge, hover card, HUD
  src/content.css      overlay styles (namespaced, !important-hardened)
  src/background.js    service worker (seeds defaults)
  src/popup.html/.js/.css   toolbar popup — toggle, add labels, browse network
  demo/holders.html    standalone demo page
  icons/               generated PNG icons
  make_icons.py        regenerates the icons
```

## Going live

`src/data.js` ships a demo dataset keyed by full address. To use real data,
replace it with a fetch to your indexer (the lookup contract is just
`address → { display, type, pnl30d, winRate, riskScore, ... }`); the overlay
logic in `content.js` is unchanged.

Not affiliated with or endorsed by any other tool. Demo data is illustrative.
