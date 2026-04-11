import { useState, useCallback, useMemo } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

/**
 * Island Planner — realistic crop/herb/animal profit analysis
 *
 * Instead of "plant bean earn 3.5M", this now gives:
 *   - 1-day vs 7-day vs 30-day projected profit (with market saturation penalty)
 *   - Market depth warning (daily sell volume)
 *   - Plot allocation suggestion (diversify instead of one crop)
 *   - Net profit after seed return + tax
 *   - Clear ranking of top 3 recommendations
 */

// Crop data — seed NPC prices, yield per seed with premium watered/unwatered
const CROPS = [
  { tier: 2, name: 'Carrot', seedId: 'T2_FARM_CARROT_SEED', outputId: 'T2_CARROT', npcSeed: 48, yieldWatered: 4.5, yieldUnwatered: 2.7, cycleHours: 22 },
  { tier: 3, name: 'Bean', seedId: 'T3_FARM_BEAN_SEED', outputId: 'T3_BEAN', npcSeed: 120, yieldWatered: 5.1, yieldUnwatered: 3.1, cycleHours: 22 },
  { tier: 4, name: 'Wheat', seedId: 'T4_FARM_WHEAT_SEED', outputId: 'T4_WHEAT', npcSeed: 480, yieldWatered: 5.7, yieldUnwatered: 3.5, cycleHours: 22 },
  { tier: 5, name: 'Turnip', seedId: 'T5_FARM_TURNIP_SEED', outputId: 'T5_TURNIP', npcSeed: 1920, yieldWatered: 6.3, yieldUnwatered: 3.9, cycleHours: 22 },
  { tier: 6, name: 'Cabbage', seedId: 'T6_FARM_CABBAGE_SEED', outputId: 'T6_CABBAGE', npcSeed: 7680, yieldWatered: 6.9, yieldUnwatered: 4.3, cycleHours: 22 },
  { tier: 7, name: 'Potato', seedId: 'T7_FARM_POTATO_SEED', outputId: 'T7_POTATO', npcSeed: 30720, yieldWatered: 7.5, yieldUnwatered: 4.7, cycleHours: 22 },
  { tier: 8, name: 'Corn', seedId: 'T8_FARM_CORN_SEED', outputId: 'T8_CORN', npcSeed: 122880, yieldWatered: 8.1, yieldUnwatered: 5.1, cycleHours: 22 },
];

const SEEDS_PER_PLOT = 9;
const PREMIUM_TAX = 0.065;

interface Result {
  tier: number;
  name: string;
  seedId: string;
  outputId: string;
  seedPrice: number;
  seedSource: 'NPC' | 'Market';
  cropPrice: number;
  cropCity: string;
  totalYieldPerPlot: number;
  revenuePerPlot: number;
  costPerPlot: number;
  profitPerPlot: number;
  profitPerDay: number;
  profitPer1Day: number;  // 79 plots × 1 cycle
  profitPer7Days: number; // 79 plots × 7 cycles with market saturation
  profitPer30Days: number; // 79 plots × 30 cycles with heavy saturation
  marginPct: number;
  marketDepth: 'thin' | 'moderate' | 'healthy';
  dailySoldEstimate: number;
}

// Heuristic: each crop's daily absorb rate at Lymhurst/major market
// Based on typical Albion trade volumes. Over this, supply floods drop price
const CROP_DAILY_MARKET_CAPACITY: Record<number, number> = {
  2: 8000, 3: 6000, 4: 5000, 5: 4000, 6: 3000, 7: 2500, 8: 2000,
};

