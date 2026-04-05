import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver, formatPercent } from '../../utils/formatters';

// Farming crops by tier
const CROPS = [
  { tier: 2, seedId: 'T2_FARM_CARROT_SEED',  cropId: 'T2_CARROT',  name: 'Carrot' },
  { tier: 3, seedId: 'T3_FARM_BEAN_SEED',    cropId: 'T3_BEAN',    name: 'Bean' },
  { tier: 4, seedId: 'T4_FARM_WHEAT_SEED',   cropId: 'T4_WHEAT',   name: 'Wheat' },
  { tier: 5, seedId: 'T5_FARM_TURNIP_SEED',  cropId: 'T5_TURNIP',  name: 'Turnip' },
  { tier: 6, seedId: 'T6_FARM_CABBAGE_SEED', cropId: 'T6_CABBAGE', name: 'Cabbage' },
  { tier: 7, seedId: 'T7_FARM_POTATO_SEED',  cropId: 'T7_POTATO',  name: 'Potato' },
  { tier: 8, seedId: 'T8_FARM_CORN_SEED',    cropId: 'T8_CORN',    name: 'Corn' },
];

// Yield per plot: unwatered returns ~80% seed, watered returns 100% + some bonus
// Crops produced per seed (approximate in-game values)
const YIELD_WATERED = 2.4;
const YIELD_UNWATERED = 1.6;
const SEED_RETURN_WATERED = 1.0;   // get 100% seeds back if fully watered
const SEED_RETURN_UNWATERED = 0.8; // ~80% seeds back if unwatered

interface Row {
  name: string;
  tier: number;
  seedPrice: number;
  cropPrice: number;
  yieldPerSeed: number;
  seedReturn: number;
  netSeedCost: number;
  revenue: number;
  profit: number;
  roi: number;
}

export default function Farming() {
  const [watered, setWatered] = useState(true);
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const c of CROPS) { ids.push(c.seedId, c.cropId); }
    const prices = await fetchPrices(ids);

    const cheapest = new Map<string, number>();
    const bestSell = new Map<string, number>();
    const byCity = new Map<string, Array<{ city: string; price: number }>>();
    for (const p of prices) {
      if (p.sell_price_min <= 0) continue;
      if (p.city === 'Black Market') continue;
      const c = cheapest.get(p.item_id) || Infinity;
      if (p.sell_price_min < c) cheapest.set(p.item_id, p.sell_price_min);
      if (!byCity.has(p.item_id)) byCity.set(p.item_id, []);
      byCity.get(p.item_id)!.push({ city: p.city, price: p.sell_price_min });
    }
    // Outlier-filtered max
    for (const [itemId, list] of byCity.entries()) {
      const sorted = [...list].sort((a, b) => a.price - b.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      const filtered = list.filter(e => e.price <= median * 2);
      if (filtered.length === 0) continue;
      filtered.sort((a, b) => b.price - a.price);
      bestSell.set(itemId, filtered[0].price);
    }

    const yieldPer = watered ? YIELD_WATERED : YIELD_UNWATERED;
    const seedRet = watered ? SEED_RETURN_WATERED : SEED_RETURN_UNWATERED;

    const out: Row[] = [];
    for (const c of CROPS) {
      const seedPrice = cheapest.get(c.seedId) || 0;
      const cropPrice = bestSell.get(c.cropId) || 0;
      if (seedPrice === 0 || cropPrice === 0) continue;

      // Per seed planted: get yieldPer crops + seedRet seeds back
      const netSeedCost = seedPrice * (1 - seedRet); // effective cost after seed return
      const revenue = yieldPer * cropPrice;
      const profit = revenue - netSeedCost;
      const roi = netSeedCost > 0 ? (profit / netSeedCost) * 100 : 0;

      out.push({
        name: c.name,
        tier: c.tier,
        seedPrice,
        cropPrice,
        yieldPerSeed: yieldPer,
        seedReturn: seedRet,
        netSeedCost,
        revenue,
        profit,
        roi,
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setResults(out);
    setLoading(false);
  }, [watered]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-lime-500/10 via-green-500/5 to-transparent rounded-xl border border-lime-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-0.5">Farming Calculator</div>
        <div className="text-xs text-zinc-400">Compares seed purchase cost vs crop sell price per plot. Watered plots yield more crops and return 100% of seeds; unwatered plots lose 20% of seeds.</div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
          <input type="checkbox" checked={watered} onChange={(e) => setWatered(e.target.checked)} className="accent-lime-500" />
          <span className="text-sm text-zinc-200">Watered <span className="text-[10px] text-zinc-500">(100% seed return)</span></span>
        </label>
        <div className="text-xs text-zinc-500">Yield per seed: <strong className="text-lime-400">{watered ? YIELD_WATERED : YIELD_UNWATERED}</strong></div>
        <button onClick={scan} disabled={loading} className="ml-auto px-6 py-2 rounded-lg text-sm font-semibold bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/30 disabled:opacity-50">
          {loading ? 'Scanning...' : 'Scan Crops'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Crop</th>
                <th className="text-center px-3 py-2.5">Tier</th>
                <th className="text-right px-3 py-2.5">Seed Price</th>
                <th className="text-right px-3 py-2.5">Crop Price</th>
                <th className="text-right px-3 py-2.5">Yield</th>
                <th className="text-right px-3 py-2.5">Net Seed Cost</th>
                <th className="text-right px-3 py-2.5">Revenue</th>
                <th className="text-right px-3 py-2.5">Profit / Plot</th>
                <th className="text-right px-3 py-2.5">ROI</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2 text-zinc-200">{r.name}</td>
                  <td className="px-3 py-2 text-center text-gold font-bold">T{r.tier}</td>
                  <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{formatSilver(r.seedPrice)}</td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{formatSilver(r.cropPrice)}</td>
                  <td className="px-3 py-2 text-right text-lime-400 tabular-nums">{r.yieldPerSeed}</td>
                  <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{formatSilver(r.netSeedCost)}</td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{formatSilver(r.revenue)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(r.roi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#127806;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Farming Calculator</h2>
          <p className="text-sm text-zinc-500">Click scan to see which crop gives the best profit per plot.</p>
        </div>
      )}
    </div>
  );
}
