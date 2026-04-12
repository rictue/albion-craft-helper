import { useState, useCallback, useMemo, useEffect } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

/**
 * Island Planner — realistic crop profit analysis
 *
 * Crops + seeds are rarely traded on AH (API data empty), so we use:
 *   - NPC seed prices (fixed by game)
 *   - User-editable crop sell prices (hardcoded defaults based on common in-game values)
 *   - Live API fallback if data exists
 *
 * Outputs 1/7/30-day projections accounting for market saturation.
 */

// Crop data — NPC seed prices + typical in-game crop sell prices (user can override)
const CROPS = [
  { tier: 2, name: 'Carrot',  seedId: 'T2_FARM_CARROT_SEED',  outputId: 'T2_CARROT',  npcSeed: 48,     defaultCropPrice: 15,    yieldWatered: 4.5, yieldUnwatered: 2.7 },
  { tier: 3, name: 'Bean',    seedId: 'T3_FARM_BEAN_SEED',    outputId: 'T3_BEAN',    npcSeed: 120,    defaultCropPrice: 50,    yieldWatered: 5.1, yieldUnwatered: 3.1 },
  { tier: 4, name: 'Wheat',   seedId: 'T4_FARM_WHEAT_SEED',   outputId: 'T4_WHEAT',   npcSeed: 480,    defaultCropPrice: 140,   yieldWatered: 5.7, yieldUnwatered: 3.5 },
  { tier: 5, name: 'Turnip',  seedId: 'T5_FARM_TURNIP_SEED',  outputId: 'T5_TURNIP',  npcSeed: 1920,   defaultCropPrice: 400,   yieldWatered: 6.3, yieldUnwatered: 3.9 },
  { tier: 6, name: 'Cabbage', seedId: 'T6_FARM_CABBAGE_SEED', outputId: 'T6_CABBAGE', npcSeed: 7680,   defaultCropPrice: 1200,  yieldWatered: 6.9, yieldUnwatered: 4.3 },
  { tier: 7, name: 'Potato',  seedId: 'T7_FARM_POTATO_SEED',  outputId: 'T7_POTATO',  npcSeed: 30720,  defaultCropPrice: 3500,  yieldWatered: 7.5, yieldUnwatered: 4.7 },
  { tier: 8, name: 'Corn',    seedId: 'T8_FARM_CORN_SEED',    outputId: 'T8_CORN',    npcSeed: 122880, defaultCropPrice: 10000, yieldWatered: 8.1, yieldUnwatered: 5.1 },
];

const SEEDS_PER_PLOT = 9;
const PREMIUM_TAX = 0.065;

// Rough daily market absorb capacity per tier (crops are thinly traded)
const CROP_DAILY_CAP: Record<number, number> = {
  2: 8000, 3: 6000, 4: 5000, 5: 4000, 6: 3000, 7: 2500, 8: 2000,
};

interface Row {
  tier: number;
  name: string;
  outputId: string;
  seedPrice: number;
  cropPrice: number;
  hasLiveData: boolean;
  totalYieldPerPlot: number;
  revenuePerPlot: number;
  netSeedCostPerPlot: number;
  profitPerPlot: number;
  marginPct: number;
  profit1Day: number;
  profit7Days: number;
  profit30Days: number;
  depth: 'thin' | 'moderate' | 'healthy';
}

