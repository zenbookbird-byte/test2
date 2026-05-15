export type Chain = "SOL" | "BASE" | "BSC" | "ETH" | "ARB";

export const CHAINS: { code: Chain; name: string; color: string }[] = [
  { code: "SOL", name: "Solana", color: "#9945ff" },
  { code: "BASE", name: "Base", color: "#2151f5" },
  { code: "BSC", name: "BSC", color: "#f3ba2f" },
  { code: "ETH", name: "Ethereum", color: "#627eea" },
  { code: "ARB", name: "Arbitrum", color: "#28a0f0" },
];

export type KOL = {
  handle: string;
  display: string;
  wallet: string;
  chains: Chain[];
  pnl30d: number;
  pnlAll: number;
  winRate: number;
  trades30d: number;
  followers: number;
  tags: string[];
  riskScore: number;
  sparkline: number[];
};

const seed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function spark(s: string, n = 24, drift = 0): number[] {
  const r = seed(s);
  let v = 50;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5 + drift) * 14;
    v = Math.max(5, Math.min(95, v));
    out.push(Math.round(v));
  }
  return out;
}

export const KOLS: KOL[] = [
  {
    handle: "@orbital",
    display: "Orbital",
    wallet: "Hx9k...4mTp",
    chains: ["SOL", "BASE"],
    pnl30d: 482300,
    pnlAll: 3120000,
    winRate: 71,
    trades30d: 142,
    followers: 38400,
    tags: ["smart-money", "early"],
    riskScore: 22,
    sparkline: spark("orbital", 30, 0.18),
  },
  {
    handle: "@cobie",
    display: "Cobie",
    wallet: "Bk1q...9aZx",
    chains: ["SOL", "ETH"],
    pnl30d: -94100,
    pnlAll: 1850000,
    winRate: 54,
    trades30d: 36,
    followers: 712000,
    tags: ["kol", "macro"],
    riskScore: 41,
    sparkline: spark("cobie", 30, -0.05),
  },
  {
    handle: "@gake",
    display: "GAKE",
    wallet: "Fp3w...rT8s",
    chains: ["SOL"],
    pnl30d: 1240000,
    pnlAll: 6780000,
    winRate: 68,
    trades30d: 412,
    followers: 22100,
    tags: ["sniper", "memes"],
    riskScore: 58,
    sparkline: spark("gake", 30, 0.32),
  },
  {
    handle: "@waddles",
    display: "Waddles",
    wallet: "Az8k...vQ2m",
    chains: ["BASE", "ETH"],
    pnl30d: 218400,
    pnlAll: 982000,
    winRate: 63,
    trades30d: 88,
    followers: 14900,
    tags: ["base", "alpha"],
    riskScore: 31,
    sparkline: spark("waddles", 30, 0.12),
  },
  {
    handle: "@mert",
    display: "Mert",
    wallet: "Cn9j...kP1d",
    chains: ["SOL"],
    pnl30d: 86200,
    pnlAll: 412000,
    winRate: 59,
    trades30d: 24,
    followers: 198000,
    tags: ["kol", "infra"],
    riskScore: 18,
    sparkline: spark("mert", 30, 0.08),
  },
  {
    handle: "@ansem",
    display: "Ansem",
    wallet: "Dy7m...rZ4q",
    chains: ["SOL", "ETH", "BASE"],
    pnl30d: 654000,
    pnlAll: 9120000,
    winRate: 66,
    trades30d: 192,
    followers: 480000,
    tags: ["kol", "memes"],
    riskScore: 36,
    sparkline: spark("ansem", 30, 0.22),
  },
  {
    handle: "@hsaka",
    display: "Hsaka",
    wallet: "Eh4r...mN5p",
    chains: ["BSC", "ETH"],
    pnl30d: 142000,
    pnlAll: 2240000,
    winRate: 61,
    trades30d: 52,
    followers: 312000,
    tags: ["kol", "perps"],
    riskScore: 27,
    sparkline: spark("hsaka", 30, 0.10),
  },
  {
    handle: "@inversebrah",
    display: "Inverse",
    wallet: "Gx2c...bV8w",
    chains: ["SOL", "ETH"],
    pnl30d: -42000,
    pnlAll: 88000,
    winRate: 38,
    trades30d: 410,
    followers: 240000,
    tags: ["contrarian", "noise"],
    riskScore: 72,
    sparkline: spark("inverse", 30, -0.02),
  },
  {
    handle: "@frankdegods",
    display: "FrankDeGods",
    wallet: "Jp8l...wE3a",
    chains: ["SOL", "ETH"],
    pnl30d: 312000,
    pnlAll: 4120000,
    winRate: 64,
    trades30d: 78,
    followers: 520000,
    tags: ["nft", "kol"],
    riskScore: 33,
    sparkline: spark("frank", 30, 0.16),
  },
  {
    handle: "@cl207",
    display: "cl",
    wallet: "Km9d...tY6f",
    chains: ["SOL"],
    pnl30d: 412000,
    pnlAll: 1820000,
    winRate: 73,
    trades30d: 64,
    followers: 92000,
    tags: ["early", "alpha"],
    riskScore: 19,
    sparkline: spark("cl207", 30, 0.25),
  },
];

