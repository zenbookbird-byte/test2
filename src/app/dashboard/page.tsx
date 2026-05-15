import ChainBadge from "@/components/ChainBadge";
import Sparkline from "@/components/Sparkline";
import { KOLS, TRADES } from "@/lib/data";
import { fmtUSD, pnlColor } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Live feed — Slipstream" };

export default function DashboardPage() {
  const totalVol = TRADES.reduce((s, t) => s + t.size, 0);
  const buys = TRADES.filter((t) => t.side === "BUY").length;
  const sells = TRADES.length - buys;
  const totalPnl = TRADES.reduce((s, t) => s + (t.pnl ?? 0), 0);

  return (
    <div className="py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Live smart-money feed</h1>
          <p className="text-muted text-sm">Cluster-buys, big sells, and AI commentary across all watched wallets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost">Filters</button>
          <button className="btn-primary">+ New alert rule</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <KPI label="Volume (24h)" value={fmtUSD(totalVol, { compact: true })} />
        <KPI label="Trades" value={`${TRADES.length}`} sub={`${buys} buys / ${sells} sells`} />
        <KPI label="Realized PnL" value={fmtUSD(totalPnl, { compact: true, sign: true })} tone={totalPnl >= 0 ? "good" : "bad"} />
        <KPI label="Active wallets" value={`${KOLS.length}`} sub="watched" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 card">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <div className="font-medium">Trade tape</div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-good animate-pulse" /> live
            </div>
          </div>
          <ul className="divide-y divide-line">
            {TRADES.map((t) => (
              <li key={t.id} className="p-4 hover:bg-panel2/60 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`chip ${t.side === "BUY" ? "text-good border-good/40" : "text-bad border-bad/40"}`}>{t.side}</span>
                    <Link href={`/wallet/${encodeURIComponent(t.who)}`} className="hover:text-accent truncate">{t.who}</Link>
                    <span className="text-muted">·</span>
                    <span className="font-medium">${t.ticker}</span>
                    <span className="text-muted font-mono text-xs hidden md:inline">{t.token}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChainBadge chain={t.chain} />
                    <span className="text-sm tabular-nums">{fmtUSD(t.size, { compact: true })}</span>
                    {t.pnl !== undefined && (
                      <span className={`text-sm tabular-nums ${pnlColor(t.pnl)}`}>{fmtUSD(t.pnl, { compact: true, sign: true })}</span>
                    )}
                    <span className="text-muted text-xs">{t.ts}</span>
                  </div>
                </div>
                {t.aiNote && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-accent/90">
                    <span className="chip border-accent/40 text-accent">AI</span>
                    <span className="text-muted">{t.aiNote}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <aside className="card p-4">
          <div className="font-medium mb-3">Trending wallets</div>
          <ul className="space-y-3">
            {[...KOLS].sort((a, b) => b.pnl30d - a.pnl30d).slice(0, 6).map((k) => (
              <li key={k.handle} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/60 to-indigo-400/50 flex items-center justify-center text-bg text-sm font-semibold">
                  {k.display[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/wallet/${encodeURIComponent(k.handle)}`} className="text-sm font-medium hover:text-accent truncate block">{k.display}</Link>
                  <div className="text-xs text-muted">
                    <span className={pnlColor(k.pnl30d)}>{fmtUSD(k.pnl30d, { compact: true, sign: true })}</span> · WR {k.winRate}%
                  </div>
                </div>
                <Sparkline data={k.sparkline} width={70} height={26} />
              </li>
            ))}
          </ul>

          <div className="border-t border-line mt-5 pt-5">
            <div className="font-medium mb-2">AI alert preview</div>
            <div className="bg-panel2 border border-accent/30 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-accent text-xs mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> cluster-buy detected
              </div>
              <p className="text-text/90">
                <span className="font-medium">5 smart wallets</span> bought <span className="font-medium">$PUMPED</span> within 90s.
                Estimated combined size <span className="tabular-nums">$184k</span>. LP burned, dev locked.
              </p>
              <button className="btn-primary mt-3 w-full">Open in terminal</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="card p-4">
      <div className="stat-label">{label}</div>
      <div className={`stat-value mt-1 ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
