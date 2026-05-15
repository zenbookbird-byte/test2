import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Feed" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/terminal", label: "Terminal" },
  { href: "/labels", label: "Labels" },
  { href: "/polymarket", label: "Polymarket" },
  { href: "/updates", label: "Updates" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-bg/70 border-b border-line">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight">Slipstream</span>
          <span className="chip ml-2">beta</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-sm text-text/80 rounded-md hover:text-accent hover:bg-panel"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex">Open app</Link>
          <Link href="/terminal" className="btn-primary">Launch terminal</Link>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path d="M3 13c4-7 14-7 18 0" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 17c4-5 14-5 18 0" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <circle cx="20" cy="8" r="2" fill="#5eead4" />
    </svg>
  );
}
