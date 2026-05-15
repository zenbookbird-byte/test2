import { UPDATES } from "@/lib/data";

export const metadata = { title: "Changelog — Slipstream" };

const tagStyle = (t: string) => {
  switch (t) {
    case "feature": return "text-accent border-accent/40";
    case "improvement": return "text-warn border-warn/40";
    case "fix": return "text-muted border-line";
    case "launch": return "text-good border-good/40";
    default: return "text-muted border-line";
  }
};

export default function UpdatesPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <span className="chip text-accent border-accent/40">Changelog</span>
        <h1 className="text-3xl md:text-4xl font-semibold mt-3">What we shipped</h1>
        <p className="text-muted mt-2">Subscribe via RSS or follow us — every change is documented here.</p>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-line" />
        <ul className="space-y-8">
          {UPDATES.map((u) => (
            <li key={u.version} className="relative pl-12">
              <span className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-accent shadow-glow" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">{u.date}</span>
                <span className="text-muted">·</span>
                <span className="text-muted">v{u.version}</span>
                <span className={`chip ${tagStyle(u.tag)}`}>{u.tag}</span>
              </div>
              <h2 className="text-xl font-semibold mt-1">{u.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-text/85">
                {u.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-accent shrink-0">→</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="card mt-12 p-6 text-center">
        <h3 className="text-lg font-semibold">On deck</h3>
        <p className="text-muted text-sm mt-2">Hyperliquid + Drift perps overlay · TradingView-grade charts · iOS native app · Wallet-to-wallet flow graph · Public alpha leaderboards.</p>
      </div>
    </div>
  );
}
