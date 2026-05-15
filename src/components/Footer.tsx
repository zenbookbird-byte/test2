import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line mt-20">
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="font-semibold mb-2">Slipstream</div>
          <p className="text-muted">Ride the slipstream of smart money. On-chain intelligence + a trading desk in your browser.</p>
        </div>
        <div>
          <div className="font-medium mb-2">Product</div>
          <ul className="space-y-1 text-muted">
            <li><Link href="/dashboard">Live feed</Link></li>
            <li><Link href="/leaderboard">Leaderboard</Link></li>
            <li><Link href="/terminal">Terminal</Link></li>
            <li><Link href="/labels">Labels</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Coverage</div>
          <ul className="space-y-1 text-muted">
            <li>Solana</li>
            <li>Base</li>
            <li>BSC</li>
            <li>Ethereum & Arbitrum</li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Company</div>
          <ul className="space-y-1 text-muted">
            <li><Link href="/updates">Changelog</Link></li>
            <li>Docs</li>
            <li>Status</li>
            <li>Privacy</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Slipstream Labs. Not financial advice.
      </div>
    </footer>
  );
}
