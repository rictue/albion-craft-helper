import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';

// Transmutation silver + focus costs per step (from Mystic Crafter wiki)
// Values are per 1 refined resource upgraded by 1 tier
const TRANSMUTE_COST: Record<number, { silver: number; focus: number }> = {
  // cost to go from Tx → T(x+1) refined
  3: { silver: 30,    focus: 15 },
  4: { silver: 120,   focus: 45 },
  5: { silver: 480,   focus: 135 },
  6: { silver: 1920,  focus: 405 },
  7: { silver: 7680,  focus: 1215 },
};

// Same values apply roughly to enchantment upgrades too
const RESOURCE_TYPES = [
  { id: 'PLANKS',     name: 'Planks',    prefix: 'PLANKS' },
  { id: 'METALBAR',   name: 'Metal Bar', prefix: 'METALBAR' },
  { id: 'LEATHER',    name: 'Leather',   prefix: 'LEATHER' },
  { id: 'CLOTH',      name: 'Cloth',     prefix: 'CLOTH' },
  { id: 'STONEBLOCK', name: 'Stone',     prefix: 'STONEBLOCK' },
];

interface Result {
  resource: string;
  fromTier: number;
  toTier: number;
  fromPrice: number;
  toPrice: number;
  silverCost: number;
  focusCost: number;
  profit: number;
  profitPerFocus: number;
}

export default function Transmutation() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const rt of RESOURCE_TYPES) {
      for (let t = 3; t <= 8; t++) ids.push(`T${t}_${rt.prefix}`);
    }

    const prices = await fetchPrices(ids);
    const cheapest = new Map<string, number>();
    for (const p of prices) {
      if (p.sell_price_min > 0 && p.city !== 'Black Market') {
        const current = cheapest.get(p.item_id) || Infinity;
        if (p.sell_price_min < current) cheapest.set(p.item_id, p.sell_price_min);
      }
    }

    const out: Result[] = [];
    for (const rt of RESOURCE_TYPES) {
      for (let t = 3; t <= 7; t++) {
        const fromPrice = cheapest.get(`T${t}_${rt.prefix}`) || 0;
        const toPrice = cheapest.get(`T${t + 1}_${rt.prefix}`) || 0;
        if (fromPrice === 0 || toPrice === 0) continue;
        const cost = TRANSMUTE_COST[t];
        if (!cost) continue;
        const totalCost = fromPrice + cost.silver;
        const profit = toPrice - totalCost;
        out.push({
          resource: rt.name,
          fromTier: t,
          toTier: t + 1,
          fromPrice,
          toPrice,
          silverCost: cost.silver,
          focusCost: cost.focus,
          profit,
          profitPerFocus: cost.focus > 0 ? profit / cost.focus : 0,
        });
      }
    }

    out.sort((a, b) => b.profitPerFocus - a.profitPerFocus);
    setResults(out);
    setLoading(false);
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent rounded-xl border border-violet-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-0.5">Transmutation Calculator</div>
        <div className="text-xs text-zinc-400">Scans all refined resources and calculates the profit of transmuting (upgrading) them one tier up via the Mystic Crafter. Sorted by profit per focus point.</div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">Scans all 5 resources × 5 tier jumps (T3→T8)</div>
        <button
          onClick={scan}
          disabled={loading}
          className="px-6 py-2 rounded-lg text-sm font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan Transmutations'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5">Resource</th>
                  <th className="text-center px-3 py-2.5">Upgrade</th>
                  <th className="text-right px-3 py-2.5">Buy (from)</th>
                  <th className="text-right px-3 py-2.5">Silver Cost</th>
                  <th className="text-right px-3 py-2.5">Focus</th>
                  <th className="text-right px-3 py-2.5">Sell (to)</th>
                  <th className="text-right px-3 py-2.5">Profit</th>
                  <th className="text-right px-3 py-2.5">Silver/Focus</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2 text-zinc-200">{r.resource}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-gold font-bold">T{r.fromTier}</span>
                      <span className="text-zinc-600 mx-1">→</span>
                      <span className="text-gold font-bold">T{r.toTier}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{formatSilver(r.fromPrice)}</td>
                    <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{formatSilver(r.silverCost)}</td>
                    <td className="px-3 py-2 text-right text-cyan-400 tabular-nums">{r.focusCost}</td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{formatSilver(r.toPrice)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profitPerFocus > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.profitPerFocus > 0 ? '+' : ''}{formatSilver(r.profitPerFocus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#10024;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Transmutation Calculator</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">Click scan to see which resource tier upgrades give the best return per focus point spent.</p>
        </div>
      )}
    </div>
  );
}
