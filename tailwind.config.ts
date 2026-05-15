import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07090d",
        panel: "#0d1117",
        panel2: "#11171f",
        line: "#1c2330",
        muted: "#7a869a",
        text: "#e6edf3",
        accent: "#5eead4",
        accent2: "#22d3ee",
        good: "#34d399",
        bad: "#f87171",
        warn: "#fbbf24",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94,234,212,0.25), 0 8px 30px rgba(34,211,238,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
