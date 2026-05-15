import Link from "next/link";
import Sparkline from "@/components/Sparkline";
import ChainBadge from "@/components/ChainBadge";
import { KOLS, TRADES } from "@/lib/data";
import { fmtUSD, fmtNum, pnlColor } from "@/lib/format";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return KOLS.map((k) => ({ id: k.handle }));
}

export default function WalletPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const k = KOLS.find((w) => w.handle === id);
  if (!k) return notFound();
  const trades = TRADES.filter((t) => t.who === k.handle);
  const riskTone = k.riskScore < 30 ? "good" : k.riskScore < 55 ? "warn" : "bad";

  return (
    <div className="py-8">
      <Link href="/leaderboard" className="text-muted text-sm hover:text-accent">← Leaderboard</Link>

      <div className="card mt-4 p-6 flex flex-wrap items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/70 to-indigo-400/60 flex items-center justify-center text-bg text-2xl font-semibold">
          {k.display[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{k.display}</h1>
            <span className="text-muted">{k.handle}</span>
            <span className="chip font-mono">{k.wallet}</span>
            {k.tags.map((t) => <span key={t} className="chip text-accent border-accent/30">{t}</span>)}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {k.chains.map((c) => <ChainBadge key={c} chain={c} />)}
            <span className="text-xs text-muted">· {fmtNum(k.followers)} followers</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost">Add label</button>
          <button className="btn-primary">Copy-trade</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <KPI label="PnL — 30d" value={fmtUSD(k.pnl30d, { compact: true, sign: true })} tone={k.pnl30d >= 0 ? "good" : "bad"} />
        <KPI label="PnL — all-time" value={fmtUSD(k.pnlAll, { compact: true })} />
        <KPI label="Win rate" value={`${k.winRate}%`} />
        <KPI label="Trades (30d)" value={`${k.trades30d}`} />
        <KPI label="Risk score" value={`${k.riskScore} / 100`} tone={riskTone as "good" | "warn" | "bad"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Equity curve (30d, mock)</div>
            <div className="text-xs text-muted">USD, realized</div>
          </div>
          <Sparkline data={k.sparkline} width={720} height={180} stroke={k.pnl30d >= 0 ? "#34d399" : "#f87171"} fill={k.pnl30d >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"} />
        </div>

        <div className="card p-5">
          <div className="font-medium mb-3">Risk breakdown</div>
          <RiskBar label="Holding time" value={Math.min(100, 100 - k.riskScore + 15)} />
          <RiskBar label="LP / contract risk" value={k.riskScore} invert />
          <RiskBar label="Farming behavior" value={Math.max(0, k.riskScore - 10)} invert />
          <RiskBar label="Counterparty quality" value={Math.min(100, 90 - k.riskScore)} />
          <p className="text-xs text-muted mt-3">Hover individual factors in production to see why this wallet scored each component.</p>
        </div>
      </div>

      <div className="card mt-5">
        <div className="p-4 border-b border-line font-medium">Recent trades</div>
        {trades.length === 0 ? (
          <div className="p-6 text-muted text-sm">No recent trades in the tape window.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-panel2 text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Side</th>
                <th className="text-left p-3">Token</th>
                <th className="text-left p-3">Chain</th>
                <th className="text-right p-3">Size</th>
                <th className="text-right p-3 pr-4">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="p-3 text-muted">{t.ts}</td>
                  <td className="p-3"><span className={`chip ${t.side === "BUY" ? "text-good border-good/40" : "text-bad border-bad/40"}`}>{t.side}</span></td>
                  <td className="p-3">${t.ticker}</td>
                  <td className="p-3"><ChainBadge chain={t.chain} /></td>
                  <td className="p-3 text-right tabular-nums">{fmtUSD(t.size, { compact: true })}</td>
                  <td className={`p-3 pr-4 text-right tabular-nums ${t.pnl ? pnlColor(t.pnl) : "text-muted"}`}>
                    {t.pnl !== undefined ? fmtUSD(t.pnl, { compact: true, sign: true }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "warn" }) {
  const cls = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "";
  return (
    <div className="card p-4">
      <div className="stat-label">{label}</div>
      <div className={`stat-value mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

function RiskBar({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value < 40 : value > 60;
  const mid = invert ? value < 65 : value > 35;
  const color = good ? "bg-good" : mid ? "bg-warn" : "bg-bad";
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
