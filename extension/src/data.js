/* Slipstream — bundled wallet intelligence (demo dataset).
 * In production this is replaced by a live indexer API; the overlay logic
 * is identical. Each wallet is keyed by its full on-chain address.
 * EVM addresses are matched case-insensitively. */
(function () {
  function spark(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    const r = () => {
      h += 0x6d2b79f5; let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const out = []; let v = 50;
    for (let i = 0; i < 28; i++) { v += (r() - 0.42) * 16; v = Math.max(6, Math.min(96, v)); out.push(Math.round(v)); }
    return out;
  }

  const WALLETS = [
    {
      address: "5Qz8Gv9rT2sWxYbN4kHp7mTcZ3dEfGhJ6uVwXy1Az8B",
      chain: "SOL", display: "Orbital", handle: "@orbital", type: "smart-money",
      pnl30d: 482300, pnlAll: 3120000, winRate: 71, trades30d: 142,
      holdMins: 340, riskScore: 22, firstSeen: "8 mo ago",
      tags: ["smart-money", "early-buyer", "memes"],
      recent: ["BUY $PUMPED  +2m", "SELL $WIFE  +38.4k", "BUY $WEN  +12m"],
    },
    {
      address: "7Kp3wRt8sFv2NbXyZ4kHm9Tcd5EfGhJ6uVwAz1Q2sWx",
      chain: "SOL", display: "GAKE", handle: "@gake", type: "sniper",
      pnl30d: 1240000, pnlAll: 6780000, winRate: 68, trades30d: 412,
      holdMins: 26, riskScore: 58, firstSeen: "1 yr ago",
      tags: ["sniper", "high-velocity", "memes"],
      recent: ["BUY $POPCAT  +14m", "BUY $PUMPED  +1m", "SELL $MAXI  +9.1k"],
    },
    {
      address: "3Km9dTy6fHp2wRtZ8sFv4NbXyA5EfGhJ6uVwQ1az8Bn",
      chain: "SOL", display: "cl", handle: "@cl207", type: "smart-money",
      pnl30d: 412000, pnlAll: 1820000, winRate: 73, trades30d: 64,
      holdMins: 920, riskScore: 19, firstSeen: "2 yr ago",
      tags: ["smart-money", "early-buyer", "alpha"],
      recent: ["BUY $MAXI  +1m", "SELL $JTO  +22.0k", "BUY $DBR  +3h"],
    },
    {
      address: "2Cn9jKp1dHx4wRtZ7sFv5NbXyA8EfGhJ6uVwQ3az9Bm",
      chain: "SOL", display: "Mert", handle: "@mert", type: "kol",
      pnl30d: 86200, pnlAll: 412000, winRate: 59, trades30d: 24,
      holdMins: 4100, riskScore: 18, firstSeen: "3 yr ago",
      tags: ["kol", "infra", "long-hold"],
      recent: ["BUY $JTO  +6m", "BUY $SOL  +2d", "SELL $DBR  -1.2k"],
    },
    {
      address: "9Dy7mRz4qHp2wKtZ8sFv5NbXyA6EfGhJ3uVwQ1az8Bk",
      chain: "SOL", display: "Ansem", handle: "@ansem", type: "kol",
      pnl30d: 654000, pnlAll: 9120000, winRate: 66, trades30d: 192,
      holdMins: 210, riskScore: 36, firstSeen: "3 yr ago",
      tags: ["kol", "memes", "influencer"],
      recent: ["BUY $BRETT  +2m", "SELL $WIF  +91.0k", "BUY $POPCAT  +5h"],
    },
    {
      address: "0x8a9f3c2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      chain: "BASE", display: "Waddles", handle: "@waddles", type: "smart-money",
      pnl30d: 218400, pnlAll: 982000, winRate: 63, trades30d: 88,
      holdMins: 480, riskScore: 31, firstSeen: "1 yr ago",
      tags: ["smart-money", "base", "alpha"],
      recent: ["BUY $BRETT  +4m", "BUY $AERO  +1h", "SELL $DEGEN  +18.4k"],
    },
    {
      address: "0x3f7a2c9b8d1e4f5a6b7c8d9e0f1a2b3c4d5e6f70",
      chain: "ETH", display: "Hsaka", handle: "@hsaka", type: "kol",
      pnl30d: 142000, pnlAll: 2240000, winRate: 61, trades30d: 52,
      holdMins: 2600, riskScore: 27, firstSeen: "4 yr ago",
      tags: ["kol", "perps", "macro"],
      recent: ["SELL $PEPE  +64.2k", "BUY $ETH  +1d", "BUY $WLD  +3h"],
    },
    {
      address: "0x6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f50",
      chain: "ETH", display: "Inverse signal", handle: "@inversebrah", type: "contrarian",
      pnl30d: -42000, pnlAll: 88000, winRate: 38, trades30d: 410,
      holdMins: 14, riskScore: 72, firstSeen: "2 yr ago",
      tags: ["contrarian", "noise", "fade-me"],
      recent: ["BUY $DOGE  +18m", "BUY $PEPE  -4.0k", "SELL $SHIB  -1.1k"],
    },
    {
      address: "8Fp4wRt2sKv9NbXyZ3kHm7Tcd1EfGhJ5uVwAz6Q4sWp",
      chain: "SOL", display: "Fresh wallet", handle: null, type: "fresh",
      pnl30d: 0, pnlAll: 0, winRate: 0, trades30d: 3,
      holdMins: 8, riskScore: 64, firstSeen: "2 days ago",
      tags: ["fresh", "funded-from-cex", "unproven"],
      recent: ["BUY $PUMPED  +1m", "BUY $MAXI  +40m"],
    },
    {
      address: "0xdead1c4f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
      chain: "ETH", display: "Known rug deployer", handle: null, type: "danger",
      pnl30d: 312000, pnlAll: 1900000, winRate: 91, trades30d: 38,
      holdMins: 6, riskScore: 96, firstSeen: "5 mo ago",
      tags: ["deployer", "rug-history", "avoid"],
      recent: ["SELL $SAFEMOON2  +120k", "DEPLOY $MOON  +2d"],
    },
  ];

  WALLETS.forEach((w) => { w.sparkline = spark(w.address); });

  // index: lowercase key -> wallet  (EVM is case-insensitive, base58 is not but
  // lowercasing a base58 string still yields a unique-enough key for lookup here
  // because we always look up using the same transform)
  const INDEX = {};
  WALLETS.forEach((w) => {
    INDEX[w.address.toLowerCase()] = w;
  });

  window.SLIP_DATA = { wallets: WALLETS, index: INDEX };
})();
