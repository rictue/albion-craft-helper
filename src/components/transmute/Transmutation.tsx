import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

// Transmutation silver + focus costs per step (from Mystic Crafter wiki)
const TRANSMUTE_COST: Record<number, { silver: number; focus: number }> = {
  3: { silver: 30,    focus: 15 },
  4: { silver: 120,   focus: 45 },
  5: { silver: 480,   focus: 135 },
  6: { silver: 1920,  focus: 405 },
  7: { silver: 7680,  focus: 1215 },
};

const RESOURCE_TYPES = [
  { id: 'PLANKS',     name: 'Planks',    color: 'text-amber-400',  bgColor: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'METALBAR',   name: 'Metal Bar', color: 'text-zinc-300',   bgColor: 'bg-zinc-500/10 border-zinc-500/20' },
  { id: 'LEATHER',    name: 'Leather',   color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  { id: 'CLOTH',      name: 'Cloth',     color: 'text-blue-400',   bgColor: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'STONEBLOCK', name: 'Stone',     color: 'text-stone-400',  bgColor: 'bg-stone-500/10 border-stone-500/20' },
];

interface Result {
  resource: typeof RESOURCE_TYPES[number];
  fromTier: number;
  toTier: number;
  fromId: string;
  toId: string;
  fromPrice: number;
  toPrice: number;
  silverCost: number;
  focusCost: number;
  totalCost: number;
  profit: number;
  profitPerFocus: number;
  roi: number;
}

export default function Transmutation() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [hideNegative, setHideNegative] = useState(true);
  const [sortBy, setSortBy] = useState<'profitPerFocus' | 'profit' | 'roi'>('profitPerFocus');

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const rt of RESOURCE_TYPES) {
      for (let t = 3; t <= 8; t++) ids.push(`T${t}_${rt.id}`);
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
        const fromId = `T${t}_${rt.id}`;
        const toId = `T${t + 1}_${rt.id}`;
        const fromPrice = cheapest.get(fromId) || 0;
        const toPrice = cheapest.get(toId) || 0;
        if (fromPrice === 0 || toPrice === 0) continue;
        const cost = TRANSMUTE_COST[t];
        if (!cost) continue;
        const totalCost = fromPrice + cost.silver;
        const profit = toPrice - totalCost;
        const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        out.push({
          resource: rt,
          fromTier: t,
          toTier: t + 1,
          fromId, toId,
          fromPrice,
          toPrice,
          silverCost: cost.silver,
          focusCost: cost.focus,
          totalCost,
          profit,
          profitPerFocus: cost.focus > 0 ? profit / cost.focus : 0,
          roi,
        });
      }
    }

    out.sort((a, b) => b.profitPerFocus - a.profitPerFocus);
    setResults(out);
    setLoading(false);
  }, []);

  const displayed = results
    .filter(r => !hideNegative || r.profit > 0)
    .sort((a, b) => {
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'roi') return b.roi - a.roi;
      return b.profitPerFocus - a.profitPerFocus;
    });

  const profitCount = results.filter(r => r.profit > 0).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent rounded-xl border border-violet-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-1">Transmutation Calculator</div>
        <div className="text-xs text-zinc-400 space-y-0.5">
          <div>Buy a <strong className="text-violet-300">lower-tier refined resource</strong>, pay silver + focus at the <strong className="text-violet-300">Mystic Crafter</strong> station, get the <strong className="text-violet-300">next tier up</strong>.</div>
          <div>Example: Buy T5 Leather (1,342) + pay 480 silver + 135 focus → get T6 Leather (5,493) = <strong className="text-green-400">+3,671 profit</strong></div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500">5 resources × 5 tiers (T3→T8)</div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={hideNegative} onChange={e => setHideNegative(e.target.checked)} className="accent-violet-500" />
            <span className="text-xs text-zinc-300">Hide unprofitable</span>
          </label>
        </div>
        <button
          onClick={scan}
          disabled={loading}
          className="px-6 py-2 rounded-lg text-sm font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan Transmutations'}
        </button>
      </div>

      {/* Sort + stats */}
      {results.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-zinc-500 font-semibold">Sort:</span>
            {(['profitPerFocus', 'profit', 'roi'] as const).map(key => (
              <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1 rounded text-xs font-semibold ${sortBy === key ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                {key === 'profitPerFocus' ? 'Silver/Focus' : key === 'profit' ? 'Profit' : 'ROI %'}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-500">
            <span className="text-green-400 font-semibold">{profitCount}</span> profitable / {results.length} total
          </span>
        </div>
      )}

      {/* Results as cards */}
      {displayed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((r) => (
            <div
              key={`${r.resource.id}-${r.fromTier}`}
              className={`rounded-xl border overflow-hidden ${r.profit > 0 ? 'border-zinc-800 bg-zinc-900' : 'border-red-900/30 bg-red-950/10 opacity-60'}`}
            >
              {/* Card header */}
              <div className={`px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between ${r.resource.bgColor}`}>
                <div className="flex items-center gap-2">
                  <ItemIcon itemId={r.fromId} size={28} />
                  <span className={`text-sm font-bold ${r.resource.color}`}>{r.resource.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gold font-bold text-sm">T{r.fromTier}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-gold font-bold text-sm">T{r.toTier}</span>
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-2">
                {/* Flow: buy → pay → get */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Buy T{r.fromTier}</span>
                  <span className="text-red-400 tabular-nums">-{formatSilver(r.fromPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Transmute fee</span>
                  <span className="text-red-400 tabular-nums">-{formatSilver(r.silverCost)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Focus used</span>
                  <span className="text-cyan-400 tabular-nums">{r.focusCost}</span>
                </div>
                <div className="border-t border-zinc-800 my-1" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Sell T{r.toTier}</span>
                  <span className="text-green-400 tabular-nums">+{formatSilver(r.toPrice)}</span>
                </div>
              </div>

              {/* Card footer — profit */}
              <div className={`px-4 py-2.5 border-t ${r.profit > 0 ? 'border-green-900/30 bg-green-950/20' : 'border-red-900/30 bg-red-950/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-lg font-black tabular-nums ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </div>
                    <div className="text-[10px] text-zinc-500">ROI {r.roi.toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-black tabular-nums ${r.profitPerFocus > 0 ? 'text-violet-400' : 'text-zinc-600'}`}>
                      {r.profitPerFocus > 0 ? '+' : ''}{r.profitPerFocus.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-zinc-500">silver/focus</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">{'\u2728'}</div>
          <h2 className="text-lg text-zinc-300 mb-2">Transmutation Calculator</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">Click scan to see which resource tier upgrades give the best return per focus point spent.</p>
        </div>
      )}
    </div>
  );
}