export type Trade = {
  id: string;
  ts: string;
  who: string; // handle
  side: "BUY" | "SELL";
  token: string;
  ticker: string;
  chain: Chain;
  size: number; // USD
  price: number;
  pnl?: number;
  aiNote?: string;
};

export const TRADES: Trade[] = [
  { id: "t1", ts: "14s ago", who: "@gake", side: "BUY", token: "Gx2c...8XYZ", ticker: "PUMPED", chain: "SOL", size: 42300, price: 0.0124, aiNote: "5 smart wallets bought within last 90s" },
  { id: "t2", ts: "32s ago", who: "@cl207", side: "BUY", token: "Hh3w...PEPE", ticker: "MAXI", chain: "SOL", size: 18900, price: 0.0008, aiNote: "Dev wallet locked; LP burned" },
  { id: "t3", ts: "1m ago", who: "@orbital", side: "SELL", token: "Bk1q...DOGE", ticker: "WIFE", chain: "SOL", size: 91200, price: 0.0312, pnl: 38400 },
  { id: "t4", ts: "2m ago", who: "@ansem", side: "BUY", token: "0x8a..2c", ticker: "BRETT", chain: "BASE", size: 124000, price: 0.082, aiNote: "Cluster of 8 smart followers entering" },
  { id: "t5", ts: "3m ago", who: "@waddles", side: "BUY", token: "0x9b..1a", ticker: "AERO", chain: "BASE", size: 22300, price: 0.94 },
  { id: "t6", ts: "4m ago", who: "@mert", side: "BUY", token: "Cn9j...JTO", ticker: "JTO", chain: "SOL", size: 56400, price: 2.84 },
  { id: "t7", ts: "5m ago", who: "@hsaka", side: "SELL", token: "0x2c..ff", ticker: "PEPE", chain: "ETH", size: 220000, price: 0.0000088, pnl: 64200 },
  { id: "t8", ts: "7m ago", who: "@frankdegods", side: "BUY", token: "Sol1...DBR", ticker: "DBR", chain: "SOL", size: 38100, price: 0.062 },
  { id: "t9", ts: "9m ago", who: "@cobie", side: "SELL", token: "0xab..d1", ticker: "ETH", chain: "ETH", size: 412000, price: 3812, pnl: -12400 },
  { id: "t10", ts: "12m ago", who: "@orbital", side: "BUY", token: "Sol2...WEN", ticker: "WEN", chain: "SOL", size: 14200, price: 0.00018, aiNote: "Twitter mention spike +340% in 5m" },
  { id: "t11", ts: "14m ago", who: "@gake", side: "BUY", token: "Sol3...POPCAT", ticker: "POPCAT", chain: "SOL", size: 78300, price: 1.42 },
  { id: "t12", ts: "18m ago", who: "@inversebrah", side: "BUY", token: "0xaa..ff", ticker: "DOGE", chain: "ETH", size: 9200, price: 0.142, aiNote: "Inverse signal: consider opposite" },
];

export type Update = {
  date: string;
  version: string;
  title: string;
  tag: "feature" | "improvement" | "fix" | "launch";
  bullets: string[];
};

