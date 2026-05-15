import { POLY } from "@/lib/data";
import { fmtUSD, pnlColor } from "@/lib/format";

export const metadata = { title: "Polymarket — Slipstream" };

export default function PolymarketPage() {
  const rows = [...POLY].sort((a, b) => b.pnl - a.pnl);
  return (
    <div className="py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Polymarket wallet search</h1>
          <p className="text-muted text-sm">Search 4.1M Polymarket addresses. Side-by-side overlay with their DEX history.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-panel border border-line rounded-lg px-3 py-2 text-sm">
            <option>All markets</option>
            <option>Politics</option>
            <option>Crypto</option>
            <option>Sports</option>
            <option>Macro</option>
          </select>
          <select className="bg-panel border border-line rounded-lg px-3 py-2 text-sm">
            <option>Sort: PnL</option>
            <option>Sort: Win rate</option>
            <option>Sort: # markets</option>
          </select>
        </div>
      </div>

      <div className="card mt-5 p-3">
        <input
          placeholder="Search by address, handle, or market…"
          className="w-full bg-panel2 border border-line rounded-lg px-3 py-3 text-sm"
        />
      </div>

      <div className="card mt-3 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Wallet</th>
              <th className="text-left p-3">Top market</th>
              <th className="text-right p-3">Markets</th>
              <th className="text-right p-3">Win rate</th>
              <th className="text-right p-3 pr-4">PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.address} className="hover:bg-panel2/60">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400/60 to-accent/50 flex items-center justify-center text-bg text-xs font-mono">
                      {p.address.slice(2, 4)}
                    </div>
                    <div>
                      <div className="font-mono text-xs">{p.address}</div>
                      {p.handle && <div className="text-xs text-muted">{p.handle}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-text/80">{p.topMarket}</td>
                <td className="p-3 text-right tabular-nums">{p.markets}</td>
                <td className="p-3 text-right tabular-nums">{p.winRate}%</td>
                <td className={`p-3 pr-4 text-right tabular-nums ${pnlColor(p.pnl)}`}>{fmtUSD(p.pnl, { compact: true, sign: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-3">Demo dataset. Production index covers 4.1M+ addresses and refreshes hourly.</p>
    </div>
  );
}
