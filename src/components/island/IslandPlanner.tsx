import { useState, useMemo, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { CROPS, HERBS, ANIMALS, CITY_FARM_BONUS } from '../../data/farming';
import type { FarmItem, AnimalItem } from '../../data/farming';
import { formatSilver } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';

interface FarmResult {
  item: FarmItem | AnimalItem;
  type: 'crop' | 'herb' | 'animal';
  costPerPlot: number;
  revenuePerPlot: number;
  profitPerPlot: number;
  profitPerDay: number;
  bestSellCity: string;
  bestSellPrice: number;
  seedSource: 'NPC' | 'Market';
  seedCostEach: number;
}

export default function IslandPlanner() {
  const { settings } = useAppStore();
  const [results, setResults] = useState<FarmResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [islandPlots, setIslandPlots] = useState<number[]>([16]);
  const [hasPremium, setHasPremium] = useState(settings.hasPremium);
  const [useFocus, setUseFocus] = useState(false);
  const [islandCity, setIslandCity] = useState(settings.craftingCity);

  const totalPlots = islandPlots.reduce((s, p) => s + p, 0);

  const addIsland = () => setIslandPlots([...islandPlots, 16]);
  const removeIsland = (i: number) => setIslandPlots(islandPlots.filter((_, idx) => idx !== i));
  const updatePlots = (i: number, v: number) => {
    const next = [...islandPlots];
    next[i] = Math.max(1, Math.min(16, v));
    setIslandPlots(next);
  };

  const scan = useCallback(async () => {
    setScanning(true);
    setProgress(0);
    setResults([]);

    try {
      // Collect all IDs
      const allIds: string[] = [];
      for (const c of CROPS) { allIds.push(c.seedId, c.outputId); }
      for (const h of HERBS) { allIds.push(h.seedId, h.outputId); }
      for (const a of ANIMALS) {
        allIds.push(a.babyId, a.grownId);
        if (a.mountId) allIds.push(a.mountId);
      }
      // Also add crop outputs needed for animal feed
      for (const c of CROPS) { allIds.push(c.outputId); }

      const allPrices = await fetchPrices([...new Set(allIds)], undefined, false);
      setProgress(100);

      // Build price lookup: cheapest buy (for seeds/babies) and best sell (for outputs)
      const cheapestBuy = new Map<string, number>();
      const bestSell = new Map<string, { price: number; city: string }>();

      for (const p of allPrices) {
        if (p.sell_price_min > 0) {
          // Cheapest to buy (seed cost)
          const existing = cheapestBuy.get(p.item_id);
          if (!existing || p.sell_price_min < existing) {
            cheapestBuy.set(p.item_id, p.sell_price_min);
          }
          // Best to sell (output revenue)
          const existSell = bestSell.get(p.item_id);
          if (!existSell || p.sell_price_min > existSell.price) {
            bestSell.set(p.item_id, { price: p.sell_price_min, city: p.city });
          }
        }
      }

      const bonusTypes = CITY_FARM_BONUS[islandCity] || [];
      const farmResults: FarmResult[] = [];

      // Calculate crop/herb profits
      for (const item of [...CROPS, ...HERBS]) {
        const marketSeedCost = cheapestBuy.get(item.seedId) || Infinity;
        const npcSeedCost = item.npcPrice;
        const seedCost = Math.min(marketSeedCost === Infinity ? npcSeedCost : marketSeedCost, npcSeedCost);
        const seedSource = seedCost === npcSeedCost ? 'NPC' as const : 'Market' as const;

        const outputSell = bestSell.get(item.outputId);
        if (!outputSell) continue;

        const yieldPerSeed = hasPremium ? item.yieldPerSeedPremium : item.yieldPerSeed;
        const bonusMult = bonusTypes.includes(item.type) ? 1.1 : 1.0;
        const totalYield = Math.floor(item.seedsPerPlot * yieldPerSeed * bonusMult);

        // Focus: 100% seed return. No focus: ~33% seed return
        const seedReturnRate = useFocus ? 1.0 : 0.33;
        const seedReturn = Math.floor(item.seedsPerPlot * seedReturnRate);
        const netSeedCost = (item.seedsPerPlot - seedReturn) * seedCost;

        const revenue = totalYield * outputSell.price;
        const profit = revenue - netSeedCost;

        farmResults.push({
          item,
          type: item.type,
          costPerPlot: netSeedCost,
          revenuePerPlot: revenue,
          profitPerPlot: profit,
          profitPerDay: profit,
          bestSellCity: outputSell.city,
          bestSellPrice: outputSell.price,
          seedSource,
          seedCostEach: seedCost,
        });
      }

      // Calculate animal profits
      for (const animal of ANIMALS) {
        const marketBabyCost = cheapestBuy.get(animal.babyId) || Infinity;
        const npcBabyCost = animal.npcPrice;
        const babyCost = Math.min(marketBabyCost === Infinity ? npcBabyCost : marketBabyCost, npcBabyCost);
        const babySource = babyCost === npcBabyCost ? 'NPC' as const : 'Market' as const;

        const mountSell = animal.mountId ? bestSell.get(animal.mountId) : undefined;
        const grownSell = bestSell.get(animal.grownId);
        if (!mountSell && !grownSell) continue;

        const feedCrop = CROPS.find(c => c.tier === animal.feedCropTier);
        const feedCropPrice = feedCrop ? Math.min(cheapestBuy.get(feedCrop.outputId) || feedCrop.npcPrice, feedCrop.npcPrice) : 0;
        const feedCostPerAnimal = feedCropPrice * animal.feedAmount;

        const totalAnimals = animal.perPlot;
        const totalBabyCost = babyCost * totalAnimals;
        const totalFeedCost = feedCostPerAnimal * totalAnimals;
        const totalCost = totalBabyCost + totalFeedCost;

        const sellInfo = mountSell || grownSell!;
        const totalRevenue = sellInfo.price * totalAnimals;
        const profit = totalRevenue - totalCost;

        farmResults.push({
          item: animal,
          type: 'animal',
          costPerPlot: totalCost,
          revenuePerPlot: totalRevenue,
          profitPerPlot: profit,
          profitPerDay: profit,
          bestSellCity: sellInfo.city,
          bestSellPrice: sellInfo.price,
          seedSource: babySource,
          seedCostEach: babyCost,
        });
      }

      farmResults.sort((a, b) => b.profitPerPlot - a.profitPerPlot);
      setResults(farmResults);
      setScannedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Farm scan failed:', err);
    } finally {
      setScanning(false);
    }
  }, [hasPremium, useFocus, islandCity]);

  // Optimization: best item gets all plots (you CAN plant same thing on every plot)
  // Show top 3 options for comparison
  const optimization = useMemo(() => {
    if (results.length === 0) return { totalProfit: 0, bestItem: '', assignments: [] as { name: string; plots: number; profitTotal: number; profitPerPlot: number; type: string }[] };

    // Only profitable items
    const profitable = results.filter(r => r.profitPerPlot > 0);
    if (profitable.length === 0) return { totalProfit: 0, bestItem: '', assignments: [] };

    const assignments = profitable.slice(0, 5).map(r => {
      const name = 'name' in r.item ? r.item.name : '';
      return {
        name,
        plots: totalPlots,
        profitTotal: r.profitPerPlot * totalPlots,
        profitPerPlot: r.profitPerPlot,
        type: r.type,
      };
    });

    return {
      totalProfit: assignments[0]?.profitTotal || 0,
      bestItem: assignments[0]?.name || '',
      assignments,
    };
  }, [results, totalPlots]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Settings */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Island City</label>
            <select
              value={islandCity}
              onChange={(e) => setIslandCity(e.target.value)}
              className="bg-surface-light border border-surface-lighter rounded-lg px-2 py-2 text-sm text-slate-200"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Islands ({islandPlots.length})</label>
            <div className="flex items-center gap-1 flex-wrap">
              {islandPlots.map((p, i) => (
                <div key={i} className="flex items-center gap-0.5">
                  <input
                    type="number" min={1} max={16} value={p}
                    onChange={(e) => updatePlots(i, parseInt(e.target.value) || 1)}
                    className="w-12 bg-surface-light border border-surface-lighter rounded px-1 py-1 text-xs text-slate-200 text-center"
                  />
                  {islandPlots.length > 1 && (
                    <button onClick={() => removeIsland(i)} className="text-red-400 text-xs hover:text-red-300">x</button>
                  )}
                </div>
              ))}
              <button onClick={addIsland} className="text-xs text-gold hover:text-gold-light px-1.5 py-1 rounded bg-surface-light">+</button>
            </div>
          </div>
          <div className="pb-1">
            <span className="text-xs text-slate-500">Total: </span>
            <span className="text-sm text-gold font-bold">{totalPlots} plots</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input type="checkbox" checked={hasPremium} onChange={(e) => setHasPremium(e.target.checked)} className="accent-gold" />
            <span className="text-sm text-slate-300">Premium</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-blue-500" />
            <span className="text-sm text-slate-300">Focus</span>
          </label>

          {CITY_FARM_BONUS[islandCity]?.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400">
              +10% yield ({CITY_FARM_BONUS[islandCity].join(', ')})
            </span>
          )}

          <button
            onClick={scan}
            disabled={scanning}
            className="ml-auto bg-green-900/30 hover:bg-green-900/50 text-green-300 border border-green-800/30 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan Farm Prices'}
          </button>
        </div>
        {scanning && (
          <div className="mt-3">
            <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Summary + Optimization */}
      {results.length > 0 && optimization.assignments.length > 0 && (
        <div className="bg-green-950/20 rounded-xl border border-green-800/30 p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-xs text-slate-500">Best Option: All {totalPlots} plots = {optimization.bestItem}</div>
              <div className="text-2xl font-bold text-profit">+{formatSilver(optimization.totalProfit)}/day</div>
            </div>
            {scannedAt && <span className="text-xs text-slate-500">Scanned at {scannedAt}</span>}
          </div>
          <div className="text-xs text-slate-500 mb-2">Top 5 options (if all {totalPlots} plots same item):</div>
          <div className="space-y-1">
            {optimization.assignments.map((a, i) => {
              const typeColors: Record<string, string> = { crop: 'text-yellow-400', herb: 'text-green-400', animal: 'text-blue-400' };
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-gold' : 'text-slate-500'}`}>#{i + 1}</span>
                    <span className={typeColors[a.type] || 'text-slate-300'}>{a.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 mr-2">{formatSilver(a.profitPerPlot)}/plot</span>
                    <span className="text-profit font-medium">+{formatSilver(a.profitTotal)}/day</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-lighter">
            <h3 className="text-sm font-medium text-green-400">
              Farm Profit Ranking (per plot, per day)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-surface-lighter">
                  <th className="text-left px-3 py-2.5 w-8">#</th>
                  <th className="text-left px-3 py-2.5">Item</th>
                  <th className="text-left px-3 py-2.5">Type</th>
                  <th className="text-left px-3 py-2.5">Buy From</th>
                  <th className="text-right px-3 py-2.5">Cost/Plot</th>
                  <th className="text-right px-3 py-2.5">Revenue/Plot</th>
                  <th className="text-right px-3 py-2.5">Profit/Plot</th>
                  <th className="text-left px-3 py-2.5">Sell At</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const name = 'name' in r.item ? r.item.name : '';
                  const isTopPick = i < totalPlots;
                  const typeColors = { crop: 'text-yellow-400 bg-yellow-900/20', herb: 'text-green-400 bg-green-900/20', animal: 'text-blue-400 bg-blue-900/20' };

                  return (
                    <tr key={name + r.type} className={`border-b border-surface-lighter/50 ${isTopPick ? 'bg-green-950/10' : ''}`}>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-bold ${i === 0 ? 'text-gold' : i < totalPlots ? 'text-slate-300' : 'text-slate-600'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={isTopPick ? 'text-slate-200 font-medium' : 'text-slate-400'}>
                          {name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[r.type]}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.seedSource === 'NPC' ? 'bg-purple-900/20 text-purple-400' : 'bg-surface-lighter text-slate-300'}`}>
                          {r.seedSource}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">{formatSilver(r.seedCostEach)} ea</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400">{formatSilver(r.costPerPlot)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-300">{formatSilver(r.revenuePerPlot)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${r.profitPerPlot > 0 ? 'text-profit' : 'text-loss'}`}>
                        {r.profitPerPlot > 0 ? '+' : ''}{formatSilver(r.profitPerPlot)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-400">{r.bestSellCity}</span>
                        <span className="text-xs text-slate-500 ml-1">({formatSilver(r.bestSellPrice)} ea)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#127793;</div>
          <h2 className="text-lg text-slate-400 mb-2">Island Planner</h2>
          <p className="text-sm text-slate-500">
            Find the most profitable crops, herbs, and animals for your island.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Compares seed cost vs harvest revenue across all cities.
          </p>
        </div>
      )}
    </div>
  );
}
