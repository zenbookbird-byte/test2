import ChainBadge from "@/components/ChainBadge";
import Sparkline from "@/components/Sparkline";
import { TRADES, KOLS } from "@/lib/data";
import { fmtUSD, pnlColor } from "@/lib/format";

export const metadata = { title: "Terminal — Slipstream" };

const wallets = [
  { name: "Main", addr: "Hp9k...4mT", balance: 24.8, group: "primary", checked: true },
  { name: "Snipe 1", addr: "Fp3w...rT8", balance: 8.1, group: "snipe", checked: true },
  { name: "Snipe 2", addr: "Az8k...vQ2", balance: 5.4, group: "snipe", checked: true },
  { name: "Cold", addr: "Bk1q...9aZ", balance: 142.3, group: "cold", checked: false },
  { name: "Base hot", addr: "0x91..4d", balance: 1.2, group: "evm", checked: false },
];

export default function TerminalPage() {
  return (
    <div className="py-6">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold">Terminal</h1>
          <p className="text-muted text-sm">Multi-wallet trading with grouped execution and stealth routing.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="chip text-good border-good/40">RPC: 142ms</span>
          <span className="chip">Turnkey signer</span>
          <span className="chip">Fee 0.05%</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* Wallets panel */}
        <aside className="lg:col-span-3 card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Wallets</div>
            <button className="text-accent text-xs">+ Add</button>
          </div>
          <input
            placeholder="Search wallet…"
            className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm mb-3"
          />
          <ul className="space-y-1">
            {wallets.map((w) => (
              <li key={w.name} className={`flex items-center gap-2 p-2 rounded-lg ${w.checked ? "bg-panel2 border border-accent/30" : "border border-transparent"}`}>
                <input type="checkbox" defaultChecked={w.checked} className="accent-accent" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{w.name}</span>
                    <span className="chip text-[10px]">{w.group}</span>
                  </div>
                  <div className="text-xs text-muted font-mono">{w.addr}</div>
                </div>
                <div className="text-xs tabular-nums">{w.balance} ◎</div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line mt-4 pt-3 text-xs text-muted flex justify-between">
            <span>3 selected</span>
            <span>38.3 ◎ pooled</span>
          </div>
        </aside>

        {/* Chart panel */}
        <section className="lg:col-span-6 card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">$PUMPED</span>
                <span className="text-muted text-xs font-mono">Gx2c...8XYZ</span>
                <ChainBadge chain="SOL" />
              </div>
              <div className="text-2xl font-semibold mt-1 tabular-nums">$0.01240 <span className="text-good text-base">+38.2%</span></div>
            </div>
            <div className="flex gap-1 text-xs">
              {["1m","5m","15m","1h","4h","1d"].map((t,i) => (
                <button key={t} className={`px-2 py-1 rounded ${i===1?"bg-panel2 border border-line":""}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-panel2 border border-line p-2">
            <Sparkline
              data={[10,12,9,14,18,22,17,24,30,28,34,40,38,46,52,49,55,62,58,66,72,68,74,82,78,86,92,88,95,99]}
              width={720}
              height={220}
              stroke="#5eead4"
              fill="rgba(94,234,212,0.18)"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
            <Mini label="Mcap" value="$1.42M" />
            <Mini label="Liquidity" value="$284k" />
            <Mini label="Holders" value="3,124" />
            <Mini label="Top-10 %" value="22%" />
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="font-medium mb-2 text-sm">Smart wallets in this token</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {KOLS.slice(0, 4).map((k) => (
                <div key={k.handle} className="flex items-center gap-2 bg-panel2 border border-line rounded-lg p-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/60 to-indigo-400/50 flex items-center justify-center text-bg text-xs font-semibold">
                    {k.display[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{k.display}</div>
                    <div className="text-xs text-muted">bought 2m ago · {fmtUSD(k.pnl30d / 12, { compact: true })}</div>
                  </div>
                  <span className={`text-xs ${pnlColor(k.pnl30d)}`}>{k.winRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Order ticket */}
        <aside className="lg:col-span-3 card p-4">
          <div className="flex bg-panel2 border border-line rounded-lg p-1 mb-3">
            <button className="flex-1 py-1.5 rounded-md bg-good/20 text-good font-medium text-sm">Buy</button>
            <button className="flex-1 py-1.5 rounded-md text-bad text-sm">Sell</button>
          </div>
          <label className="text-xs text-muted">Amount per wallet</label>
          <div className="flex bg-panel2 border border-line rounded-lg mt-1">
            <input className="flex-1 bg-transparent px-3 py-2 text-sm" defaultValue="0.5" />
            <span className="px-3 py-2 text-sm text-muted border-l border-line">SOL</span>
          </div>
          <div className="flex gap-1 mt-2">
            {["0.1","0.25","0.5","1","2"].map((v,i) => (
              <button key={v} className={`flex-1 text-xs py-1 rounded-md border ${i===2?"border-accent text-accent":"border-line text-muted"}`}>{v}</button>
            ))}
          </div>

          <label className="text-xs text-muted block mt-4">Slippage</label>
          <div className="flex gap-1 mt-1">
            {["5%","10%","15%","custom"].map((v,i) => (
              <button key={v} className={`flex-1 text-xs py-1.5 rounded-md border ${i===1?"border-accent text-accent":"border-line text-muted"}`}>{v}</button>
            ))}
          </div>

          <label className="text-xs text-muted block mt-4">Priority fee</label>
          <input className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm mt-1" defaultValue="0.003" />

          <div className="mt-4 space-y-2 text-xs">
            <Toggle label="Anti-MEV (Jito)" on />
            <Toggle label="Stealth route" on />
            <Toggle label="Auto-take-profit @ 2x" />
            <Toggle label="Stop-loss @ -25%" on />
          </div>

          <div className="border-t border-line mt-4 pt-3 text-xs space-y-1 text-muted">
            <Row k="Wallets" v="3 selected" />
            <Row k="Total in" v="1.5 SOL" />
            <Row k="Est. fee" v="0.0008 SOL" />
            <Row k="Network" v="142ms" />
          </div>

          <button className="btn-primary w-full mt-4">Buy $PUMPED</button>
          <div className="text-center text-xs text-muted mt-2">Hotkey: <kbd className="chip">B</kbd></div>
        </aside>
      </div>

      {/* Tape */}
      <div className="card mt-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Tape for $PUMPED</div>
          <span className="chip">last 12 trades</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-muted text-xs">
            <tr>
              <th className="text-left py-1">When</th>
              <th className="text-left py-1">Who</th>
              <th className="text-left py-1">Side</th>
              <th className="text-right py-1">Size</th>
              <th className="text-right py-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {TRADES.slice(0, 8).map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="py-1.5 text-muted text-xs">{t.ts}</td>
                <td className="py-1.5">{t.who}</td>
                <td className={`py-1.5 ${t.side === "BUY" ? "text-good" : "text-bad"}`}>{t.side}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtUSD(t.size, { compact: true })}</td>
                <td className="py-1.5 text-right tabular-nums">${t.price.toFixed(t.price < 0.01 ? 6 : 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel2 border border-line rounded-lg p-2">
      <div className="text-muted">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}
function Toggle({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text/80">{label}</span>
      <span className={`relative inline-block w-8 h-4 rounded-full ${on ? "bg-accent" : "bg-line"}`}>
        <span className={`absolute top-0.5 ${on ? "left-4" : "left-0.5"} w-3 h-3 rounded-full bg-bg transition-all`} />
      </span>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between"><span>{k}</span><span className="text-text">{v}</span></div>
  );
}
