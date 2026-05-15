import Link from "next/link";
import Sparkline from "@/components/Sparkline";
import ChainBadge from "@/components/ChainBadge";
import { KOLS, TRADES, CHAINS } from "@/lib/data";
import { fmtUSD, pnlColor } from "@/lib/format";

export default function Home() {
  const top = [...KOLS].sort((a, b) => b.pnl30d - a.pnl30d).slice(0, 4);
  const feed = TRADES.slice(0, 5);

  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="bg-aurora absolute inset-0 -z-10" />
        <div className="bg-grid absolute inset-0 -z-10 opacity-40" />
        <div className="pt-20 pb-12 md:pt-28 md:pb-20 text-center max-w-3xl mx-auto">
          <div className="chip mx-auto mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            v1.8 — AI alpha alerts now live
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            Ride the <span className="grad-text">slipstream</span> of smart money.
          </h1>
          <p className="mt-5 text-lg text-muted max-w-2xl mx-auto">
            A trading desk + on-chain intelligence layer that overlays every explorer and timeline you already use. Multi-wallet, multi-chain, sub-second fills, 0.05% fees.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/terminal" className="btn-primary">Launch the terminal</Link>
            <Link href="/dashboard" className="btn-ghost">See the live feed</Link>
          </div>
          <div className="mt-7 flex items-center justify-center gap-2 flex-wrap text-xs text-muted">
            <span>Supports</span>
            {CHAINS.map((c) => (
              <ChainBadge key={c.code} chain={c.code} />
            ))}
          </div>
        </div>
      </section>

      {/* Live preview band */}
      <section className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted">Smart-money feed (last 5)</div>
            <span className="chip">live</span>
          </div>
          <ul className="space-y-2">
            {feed.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`chip ${t.side === "BUY" ? "text-good" : "text-bad"}`}>{t.side}</span>
                  <span className="truncate">{t.who}</span>
                  <span className="text-muted">→ ${t.ticker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChainBadge chain={t.chain} />
                  <span className="tabular-nums">{fmtUSD(t.size, { compact: true })}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="text-accent text-sm mt-4 inline-block">Open full feed →</Link>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted">Top wallets — last 30 days</div>
            <Link href="/leaderboard" className="text-accent text-sm">Full leaderboard →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {top.map((k) => (
              <Link href={`/wallet/${encodeURIComponent(k.handle)}`} key={k.handle} className="card card-hover p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/60 to-indigo-400/50 flex items-center justify-center text-bg font-semibold">
                  {k.display[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.display}</span>
                    <span className="text-xs text-muted truncate">{k.handle}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className={pnlColor(k.pnl30d)}>{fmtUSD(k.pnl30d, { compact: true, sign: true })}</span>
                    <span className="text-muted">· WR {k.winRate}%</span>
                  </div>
                </div>
                <Sparkline data={k.sparkline} width={90} height={32} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold">Everything you wished frontrunning was — without the latency tax.</h2>
          <p className="text-muted mt-3 max-w-2xl mx-auto">
            Slipstream pairs a real trading desk with a network of 140k+ pre-labeled wallets across five chains.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5 card-hover">
              <div className="text-accent">{f.icon}</div>
              <h3 className="font-semibold mt-3">{f.title}</h3>
              <p className="text-sm text-muted mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mt-20 card p-6 md:p-8 grad-border">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div>
            <div className="text-sm text-accent uppercase tracking-wider">Why Slipstream</div>
            <h3 className="text-2xl font-semibold mt-2">Built for traders who already know what they're doing.</h3>
            <p className="text-muted mt-3 text-sm">
              We took the bones of what worked in the extension-wallet era — labels, smart-money overlays, fast execution — and shipped the
              things that were always missing: AI alpha, backtests, an auto-snipe DSL, and a real mobile app.
            </p>
          </div>
          <div className="md:col-span-2 grid sm:grid-cols-3 gap-3">
            <Stat label="Pre-labeled wallets" value="140k+" />
            <Stat label="Polymarket addresses" value="4.1M" />
            <Stat label="Median fill" value="0.8s" />
            <Stat label="Flat fee" value="0.05%" />
            <Stat label="Cashback" value="up to 92%" />
            <Stat label="Chains" value="5 + EVM L2s" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="my-20 text-center">
        <h3 className="text-3xl font-semibold">Stop guessing. Start riding the slipstream.</h3>
        <p className="text-muted mt-3">Free during beta. No keys ever leave your device.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/terminal" className="btn-primary">Launch terminal</Link>
          <Link href="/updates" className="btn-ghost">What&apos;s new</Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel2 border border-line rounded-lg p-3">
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1 grad-text">{value}</div>
    </div>
  );
}

const FEATURES = [
  {
    title: "AI Alpha Alerts",
    desc: "Get pinged the moment 3+ smart wallets cluster-buy. Plain-English reasoning attached to every alert.",
    icon: <Icon path="M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />,
  },
  {
    title: "Multi-wallet Groups",
    desc: "Trade from 1, 5, or 50 wallets in a single click. Per-group hotkeys, slippage and stealth routing.",
    icon: <Icon path="M3 7h18M3 12h18M3 17h18" />,
  },
  {
    title: "Universal Labels",
    desc: "Your labels follow you across X, Solscan, BaseScan, GMGN, Photon, Axiom, DexScreener.",
    icon: <Icon path="M7 7l10 10M17 7L7 17" />,
  },
  {
    title: "Auto-Snipe Rules",
    desc: "If-this-then-buy in plain English. Per-rule kill switch, max daily loss, dry-run replay.",
    icon: <Icon path="M12 4l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />,
  },
  {
    title: "Backtest Studio",
    desc: "Replay any wallet over 365 days with adjustable slippage. Equity curve, drawdown, Sortino.",
    icon: <Icon path="M3 17l5-5 4 4 8-8" />,
  },
  {
    title: "Risk Score v2",
    desc: "Transparent. Hover a score to see the 4 biggest contributors. No black-box scoring.",
    icon: <Icon path="M12 2l9 5v6c0 5-4 9-9 9s-9-4-9-9V7l9-5z" />,
  },
];

function Icon({ path }: { path: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
