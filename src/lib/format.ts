export const fmtUSD = (n: number, opts: { compact?: boolean; sign?: boolean } = {}) => {
  const sign = opts.sign && n > 0 ? "+" : "";
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(n / 1_000).toFixed(1)}k`;
    return `${sign}$${n.toFixed(0)}`;
  }
  return `${sign}$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const fmtPct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
export const fmtNum = (n: number) => n.toLocaleString("en-US");

export const pnlColor = (n: number) => (n >= 0 ? "text-good" : "text-bad");
export const chainColor = (c: string) => {
  switch (c) {
    case "SOL": return "#9945ff";
    case "BASE": return "#2151f5";
    case "BSC": return "#f3ba2f";
    case "ETH": return "#627eea";
    case "ARB": return "#28a0f0";
    default: return "#7a869a";
  }
};
