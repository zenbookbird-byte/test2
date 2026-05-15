import { chainColor } from "@/lib/format";

export default function ChainBadge({ chain }: { chain: string }) {
  return (
    <span
      className="chip"
      style={{ borderColor: `${chainColor(chain)}55`, color: chainColor(chain) }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: chainColor(chain) }}
      />
      {chain}
    </span>
  );
}
