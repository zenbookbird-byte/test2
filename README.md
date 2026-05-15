# Slipstream

> Ride the slipstream of smart money.

Slipstream is a trading-desk + on-chain intelligence app inspired by the smart-money-tracking category (Frontrun, GMGN, Photon, Axiom). It pairs a multi-wallet execution terminal with a network of pre-labeled wallets across **Solana, Base, BSC, Ethereum, and Arbitrum**, and adds the things that have been missing from the category: AI-explained alpha alerts, a backtest studio, a plain-English auto-snipe rule builder, a transparent risk score, and a Polymarket address index.

Slipstream is a wholly distinct product and brand — not affiliated with or endorsed by any other tool. The UI, copy, data, and feature set in this repo are original.

## What's inside

- **Landing** — hero, feature grid, stats, CTA.
- **Live feed** (`/dashboard`) — smart-money trade tape with AI commentary.
- **Leaderboard** (`/leaderboard`) — KOL & smart-money wallets ranked by realized PnL, with risk score and win rate.
- **Wallet detail** (`/wallet/[handle]`) — equity curve, risk breakdown, recent trades.
- **Terminal** (`/terminal`) — multi-wallet order ticket, grouped execution, anti-MEV, hotkeys.
- **Labels** (`/labels`) — universal label manager that overlays explorers + timelines.
- **Polymarket search** (`/polymarket`) — sortable wallet index with PnL and win-rate.
- **Changelog** (`/updates`) — every release documented.

## Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS
- All data is local mock data (`src/lib/data.ts`) — wire up your own RPC + indexer to go live.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Improvements over the inspiration

The features that ship in v1.8 and prior — listed on `/updates` — are all new:

1. **AI Alpha Alerts** — cluster-buy detection with plain-English reasoning.
2. **Backtest Studio** — 365-day replay with adjustable slippage, equity curve, Sortino.
3. **Auto-Snipe Rules** — visual rule builder with dry-run, kill switch, daily-loss cap.
4. **Arbitrum + Ethereum** — five chains, one label set, automatic sibling-wallet clustering.
5. **Risk Score v2** — transparent, factor-attributed, no black box.
6. **Polymarket Pro Search** — 4.1M addresses, side-by-side with DEX history.
7. **Portfolio Aggregator** — Koinly / CoinTracker-compatible CSV export.
8. **Trading Wallet Groups** — split orders by % or fixed size across groups.
9. **Mobile PWA** — full feed and one-tap buys, biometric sign-in.
10. **Universal Labels v2** — overlays 10+ platforms incl. DexScreener and Axiom.
