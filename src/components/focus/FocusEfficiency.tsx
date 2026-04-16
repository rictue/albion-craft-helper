import { lpbToReturnRate } from '../../utils/returnRate';

interface Row {
  lpb: number;
  label: string;
  note: string;
}

// LPB reference table. Spec does NOT add LPB — it only reduces focus
// cost, so the previously-listed "Crafter spec (+15)" rows were wrong.
// The only LPB sources are: base station (18), refining city bonus
// (+40, resource-specific), and focus (+59). Royal-city weapon/armor
// specialization is a flat +9.6% RR applied after LPB, not an LPB add.
const ROWS: Row[] = [
  { lpb: 18,  label: '18 LPB',  note: 'Base royal city station, no focus' },
  { lpb: 58,  label: '58 LPB',  note: 'Matching refining city (+40)' },
  { lpb: 77,  label: '77 LPB',  note: 'Base + focus (+59)' },
  { lpb: 117, label: '117 LPB', note: 'Matching refining city + focus (refining max)' },
];

export default function FocusEfficiency() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent rounded-xl border border-blue-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-1">Return Rate Reference</div>
        <div className="text-xs text-zinc-400">
          Return rate (RR) = LPB / (100 + LPB). Each LPB point gives diminishing returns. Use this to see how much extra return you get from stacking bonuses.
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
              <th className="text-left px-4 py-3">Setup</th>
              <th className="text-center px-4 py-3">LPB</th>
              <th className="text-center px-4 py-3">Return Rate</th>
              <th className="text-center px-4 py-3">Cost Multiplier</th>
              <th className="text-left px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(r => {
              const rr = lpbToReturnRate(r.lpb);
              const pct = (rr * 100).toFixed(2);
              const mult = (1 - rr).toFixed(3);
              const barWidth = `${Math.min(100, rr * 200)}%`;
              return (
                <tr key={r.lpb} className="border-b border-zinc-800/50">
                  <td className="px-4 py-3 text-zinc-200 font-semibold">{r.label}</td>
                  <td className="px-4 py-3 text-center text-zinc-400 tabular-nums">{r.lpb}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: barWidth }} />
                      </div>
                      <span className="text-cyan-400 font-bold tabular-nums w-14 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-300 tabular-nums">×{mult}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{r.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Refining max</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">{(lpbToReturnRate(117) * 100).toFixed(1)}% return</div>
          <div className="text-[10px] text-zinc-600 mt-1">Matching city + focus</div>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Focus adds</div>
          <div className="text-sm font-bold text-green-400 mt-0.5">+{((lpbToReturnRate(77) - lpbToReturnRate(18)) * 100).toFixed(1)}% RR</div>
          <div className="text-[10px] text-zinc-600 mt-1">Over base (no city)</div>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">City bonus adds</div>
          <div className="text-sm font-bold text-green-400 mt-0.5">+{((lpbToReturnRate(117) - lpbToReturnRate(77)) * 100).toFixed(1)}% RR</div>
          <div className="text-[10px] text-zinc-600 mt-1">On top of focus</div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-300">Note:</strong> Refining <strong>specialization</strong> (e.g. Wood Plank 100) does <em>not</em> add LPB. It only reduces focus cost. The only LPB sources are base station (18), matching refining city (+40), and focus (+59). Royal-city <strong>weapon/armor</strong> specialization is different — it applies a flat +9.6% RR on top of the LPB-derived rate when crafting items in that city.
      </div>
    </div>
  );
}
