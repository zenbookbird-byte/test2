import Link from "next/link";
import ChainBadge from "@/components/ChainBadge";
import Sparkline from "@/components/Sparkline";
import { KOLS } from "@/lib/data";
import { fmtUSD, fmtNum, pnlColor } from "@/lib/format";

export const metadata = { title: "Leaderboard — Slipstream" };

export default function LeaderboardPage() {
  const rows = [...KOLS].sort((a, b) => b.pnl30d - a.pnl30d);
  return (
    <div className="py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Smart-money leaderboard</h1>
          <p className="text-muted text-sm">Ranked by 30-day realized PnL. Click a row for the full wallet card.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-panel border border-line rounded-lg px-3 py-2 text-sm">
            <option>All chains</option>
            <option>Solana</option>
            <option>Base</option>
            <option>BSC</option>
            <option>Ethereum</option>
            <option>Arbitrum</option>
          </select>
          <select className="bg-panel border border-line rounded-lg px-3 py-2 text-sm">
            <option>Last 30d</option>
            <option>Last 7d</option>
            <option>Last 24h</option>
            <option>All-time</option>
          </select>
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Wallet</th>
              <th className="text-left p-3">Chains</th>
              <th className="text-right p-3">PnL 30d</th>
              <th className="text-right p-3">PnL all-time</th>
              <th className="text-right p-3">Win rate</th>
              <th className="text-right p-3">Trades</th>
              <th className="text-right p-3">Followers</th>
              <th className="text-right p-3">Risk</th>
              <th className="text-right p-3 pr-4">30d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((k, i) => (
              <tr key={k.handle} className="hover:bg-panel2/60 transition">
                <td className="p-3 text-muted tabular-nums">{i + 1}</td>
                <td className="p-3">
                  <Link href={`/wallet/${encodeURIComponent(k.handle)}`} className="flex items-center gap-3 hover:text-accent">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/60 to-indigo-400/50 flex items-center justify-center text-bg font-semibold">
                      {k.display[0]}
                    </div>
                    <div>
                      <div className="font-medium">{k.display}</div>
                      <div className="text-xs text-muted">{k.handle}</div>
                    </div>
                  </Link>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {k.chains.map((c) => <ChainBadge key={c} chain={c} />)}
                  </div>
                </td>
                <td className={`p-3 text-right tabular-nums ${pnlColor(k.pnl30d)}`}>{fmtUSD(k.pnl30d, { compact: true, sign: true })}</td>
                <td className="p-3 text-right tabular-nums">{fmtUSD(k.pnlAll, { compact: true })}</td>
                <td className="p-3 text-right tabular-nums">{k.winRate}%</td>
                <td className="p-3 text-right tabular-nums">{k.trades30d}</td>
                <td className="p-3 text-right tabular-nums">{fmtNum(k.followers)}</td>
                <td className="p-3 text-right">
                  <span className={`chip ${k.riskScore < 30 ? "text-good border-good/40" : k.riskScore < 55 ? "text-warn border-warn/40" : "text-bad border-bad/40"}`}>
                    {k.riskScore}
                  </span>
                </td>
                <td className="p-2 pr-4 text-right">
                  <div className="inline-block">
                    <Sparkline data={k.sparkline} width={90} height={28} stroke={k.pnl30d >= 0 ? "#34d399" : "#f87171"} fill={k.pnl30d >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
