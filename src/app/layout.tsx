import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Slipstream — Ride the slipstream of smart money",
  description:
    "On-chain intelligence and a multi-wallet trading desk for Solana, Base, BSC, Ethereum, and Arbitrum. Smart-money tracking, universal labels, AI alpha alerts, auto-snipe rules, and backtests.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="max-w-7xl mx-auto px-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
