import ChainBadge from "@/components/ChainBadge";
import { LABELS } from "@/lib/data";

export const metadata = { title: "Labels — Slipstream" };

const PLATFORMS = ["X (Twitter)", "Solscan", "BaseScan", "BscScan", "Etherscan", "Arbiscan", "GMGN", "Photon", "Axiom", "DexScreener"];

export default function LabelsPage() {
  const groups = Array.from(new Set(LABELS.map((l) => l.group)));
  return (
    <div className="py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Universal labels</h1>
          <p className="text-muted text-sm">One label set, every explorer and timeline. Sync, share, or import a friend&apos;s group link.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost">Import CSV</button>
          <button className="btn-primary">+ New label</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 mt-6">
        <aside className="lg:col-span-3 card p-4">
          <div className="font-medium mb-2">Groups</div>
          <ul className="space-y-1 text-sm">
            <li className="px-2 py-1.5 rounded-md bg-panel2 border border-accent/30 flex justify-between"><span>All labels</span><span className="text-muted">{LABELS.length}</span></li>
            {groups.map((g) => {
              const n = LABELS.filter((l) => l.group === g).length;
              return (
                <li key={g} className="px-2 py-1.5 rounded-md hover:bg-panel2 flex justify-between cursor-pointer">
                  <span>{g}</span>
                  <span className="text-muted">{n}</span>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line mt-4 pt-4">
            <div className="font-medium mb-2 text-sm">Overlays on</div>
            <div className="flex flex-wrap gap-1">
              {PLATFORMS.map((p) => <span key={p} className="chip">{p}</span>)}
            </div>
          </div>

          <div className="border-t border-line mt-4 pt-4">
            <div className="font-medium mb-2 text-sm">Share group</div>
            <div className="flex items-center gap-2">
              <input readOnly value="https://slip.st/g/smart-money" className="flex-1 bg-panel2 border border-line rounded-lg px-2 py-1.5 text-xs" />
              <button className="btn-ghost text-xs px-2 py-1.5">Copy</button>
            </div>
            <p className="text-xs text-muted mt-2">Read-only — recipients can&apos;t edit your master set.</p>
          </div>
        </aside>

        <section className="lg:col-span-9 card overflow-hidden">
          <div className="p-3 border-b border-line flex items-center gap-2">
            <input placeholder="Search address, handle, or note…" className="flex-1 bg-panel2 border border-line rounded-lg px-3 py-2 text-sm" />
            <select className="bg-panel2 border border-line rounded-lg px-2 py-2 text-sm">
              <option>All chains</option>
              <option>SOL</option><option>BASE</option><option>BSC</option><option>ETH</option><option>ARB</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-panel2 text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Label</th>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Group</th>
                <th className="text-left p-3">Chain</th>
                <th className="text-left p-3">Notes</th>
                <th className="text-right p-3 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {LABELS.map((l) => (
                <tr key={l.address} className="hover:bg-panel2/60">
                  <td className="p-3 font-medium">{l.label}</td>
                  <td className="p-3 font-mono text-muted">{l.address}</td>
                  <td className="p-3"><span className="chip">{l.group}</span></td>
                  <td className="p-3"><ChainBadge chain={l.chain} /></td>
                  <td className="p-3 text-muted text-xs max-w-[280px] truncate">{l.notes ?? "—"}</td>
                  <td className="p-3 pr-4 text-right">
                    <button className="text-muted hover:text-accent text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
