import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { getRefineSpec } from '../../data/specs';
import { lpbToReturnRate } from '../../utils/returnRate';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';

// Correct values from Albion Wiki:
// Base royal city = 18 LPB (15.2% RRR)
// Refining specialization = +40 LPB
// Focus = +59 LPB flat
const BASE_REFINE_LPB = 18;
const CITY_REFINE_LPB = 40;
const FOCUS_REFINE_LPB = 59;

// Base focus cost per refine (before spec reduction). Approximate values.
const FOCUS_COST_PER_TIER: Record<number, number> = {
  2: 10, 3: 23, 4: 45, 5: 90, 6: 180, 7: 360, 8: 540,
};

const ENCHANT_COLORS: Record<number, string> = {
  0: 'text-zinc-300',
  1: 'text-green-400',
  2: 'text-blue-400',
  3: 'text-purple-400',
};

interface RefineResult {
  resourceType: string;
  resourceId: string;
  tier: number;
  enchant: number;
  rawName: string;
  refinedName: string;
  rawCost: number;
  totalCost: number;
  sellPrice: number;
  profit: number;
  margin: number;
  returnRate: number;
  specLevel: number;
  bestSellCity: string;
  cheapestRawCity: string;
  cheapestRawPrice: number;
  refineCityRawPrice: number;
  rawPerCraft: number;
  prevPerCraft: number;
  focusCostPerCraft: number;
}