export const UPDATES: Update[] = [
  {
    date: "May 14, 2026",
    version: "1.8.0",
    tag: "feature",
    title: "AI Alpha Alerts",
    bullets: [
      "Real-time alerts when N smart wallets cluster-buy the same token within a configurable window.",
      "Plain-English explanations: why a trade matters, who is buying, and how it compares to historical setups.",
      "Push to Telegram, Discord, mobile PWA, or browser. Per-rule webhook included.",
    ],
  },
  {
    date: "May 10, 2026",
    version: "1.7.2",
    tag: "feature",
    title: "Backtest Studio",
    bullets: [
      "Replay any wallet or wallet-group over the last 365 days with adjustable slippage and fee assumptions.",
      "Auto-generated equity curve, drawdown chart, Sortino, and per-token attribution.",
      "Export to CSV or share a read-only link.",
    ],
  },
  {
    date: "May 6, 2026",
    version: "1.7.0",
    tag: "feature",
    title: "Auto-Snipe Rules",
    bullets: [
      "Build rules visually: 'When @orbital buys > $25k on Solana and LP is burned, buy 0.5 SOL with 12% slippage cap.'",
      "Per-rule kill switch, max daily loss, and circuit-breaker on consecutive losses.",
      "Dry-run mode replays the rule against the last 30 days before going live.",
    ],
  },
  {
    date: "Apr 28, 2026",
    version: "1.6.0",
    tag: "launch",
    title: "Arbitrum & Ethereum support",
    bullets: [
      "Live: Solana, Base, BSC, Ethereum, Arbitrum. One label set across all five.",
      "Cross-chain wallet clustering — sibling wallets are detected and grouped automatically.",
    ],
  },
  {
    date: "Apr 19, 2026",
    version: "1.5.3",
    tag: "improvement",
    title: "Risk Score v2",
    bullets: [
      "New model weights farming behavior, holding time, and contract risk explicitly.",
      "Hover any score to see the four largest contributors — no more black box.",
    ],
  },
  {
    date: "Apr 11, 2026",
    version: "1.5.0",
    tag: "feature",
    title: "Polymarket Pro Search",
    bullets: [
      "Search 4.1M Polymarket wallets by handle, PnL, market, or position size.",
      "Side-by-side overlay against on-chain DEX activity for the same address.",
    ],
  },
  {
    date: "Apr 3, 2026",
    version: "1.4.2",
    tag: "improvement",
    title: "Portfolio Aggregator",
    bullets: [
      "Roll up balances, realized PnL, and tax-lot accounting across every wallet you own or follow.",
      "CSV export compatible with Koinly and CoinTracker.",
    ],
  },
  {
    date: "Mar 24, 2026",
    version: "1.4.0",
    tag: "feature",
    title: "Trading Wallet Groups",
    bullets: [
      "Trade from 1, 5, or 50 wallets in a single click — split by % or fixed size.",
      "Per-group hotkeys, slippage profiles, and stealth ordering across RPC routes.",
    ],
  },
  {
    date: "Mar 12, 2026",
    version: "1.3.1",
    tag: "improvement",
    title: "Mobile PWA",
    bullets: [
      "Full feed, alerts, and one-tap buys on iOS and Android via PWA. No app store wait.",
      "Biometric sign-in; sessions remain local.",
    ],
  },
  {
    date: "Feb 28, 2026",
    version: "1.3.0",
    tag: "feature",
    title: "Universal Labels v2",
    bullets: [
      "Labels overlay X, Solscan, BaseScan, BscScan, Etherscan, GMGN, Photon, Axiom, DexScreener.",
      "Group labels, share read-only sets, import from CSV or a friend's group link.",
    ],
  },
];

export type LabelEntry = {
  address: string;
  label: string;
  group: string;
  chain: Chain;
  notes?: string;
};

export const LABELS: LabelEntry[] = [
  { address: "Hx9k...4mTp", label: "Orbital main", group: "Smart Money", chain: "SOL", notes: "Fastest filler on memes" },
  { address: "Bk1q...9aZx", label: "Cobie", group: "KOLs", chain: "ETH" },
  { address: "Fp3w...rT8s", label: "GAKE sniper #1", group: "Snipers", chain: "SOL" },
  { address: "Az8k...vQ2m", label: "Waddles", group: "Smart Money", chain: "BASE" },
  { address: "Cn9j...kP1d", label: "Mert", group: "KOLs", chain: "SOL" },
  { address: "Dy7m...rZ4q", label: "Ansem cold", group: "KOLs", chain: "ETH", notes: "Long-term" },
  { address: "Eh4r...mN5p", label: "Hsaka perps", group: "Perps", chain: "BSC" },
  { address: "Gx2c...bV8w", label: "Inverse signal", group: "Contrarian", chain: "ETH", notes: "Trade opposite" },
  { address: "Jp8l...wE3a", label: "FrankDeGods", group: "KOLs", chain: "SOL" },
  { address: "Km9d...tY6f", label: "cl alpha", group: "Smart Money", chain: "SOL" },
];

export type PolymarketWallet = {
  address: string;
  handle?: string;
  pnl: number;
  winRate: number;
  markets: number;
  topMarket: string;
};

export const POLY: PolymarketWallet[] = [
  { address: "0x1f..a9", handle: "@whalebets", pnl: 482000, winRate: 68, markets: 142, topMarket: "2028 election" },
  { address: "0x2c..d4", handle: "@predictor", pnl: 318000, winRate: 71, markets: 88, topMarket: "Fed cut June" },
  { address: "0x3a..91", pnl: 212000, winRate: 64, markets: 56, topMarket: "BTC > $200k EOY" },
  { address: "0x4b..ee", handle: "@oddsmith", pnl: 192000, winRate: 59, markets: 210, topMarket: "Super Bowl" },
  { address: "0x5d..2f", pnl: -42000, winRate: 41, markets: 320, topMarket: "Random sports" },
  { address: "0x6e..7a", handle: "@macrooo", pnl: 96000, winRate: 62, markets: 28, topMarket: "Recession 2026" },
];