export default function IslandPlanner() {
  const [plots, setPlots] = useState(79);
  const [watered, setWatered] = useState(true);
  const [premium, setPremium] = useState(true);
  const [customPrices, setCustomPrices] = useState<Record<number, number>>({});
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);

    // Try to fetch live crop prices (rare but possible)
    const ids = CROPS.map(c => c.outputId);
    const data = await fetchPrices(ids);

    const best = new Map<number, number>();
    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const crop = CROPS.find(c => c.outputId === p.item_id);
      if (!crop) continue;
      const cur = best.get(crop.tier) ?? 0;
      if (p.sell_price_min > cur) best.set(crop.tier, p.sell_price_min);
    }
    const liveMap: Record<number, number> = {};
    best.forEach((v, k) => { liveMap[k] = v; });
    setLivePrices(liveMap);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  // Auto-fetch crop prices on first mount so the table isn't showing
  // stale hard-coded defaults until the user clicks 'Analyze Crops'.
  useEffect(() => {
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo((): Row[] => {
    const out: Row[] = [];
    for (const c of CROPS) {
      // Priority: user custom > live API > hardcoded default
      const cropPrice = customPrices[c.tier] ?? livePrices[c.tier] ?? c.defaultCropPrice;
      const hasLiveData = livePrices[c.tier] != null && customPrices[c.tier] == null;

      const baseYield = watered ? c.yieldWatered : c.yieldUnwatered;
      const yieldPerSeed = premium ? baseYield * 2 : baseYield;
      const totalYieldPerPlot = SEEDS_PER_PLOT * yieldPerSeed;

      const seedReturnRate = watered ? 1.0 : 0.8;
      const netSeedCostPerPlot = SEEDS_PER_PLOT * c.npcSeed * (1 - seedReturnRate);

      const revenuePerPlot = totalYieldPerPlot * cropPrice * (1 - PREMIUM_TAX);
      const profitPerPlot = revenuePerPlot - netSeedCostPerPlot;
      const marginPct = netSeedCostPerPlot > 0
        ? (profitPerPlot / netSeedCostPerPlot) * 100
        : (profitPerPlot > 0 ? 9999 : 0);

      // Market depth
      const dailyProduction = totalYieldPerPlot * plots;
      const dailyCap = CROP_DAILY_CAP[c.tier];
      const saturation = dailyProduction / dailyCap;
      let depth: 'thin' | 'moderate' | 'healthy' = 'healthy';
      if (saturation > 1.5) depth = 'thin';
      else if (saturation > 0.7) depth = 'moderate';

      const day1 = profitPerPlot * plots;
      let weekMult = 7;
      let monthMult = 30;
      if (depth === 'thin') { weekMult = 5.5; monthMult = 18; }
      else if (depth === 'moderate') { weekMult = 6.5; monthMult = 24; }

      out.push({
        tier: c.tier,
        name: c.name,
        outputId: c.outputId,
        seedPrice: c.npcSeed,
        cropPrice,
        hasLiveData,
        totalYieldPerPlot,
        revenuePerPlot,
        netSeedCostPerPlot,
        profitPerPlot,
        marginPct,
        profit1Day: day1,
        profit7Days: day1 * weekMult,
        profit30Days: day1 * monthMult,
        depth,
      });
    }
    out.sort((a, b) => b.profit7Days - a.profit7Days);
    return out;
  }, [plots, watered, premium, customPrices, livePrices]);

  const topThree = results.slice(0, 3);
  const updateCustom = (tier: number, val: number | null) => {
    setCustomPrices(prev => {
      const next = { ...prev };
      if (val == null || val <= 0) delete next[tier];
      else next[tier] = val;
      return next;
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-lime-500/10 via-green-500/5 to-transparent rounded-xl border border-lime-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">🌾 Island Planner</div>
        <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
          <div>Realistic crop profit analysis — not "plant bean earn 3.5M/day" but what actually holds up over time.</div>
          <div>Factors: <strong className="text-lime-400">market depth</strong> · <strong className="text-lime-400">seed return</strong> · <strong className="text-lime-400">yield per plot</strong> · <strong className="text-lime-400">tax</strong> · <strong className="text-lime-400">1/7/30 day projections</strong></div>
          <div className="text-amber-400/80 mt-1">⚠ Crops are rarely traded on AH. Sell prices below are in-game estimates — override with your actual selling prices for accurate results.</div>
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
            <button onClick={analyze} disabled={loading} className="w-full px-6 py-2.5 rounded-lg text-sm font-bold bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/30 disabled:opacity-50 transition-colors">
              {loading ? 'Loading...' : '🔍 Refresh Prices'}
            </button>
          </div>
        </div>
        {scannedAt && <div className="mt-3 text-[10px] text-zinc-600">Live price check at {scannedAt} · {Object.keys(livePrices).length} crops had market data</div>}
      </div>

      {/* Top 3 */}
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
                    <span className={`font-semibold tabular-nums ${r.profit1Day > 0 ? 'text-green-400' : 'text-red-400'}`}>{r.profit1Day > 0 ? '+' : ''}{formatSilver(r.profit1Day)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">7 days:</span>
                    <span className={`font-semibold tabular-nums ${r.profit7Days > 0 ? 'text-green-300' : 'text-red-400'}`}>{r.profit7Days > 0 ? '+' : ''}{formatSilver(r.profit7Days)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">30 days:</span>
                    <span className={`font-bold tabular-nums ${r.profit30Days > 0 ? 'text-green-200' : 'text-red-400'}`}>{r.profit30Days > 0 ? '+' : ''}{formatSilver(r.profit30Days)}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/60 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${r.depth === 'healthy' ? 'bg-green-400' : r.depth === 'moderate' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <span className={`font-semibold ${r.depth === 'healthy' ? 'text-green-400' : r.depth === 'moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                        {r.depth === 'healthy' ? 'Market absorbs easily' : r.depth === 'moderate' ? 'Market may saturate' : 'Market will flood'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table with editable prices */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-xs uppercase tracking-wider text-lime-400 font-semibold">All Crops</h3>
          <div className="text-[10px] text-zinc-600 mt-0.5">Click the price cells to override with your actual selling prices</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 w-10"></th>
                <th className="text-left px-3 py-2.5">Crop</th>
                <th className="text-right px-3 py-2.5">Seed (NPC)</th>
                <th className="text-right px-3 py-2.5">Crop Sell</th>
                <th className="text-right px-3 py-2.5">Yield/Plot</th>
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
                    <div className="text-[10px] text-zinc-600">{r.marginPct < 9999 ? r.marginPct.toFixed(0) : '∞'}% margin</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.seedPrice)}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={customPrices[r.tier] ?? ''}
                      placeholder={r.cropPrice.toString()}
                      onChange={(e) => updateCustom(r.tier, e.target.value ? parseInt(e.target.value) : null)}
                      className={`w-20 text-right bg-zinc-800/60 border border-zinc-700/50 rounded px-1.5 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-lime-500/40 ${customPrices[r.tier] != null ? 'text-lime-300' : r.hasLiveData ? 'text-cyan-300' : 'text-zinc-500'}`}
                    />
                    <div className="text-[9px] text-zinc-600 mt-0.5">
                      {customPrices[r.tier] != null ? 'custom' : r.hasLiveData ? 'live' : 'default'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-lime-400 tabular-nums">{r.totalYieldPerPlot.toFixed(0)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${r.profitPerPlot > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.profitPerPlot > 0 ? '+' : ''}{formatSilver(r.profitPerPlot)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit1Day > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatSilver(r.profit1Day)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit7Days > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatSilver(r.profit7Days)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${r.profit30Days > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatSilver(r.profit30Days)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${r.depth === 'healthy' ? 'bg-green-400' : r.depth === 'moderate' ? 'bg-amber-400' : 'bg-red-400'}`} title={r.depth} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">How it works</div>
        <div className="text-xs text-zinc-400 space-y-1.5">
          <div>• <strong className="text-lime-400">1 day</strong>: first harvest — market absorbs it fully, theoretical maximum</div>
          <div>• <strong className="text-lime-400">7 days</strong>: market partially saturated, prices drop 10-20%, profit decreases</div>
          <div>• <strong className="text-lime-400">30 days</strong>: sustainable long-run profit, heavy saturation penalty (up to 40% drop for "flooded" markets)</div>
          <div>• <strong className="text-lime-400">Market depth</strong>: <span className="text-green-400">green</span> = easy to sell, <span className="text-amber-400">yellow</span> = partial saturation, <span className="text-red-400">red</span> = price crashes</div>
          <div>• <strong className="text-amber-400">Crop prices</strong>: Auction House rarely lists crops. Default prices are estimates — click a price cell to enter your actual in-game selling price</div>
          <div>• <strong className="text-amber-400">Tip</strong>: Don't commit all plots to one crop. Mix top 2-3 to avoid flooding the market with one type</div>
        </div>
      </div>
    </div>
  );
}
