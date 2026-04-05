import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';

// Empty journal item IDs (buy) + full journal item IDs (sell)
// Format: T{tier}_JOURNAL_{PROFESSION}_EMPTY | _FULL
const PROFESSIONS = [
  { id: 'WARRIOR', name: 'Warrior' },
  { id: 'MAGE',    name: 'Mage' },
  { id: 'HUNTER',  name: 'Hunter' },
  { id: 'TOOLMAKER', name: 'Toolmaker' },
];

// Fame capacity per journal tier (from wiki)
const JOURNAL_CAPACITY: Record<number, number> = {
  2: 1800, 3: 9000, 4: 45000, 5: 135000, 6: 405000, 7: 1215000, 8: 3645000,
};

interface Row {
  profession: string;
  tier: number;
  emptyPrice: number;
  fullPrice: number;
  fameCapacity: number;
  profit: number;
  silverPerFame: number;
}

export default function JournalFiller() {
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const p of PROFESSIONS) {
      for (let t = 3; t <= 8; t++) {
        ids.push(`T${t}_JOURNAL_${p.id}_EMPTY`);
        ids.push(`T${t}_JOURNAL_${p.id}_FULL`);
      }
    }

    const prices = await fetchPrices(ids);

    const cheapest = new Map<string, number>();
    const bestSell = new Map<string, number>();
    for (const pr of prices) {
      if (pr.sell_price_min <= 0) continue;
      if (pr.city === 'Black Market') continue;
      const c = cheapest.get(pr.item_id) || Infinity;
      if (pr.sell_price_min < c) cheapest.set(pr.item_id, pr.sell_price_min);
      const b = bestSell.get(pr.item_id) || 0;
      if (pr.sell_price_min > b) bestSell.set(pr.item_id, pr.sell_price_min);
    }

    const out: Row[] = [];
    for (const p of PROFESSIONS) {
      for (let t = 3; t <= 8; t++) {
        const empty = cheapest.get(`T${t}_JOURNAL_${p.id}_EMPTY`) || 0;
        const full = bestSell.get(`T${t}_JOURNAL_${p.id}_FULL`) || 0;
        if (empty === 0 || full === 0) continue;
        const cap = JOURNAL_CAPACITY[t];
        const profit = full - empty;
        out.push({
          profession: p.name,
          tier: t,
          emptyPrice: empty,
          fullPrice: full,
          fameCapacity: cap,
          profit,
          silverPerFame: profit / cap,
        });
      }
    }

    out.sort((a, b) => b.silverPerFame - a.silverPerFame);
    setResults(out);
    setLoading(false);
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-xl border border-emerald-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-0.5">Journal Filler Calculator</div>
        <div className="text-xs text-zinc-400">Buy empty journals, fill them with crafting fame, sell them full. Shows silver earned per fame point — your fame is worth this much extra if you fill journals.</div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">4 professions × 6 tiers = 24 journal types</div>
        <button
          onClick={scan}
          disabled={loading}
          className="px-6 py-2 rounded-lg text-sm font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan Journals'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Profession</th>
                <th className="text-center px-3 py-2.5">Tier</th>
                <th className="text-right px-3 py-2.5">Empty Buy</th>
                <th className="text-right px-3 py-2.5">Full Sell</th>
                <th className="text-right px-3 py-2.5">Fame Capacity</th>
                <th className="text-right px-3 py-2.5">Profit</th>
                <th className="text-right px-3 py-2.5">Silver / Fame</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2 text-zinc-200">{r.profession}</td>
                  <td className="px-3 py-2 text-center text-gold font-bold">T{r.tier}</td>
                  <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{formatSilver(r.emptyPrice)}</td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{formatSilver(r.fullPrice)}</td>
                  <td className="px-3 py-2 text-right text-cyan-400 tabular-nums">{r.fameCapacity.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.silverPerFame > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.silverPerFame.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#128211;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Journal Filler</h2>
          <p className="text-sm text-zinc-500">Click scan to compare empty vs full journal prices and find the best fame-to-silver conversion.</p>
        </div>
      )}
    </div>
  );
}