export default function IslandPlanner() {
  const [plots, setPlots] = useState(79);
  const [watered, setWatered] = useState(true);
  const [premium, setPremium] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const c of CROPS) {
      ids.push(c.seedId, c.outputId);
    }

    const data = await fetchPrices(ids);

    const cheapestBuy = new Map<string, { price: number; city: string }>();
    const byCityList = new Map<string, Array<{ city: string; price: number }>>();
    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const cur = cheapestBuy.get(p.item_id);
      if (!cur || p.sell_price_min < cur.price) cheapestBuy.set(p.item_id, { price: p.sell_price_min, city: p.city });
      if (!byCityList.has(p.item_id)) byCityList.set(p.item_id, []);
      byCityList.get(p.item_id)!.push({ city: p.city, price: p.sell_price_min });
    }

    const out: Result[] = [];
    for (const c of CROPS) {
      const npcSeed = c.npcSeed;
      const marketSeed = cheapestBuy.get(c.seedId);
      const effectiveSeedPrice = marketSeed && marketSeed.price < npcSeed ? marketSeed.price : npcSeed;
      const seedSource: 'NPC' | 'Market' = marketSeed && marketSeed.price < npcSeed ? 'Market' : 'NPC';

      // Outlier-filtered best sell
      const cropList = byCityList.get(c.outputId) || [];
      if (cropList.length === 0) continue;
      const sortedByPrice = [...cropList].sort((a, b) => a.price - b.price);
      const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].price;
      const filtered = cropList.filter(e => e.price <= median * 2);
      if (filtered.length === 0) continue;
      filtered.sort((a, b) => b.price - a.price);
      const bestSell = filtered[0];

      // Yield: base yield with premium multiplier (×2 planted) and watered/unwatered
      const baseYield = watered ? c.yieldWatered : c.yieldUnwatered;
      const yieldPerSeed = premium ? baseYield * 2 : baseYield;
      const totalYieldPerPlot = SEEDS_PER_PLOT * yieldPerSeed;

      // Seed return: watered 100%, unwatered ~80%
      const seedReturnRate = watered ? 1.0 : 0.8;
      // Net seed cost per plot = seeds × price × (1 - return rate)
      const netSeedCostPerPlot = SEEDS_PER_PLOT * effectiveSeedPrice * (1 - seedReturnRate);

      const revenuePerPlot = totalYieldPerPlot * bestSell.price * (1 - PREMIUM_TAX);
      const profitPerPlot = revenuePerPlot - netSeedCostPerPlot;
      const marginPct = netSeedCostPerPlot > 0 ? (profitPerPlot / netSeedCostPerPlot) * 100 : (profitPerPlot > 0 ? 9999 : 0);

      // Market depth analysis: at X plots, how much does user produce per day?
      const dailyProduction = totalYieldPerPlot * plots; // per 22h cycle ≈ per day
      const dailyCap = CROP_DAILY_MARKET_CAPACITY[c.tier];
      const saturationRatio = dailyProduction / dailyCap;
      let depth: 'thin' | 'moderate' | 'healthy' = 'healthy';
      if (saturationRatio > 1.5) depth = 'thin';
      else if (saturationRatio > 0.7) depth = 'moderate';

      // Projected profit with saturation penalty
      // Day 1: full profit (market absorbs first batch)
      // Day 2-7: moderate penalty (20-40%) if thin/moderate
      // Day 8-30: heavy penalty (50-70%) if thin/moderate
      const day1 = profitPerPlot * plots;
      let weekMult = 7;
      let monthMult = 30;
      if (depth === 'thin') { weekMult = 5.5; monthMult = 18; }
      else if (depth === 'moderate') { weekMult = 6.5; monthMult = 24; }

      out.push({
        tier: c.tier,
        name: c.name,
        seedId: c.seedId,
        outputId: c.outputId,
        seedPrice: effectiveSeedPrice,
        seedSource,
        cropPrice: bestSell.price,
        cropCity: bestSell.city,
        totalYieldPerPlot,
        revenuePerPlot,
        costPerPlot: netSeedCostPerPlot,
        profitPerPlot,
        profitPerDay: profitPerPlot * plots,
        profitPer1Day: day1,
        profitPer7Days: day1 * weekMult,
        profitPer30Days: day1 * monthMult,
        marginPct,
        marketDepth: depth,
        dailySoldEstimate: dailyCap,
      });
    }

    out.sort((a, b) => b.profitPer7Days - a.profitPer7Days);
    setResults(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [plots, watered, premium]);

  const topThree = useMemo(() => results.slice(0, 3), [results]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-lime-500/10 via-green-500/5 to-transparent rounded-xl border border-lime-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">🌾 Island Planner</div>
        <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
          <div>Calculates <strong className="text-lime-400">realistic</strong> crop profit — not just "best per plot" but what actually works over time.</div>
          <div>Factors in: <strong className="text-lime-400">market depth</strong> (can AH absorb your supply?), <strong className="text-lime-400">seed return rate</strong>, <strong className="text-lime-400">yield per plot</strong>, <strong className="text-lime-400">tax</strong>, <strong className="text-lime-400">1/7/30 day projections</strong>.</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Total Plots</label>
            <input type="number" min={1} value={plots} onChange={(e) => setPlots(parseInt(e.target.value) || 1)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-lime-500/40" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 w-full">
              <input type="checkbox" checked={watered} onChange={(e) => setWatered(e.target.checked)} className="accent-lime-500" />
              <span className="text-sm text-zinc-200">Watered</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 w-full">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-lime-500" />
              <span className="text-sm text-zinc-200">Premium</span>
            </label>
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={scan} disabled={loading} className="w-full px-6 py-2.5 rounded-lg text-sm font-bold bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/30 disabled:opacity-50 transition-colors">
              {loading ? 'Scanning...' : '🔍 Analyze Crops'}
            </button>
          </div>
        </div>

        {scannedAt && <div className="mt-3 text-[10px] text-zinc-600">Scanned at {scannedAt} · {results.length} crops</div>}
      </div>

      {/* Top 3 recommendations */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topThree.map((r, i) => {
            const medal = ['🥇', '🥈', '🥉'][i];
            const bgClass = i === 0 ? 'from-yellow-500/15 to-yellow-500/5 border-yellow-500/30'
              : i === 1 ? 'from-zinc-400/10 to-zinc-500/5 border-zinc-500/30'
              : 'from-amber-700/10 to-amber-800/5 border-amber-700/30';
            return (
              <div key={r.tier} className={`bg-gradient-to-br ${bgClass} rounded-xl border p-4`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{medal}</span>
                  <ItemIcon itemId={r.outputId} size={40} />
                  <div>
                    <div className="text-sm font-bold text-zinc-100">T{r.tier} {r.name}</div>
                    <div className="text-[10px] text-zinc-500">Rank #{i + 1}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">1 day:</span>
                    <span className="text-green-400 font-semibold tabular-nums">+{formatSilver(r.profitPer1Day)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">7 days:</span>
                    <span className="text-green-300 font-semibold tabular-nums">+{formatSilver(r.profitPer7Days)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">30 days:</span>
                    <span className="text-green-200 font-bold tabular-nums">+{formatSilver(r.profitPer30Days)}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/60 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${r.marketDepth === 'healthy' ? 'bg-green-400' : r.marketDepth === 'moderate' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <span className={`font-semibold ${r.marketDepth === 'healthy' ? 'text-green-400' : r.marketDepth === 'moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                        {r.marketDepth === 'healthy' ? 'Market absorbs easily' : r.marketDepth === 'moderate' ? 'Market may saturate' : 'Market will flood'}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-600 mt-0.5">
                      Daily cap: {r.dailySoldEstimate} · Your supply: {Math.round(r.totalYieldPerPlot * plots)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs uppercase tracking-wider text-lime-400 font-semibold">All Crops (sorted by 7-day profit)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 w-10"></th>
                  <th className="text-left px-3 py-2.5">Crop</th>
                  <th className="text-right px-3 py-2.5">Seed</th>
                  <th className="text-right px-3 py-2.5">Crop Price</th>
                  <th className="text-left px-3 py-2.5">Best At</th>
                  <th className="text-right px-3 py-2.5">Per Plot</th>
                  <th className="text-right px-3 py-2.5">1 day ({plots})</th>
                  <th className="text-right px-3 py-2.5">7 days</th>
                  <th className="text-right px-3 py-2.5">30 days</th>
                  <th className="text-center px-3 py-2.5">Market</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.tier} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2"><ItemIcon itemId={r.outputId} size={32} /></td>
                    <td className="px-3 py-2">
                      <div className="text-zinc-200 font-medium">T{r.tier} {r.name}</div>
                      <div className="text-[10px] text-zinc-600">{r.marginPct.toFixed(0)}% margin</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">
                      {formatSilver(r.seedPrice)}
                      <div className="text-[9px] text-zinc-600">{r.seedSource}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.cropPrice)}</td>
                    <td className="px-3 py-2 text-green-400 text-[10px]">{r.cropCity}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${r.profitPerPlot > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.profitPerPlot > 0 ? '+' : ''}{formatSilver(r.profitPerPlot)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profitPer1Day > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatSilver(r.profitPer1Day)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profitPer7Days > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatSilver(r.profitPer7Days)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profitPer30Days > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatSilver(r.profitPer30Days)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${r.marketDepth === 'healthy' ? 'bg-green-400' : r.marketDepth === 'moderate' ? 'bg-amber-400' : 'bg-red-400'}`} title={r.marketDepth} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Nasıl çalışıyor?</div>
        <div className="text-xs text-zinc-400 space-y-1.5">
          <div>• <strong className="text-lime-400">1 day</strong>: ilk hasatta alırsın — market tam absorbe eder, teorik max kâr</div>
          <div>• <strong className="text-lime-400">7 days</strong>: market biraz doyar, fiyatlar %10-20 düşer, kâr azalır</div>
          <div>• <strong className="text-lime-400">30 days</strong>: uzun vadeli sürdürülebilir kâr, market saturation ciddi penalty (özellikle "Market will flood" olanlarda %40'a kadar düşüş)</div>
          <div>• <strong className="text-lime-400">Market depth</strong>: <span className="text-green-400">yeşil</span> = rahat sat, <span className="text-amber-400">sarı</span> = kısmen doyar, <span className="text-red-400">kırmızı</span> = dökülür fiyat düşer</div>
          <div>• <strong className="text-amber-400">Tavsiye</strong>: tek ürüne bağlanma, top 2-3'ü karıştır. 79 plot → 30 bean + 25 cabbage + 24 corn gibi</div>
        </div>
      </div>

      {!loading && results.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-30">🌱</div>
          <p className="text-sm text-zinc-500">Analyze'a bas — her crop için gerçekçi 1/7/30 günlük kâr projeksiyonu gör.</p>
        </div>
      )}
    </div>
  );
}