export default function RefiningCalculator() {
  const { settings } = useAppStore();
  const [results, setResults] = useState<RefineResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [useFocus, setUseFocus] = useState(true);
  const [rawCounts, setRawCounts] = useState<Record<string, number>>({});
  const [refineCity, setRefineCity] = useState(settings.craftingCity);
  const [filterResource, setFilterResource] = useState<string>('all');

  const scan = useCallback(async () => {
    setScanning(true);
    setResults([]);

    try {
      const allIds: string[] = [];
      const typesToScan = filterResource === 'all' ? RESOURCE_TYPES : RESOURCE_TYPES.filter(rt => rt.id === filterResource);

      for (const rt of typesToScan) {
        for (const r of rt.recipes) {
          allIds.push(r.rawId, r.refinedId);
          if (r.prevRefinedId) allIds.push(r.prevRefinedId);
        }
      }

      const allPrices = await fetchPrices([...new Set(allIds)]);

      const cheapest = new Map<string, { price: number; city: string }>();
      const bestSell = new Map<string, { price: number; city: string }>();
      // Price per city for comparison
      const priceByCity = new Map<string, Map<string, number>>();

      for (const p of allPrices) {
        if (p.sell_price_min > 0) {
          const ex = cheapest.get(p.item_id);
          if (!ex || p.sell_price_min < ex.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });

          // Track per-city prices
          if (!priceByCity.has(p.item_id)) priceByCity.set(p.item_id, new Map());
          priceByCity.get(p.item_id)!.set(p.city, p.sell_price_min);

          if (p.city !== 'Caerleon' && p.city !== 'Black Market') {
            const exS = bestSell.get(p.item_id);
            if (!exS || p.sell_price_min > exS.price) bestSell.set(p.item_id, { price: p.sell_price_min, city: p.city });
          }
        }
      }

      const cityBonus = CITY_REFINE_BONUS[refineCity] || [];
      const refineResults: RefineResult[] = [];

      for (const rt of typesToScan) {
        for (const recipe of rt.recipes) {
          const rawInfo = cheapest.get(recipe.rawId);
          const rawPrice = rawInfo?.price || 0;
          const prevInfo = recipe.prevRefinedId ? cheapest.get(recipe.prevRefinedId) : undefined;
          const prevPrice = prevInfo?.price || 0;
          const sell = bestSell.get(recipe.refinedId);
          if (!sell || rawPrice === 0) continue;

          // Price in refine city vs cheapest city
          const refineCityPrices = priceByCity.get(recipe.rawId);
          const refineCityRawPrice = refineCityPrices?.get(refineCity) || 0;

          const specLevel = getRefineSpec(rt.refinedPrefix, recipe.tier);
          // Spec reduces focus cost, does NOT affect return rate
          let lpb = BASE_REFINE_LPB;
          if (cityBonus.includes(rt.id)) lpb += CITY_REFINE_LPB;
          if (useFocus) lpb += FOCUS_REFINE_LPB;

          const returnRate = lpbToReturnRate(lpb);
          const rawCost = rawPrice * recipe.rawPerCraft;
          const prevCost = prevPrice * recipe.prevPerCraft;
          const totalInputCost = rawCost + prevCost;
          const effectiveCost = totalInputCost * (1 - returnRate);
          const profit = sell.price - effectiveCost;
          const margin = sell.price > 0 ? (profit / sell.price) * 100 : 0;

          refineResults.push({
            resourceType: rt.name,
            resourceId: rt.id,
            tier: recipe.tier,
            enchant: recipe.enchant,
            rawName: recipe.rawName,
            refinedName: recipe.refinedName,
            rawCost: totalInputCost,
            totalCost: effectiveCost,
            sellPrice: sell.price,
            profit, margin, returnRate, specLevel,
            bestSellCity: sell.city,
            cheapestRawCity: rawInfo?.city || '',
            cheapestRawPrice: rawPrice,
            refineCityRawPrice,
            rawPerCraft: recipe.rawPerCraft,
            prevPerCraft: recipe.prevPerCraft,
            focusCostPerCraft: Math.round((FOCUS_COST_PER_TIER[recipe.tier] || 45) * (1 - specLevel * 0.005)),
          });
        }
      }

      refineResults.sort((a, b) => b.profit - a.profit);
      setResults(refineResults);
      setScannedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Refine scan failed:', err);
    } finally {
      setScanning(false);
    }
  }, [useFocus, refineCity, filterResource]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Refine City</label>
            <select
              value={refineCity}
              onChange={(e) => setRefineCity(e.target.value)}
              className="bg-surface-light border border-surface-lighter rounded-lg px-2 py-2 text-sm text-zinc-200"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-blue-500" />
            <span className="text-sm text-zinc-300">Focus</span>
          </label>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Resource</label>
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="bg-surface-light border border-surface-lighter rounded-lg px-2 py-2 text-sm text-zinc-200"
            >
              <option value="all">All Resources</option>
              {RESOURCE_TYPES.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
          {CITY_REFINE_BONUS[refineCity]?.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400">
              +40 LPB ({CITY_REFINE_BONUS[refineCity].join(', ')})
            </span>
          )}
          <button
            onClick={scan}
            disabled={scanning}
            className="ml-auto bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/30 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan Refine Prices'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-lighter flex justify-between items-center">
            <h3 className="text-sm font-medium text-cyan-300">
              Refining Profit ({results.length} recipes)
            </h3>
            {scannedAt && <span className="text-xs text-zinc-500">Scanned at {scannedAt}</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-lighter">
                  <th className="text-left px-3 py-2.5">Resource</th>
                  <th className="text-center px-3 py-2.5">Tier</th>
                  <th className="text-center px-3 py-2.5">Spec</th>
                  <th className="text-center px-3 py-2.5">RR</th>
                  <th className="text-left px-3 py-2.5">Buy Raw From</th>
                  <th className="text-right px-3 py-2.5">Input Cost</th>
                  <th className="text-right px-3 py-2.5">After Return</th>
                  <th className="text-right px-3 py-2.5">Sell</th>
                  <th className="text-right px-3 py-2.5">Profit</th>
                  <th className="text-right px-3 py-2.5">Margin</th>
                  <th className="text-left px-3 py-2.5">Sell At</th>
                  <th className="text-center px-3 py-2.5">30K Focus</th>
                  <th className="text-center px-3 py-2.5">Calculator</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.refinedName + r.tier + r.enchant} className="border-b border-surface-lighter/50 hover:bg-surface-light transition-colors">
                    <td className="px-3 py-2.5">
                      <div className={ENCHANT_COLORS[r.enchant] || 'text-zinc-200'}>{r.refinedName}</div>
                      <div className="text-xs text-zinc-500">{r.rawName}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs font-bold text-gold">T{r.tier}</span>
                      {r.enchant > 0 && <span className={`text-xs ml-0.5 ${ENCHANT_COLORS[r.enchant]}`}>.{r.enchant}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.specLevel > 0 ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400">{r.specLevel}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-zinc-400">
                      {formatPercent(r.returnRate * 100)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs ${r.cheapestRawCity === refineCity ? 'text-green-400' : 'text-cyan-400'}`}>
                        {r.cheapestRawCity}
                      </span>
                      <span className="text-[11px] text-zinc-500 ml-1">{formatSilver(r.cheapestRawPrice)}</span>
                      {r.refineCityRawPrice > 0 && r.cheapestRawCity !== refineCity && (
                        <div className="text-[11px] text-zinc-600">
                          {refineCity}: {formatSilver(r.refineCityRawPrice)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-400">{formatSilver(r.rawCost)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">{formatSilver(r.totalCost)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-200">{formatSilver(r.sellPrice)}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${r.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${r.margin > 0 ? 'text-profit' : 'text-loss'}`}>
                      {r.margin > 0 ? '+' : ''}{formatPercent(r.margin)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-zinc-400">{r.bestSellCity}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.focusCostPerCraft > 0 ? (() => {
                        const crafts = Math.floor(30000 / r.focusCostPerCraft);
                        const rawNeeded = crafts * r.rawPerCraft;
                        const prevNeeded = crafts * r.prevPerCraft;
                        const totalProfit = crafts * r.profit;
                        return (
                          <div className="text-[11px]">
                            <div className="text-zinc-300">{crafts} craft</div>
                            <div className="text-zinc-500">{rawNeeded} raw + {prevNeeded} prev</div>
                            <div className={totalProfit > 0 ? 'text-profit' : 'text-loss'}>
                              {totalProfit > 0 ? '+' : ''}{formatSilver(totalProfit)}
                            </div>
                          </div>
                        );
                      })() : '-'}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const key = r.refinedName + r.tier + r.enchant;
                        const rawInput = rawCounts[key] || 0;
                        const crafts = rawInput > 0 ? Math.floor(rawInput / r.rawPerCraft) : 0;
                        const prevNeeded = crafts * r.prevPerCraft;
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-zinc-500 w-8">Raw:</span>
                              <input
                                type="number" min={0}
                                value={rawInput === 0 ? '' : rawInput}
                                placeholder="0"
                                onChange={(e) => setRawCounts(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 text-center focus:outline-none focus:ring-2 focus:ring-gold/40"
                              />
                            </div>
                            {crafts > 0 && (
                              <div className="text-xs space-y-0.5">
                                <div className="text-zinc-400">Need: <span className="text-zinc-200 font-medium">{prevNeeded}</span> prev tier</div>
                                <div className="text-zinc-400">Output: <span className="text-gold font-medium">{crafts}</span> refined</div>
                                <div className={`font-medium ${crafts * r.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                                  Profit: {crafts * r.profit > 0 ? '+' : ''}{formatSilver(crafts * r.profit)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#9874;</div>
          <h2 className="text-lg text-zinc-400 mb-2">Refining Calculator</h2>
          <p className="text-sm text-zinc-500">
            Compare refining profits with enchanted tiers included.
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Select resource filter and click Scan. Spec levels in table are from your saved specs.
          </p>
        </div>
      )}
    </div>
  );
}
