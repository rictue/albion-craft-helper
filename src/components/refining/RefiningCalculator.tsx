import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { getRefineSpec } from '../../data/specs';
import { lpbToReturnRate } from '../../utils/returnRate';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';

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
  rawId: string;
  refinedId: string;
  prevRefinedId: string;
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
  cheapestPrevPrice: number;
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
      const priceByCity = new Map<string, Map<string, number>>();

      // First pass: collect all prices
      for (const p of allPrices) {
        if (p.sell_price_min > 0) {
          const ex = cheapest.get(p.item_id);
          if (!ex || p.sell_price_min < ex.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });

          if (!priceByCity.has(p.item_id)) priceByCity.set(p.item_id, new Map());
          priceByCity.get(p.item_id)!.set(p.city, p.sell_price_min);
        }
      }

      // Second pass: calculate bestSell using outlier-filtered highest price
      // Group prices by item, filter outliers (>2x median), then pick highest
      for (const [itemId, cityPrices] of priceByCity.entries()) {
        const entries = [...cityPrices.entries()]
          .filter(([city]) => city !== 'Caerleon' && city !== 'Black Market')
          .map(([city, price]) => ({ city, price }));

        if (entries.length === 0) continue;

        // Calculate median
        const sortedByPrice = [...entries].sort((a, b) => a.price - b.price);
        const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].price;

        // Filter outliers: price > 2x median is suspicious (likely overpriced single listing)
        const filtered = entries.filter(e => e.price <= median * 2);
        if (filtered.length === 0) continue;

        // Pick highest among filtered
        filtered.sort((a, b) => b.price - a.price);
        bestSell.set(itemId, filtered[0]);
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
            rawId: recipe.rawId,
            refinedId: recipe.refinedId,
            prevRefinedId: recipe.prevRefinedId,
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
            cheapestPrevPrice: prevPrice,
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
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent rounded-xl border border-cyan-500/20 px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div className="text-xs text-zinc-400">
          <div className="text-zinc-200 font-semibold mb-0.5">Refining Profit Calculator</div>
          Fetches raw + previous-tier prices from all cities, calculates refining profit with return rate, city bonus, and focus. Sorted by profit.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Refine City</label>
            <select
              value={refineCity}
              onChange={(e) => setRefineCity(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Resource</label>
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              <option value="all">All Resources</option>
              {RESOURCE_TYPES.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-cyan-500" />
            <span className="text-sm text-zinc-200">Use Focus <span className="text-[10px] text-zinc-500">(+59 LPB)</span></span>
          </label>

          {CITY_REFINE_BONUS[refineCity]?.length > 0 && (
            <span className="text-xs px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
              ★ +40 LPB: {CITY_REFINE_BONUS[refineCity].join(', ')}
            </span>
          )}

          <button
            onClick={scan}
            disabled={scanning}
            className="ml-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 disabled:opacity-50 transition-colors"
          >
            {scanning ? 'Scanning...' : 'Scan Refine Prices'}
          </button>
        </div>
      </div>

      {scannedAt && (
        <div className="text-[10px] text-zinc-600 text-right px-1">
          {results.length} recipes · Scanned at {scannedAt}
        </div>
      )}

      {/* Results as cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {results.map(r => {
            const key = r.refinedName + r.tier + r.enchant;
            const profitColor = r.profit > 0 ? 'text-green-400' : 'text-red-400';
            const profitBg = r.profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
            const enchColor = ENCHANT_COLORS[r.enchant] || 'text-zinc-200';
            const rawInput = rawCounts[key] || 0;
            const userCrafts = rawInput > 0 ? Math.floor(rawInput / r.rawPerCraft) : 0;
            const focusCrafts = r.focusCostPerCraft > 0 ? Math.floor(30000 / r.focusCostPerCraft) : 0;

            return (
              <div key={key} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemIcon itemId={r.refinedId} size={44} />
                    <div className="min-w-0">
                      <div className={`text-sm font-bold truncate ${enchColor}`}>{r.refinedName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-gold">T{r.tier}{r.enchant > 0 && `.${r.enchant}`}</span>
                        <span className="text-[10px] text-zinc-500">· {formatPercent(r.returnRate * 100)} RR</span>
                        {r.specLevel > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">Spec {r.specLevel}</span>}
                      </div>
                    </div>
                  </div>
                  <div className={`text-right px-2 py-1 rounded-lg border shrink-0 ${profitBg}`}>
                    <div className={`text-sm font-bold ${profitColor}`}>
                      {r.profit >= 0 ? '+' : ''}{formatSilver(r.profit)}
                    </div>
                    <div className={`text-[10px] ${profitColor}`}>{formatPercent(r.margin)}</div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="px-4 py-3 space-y-1.5 border-b border-zinc-800">
                  {/* Raw */}
                  <div className="flex items-center gap-2 text-xs">
                    <ItemIcon itemId={r.rawId} size={22} />
                    <span className="text-zinc-400 flex-1 truncate">{r.rawName} <span className="text-zinc-600">x{r.rawPerCraft}</span></span>
                    <span className={`text-[10px] ${r.cheapestRawCity === refineCity ? 'text-green-400' : 'text-zinc-600'}`}>{r.cheapestRawCity.substring(0, 5)}</span>
                    <span className="text-zinc-300 tabular-nums">{formatSilver(r.cheapestRawPrice * r.rawPerCraft)}</span>
                  </div>
                  {/* Prev tier (if any) */}
                  {r.prevPerCraft > 0 && r.prevRefinedId && (
                    <div className="flex items-center gap-2 text-xs">
                      <ItemIcon itemId={r.prevRefinedId} size={22} />
                      <span className="text-zinc-400 flex-1 truncate">Prev tier <span className="text-zinc-600">x{r.prevPerCraft}</span></span>
                      <span className="text-zinc-300 tabular-nums">{formatSilver(r.cheapestPrevPrice * r.prevPerCraft)}</span>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="px-4 py-3 space-y-1 text-xs border-b border-zinc-800">
                  <div className="flex justify-between text-zinc-500">
                    <span>Raw cost</span>
                    <span className="tabular-nums">{formatSilver(r.rawCost)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>After return ({formatPercent(r.returnRate * 100)})</span>
                    <span className="tabular-nums">{formatSilver(r.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Sell @ {r.bestSellCity}</span>
                    <span className="tabular-nums font-semibold">{formatSilver(r.sellPrice)}</span>
                  </div>
                </div>

                {/* 30K Focus + manual calc */}
                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                  {focusCrafts > 0 && (
                    <div className="bg-zinc-800/40 rounded-lg p-2">
                      <div className="text-[10px] uppercase text-zinc-600 tracking-wider">30K Focus</div>
                      <div className="text-zinc-300 font-semibold">{focusCrafts} crafts</div>
                      <div className={`text-[11px] ${focusCrafts * r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {focusCrafts * r.profit > 0 ? '+' : ''}{formatSilver(focusCrafts * r.profit)}
                      </div>
                    </div>
                  )}
                  <div className="bg-zinc-800/40 rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[10px] uppercase text-zinc-600 tracking-wider mb-0.5">Your Raw</div>
                    <input
                      type="number" min={0}
                      value={rawInput === 0 ? '' : rawInput}
                      placeholder="0"
                      onChange={(e) => setRawCounts(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                    {userCrafts > 0 && (
                      <div className={`text-[11px] mt-0.5 ${userCrafts * r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {userCrafts} crafts · {userCrafts * r.profit > 0 ? '+' : ''}{formatSilver(userCrafts * r.profit)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scanning && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          Fetching raw and refined prices across all cities...
        </div>
      )}

      {!scanning && results.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#9874;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Refining Calculator</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">Pick your refine city and click <strong className="text-cyan-400">Scan Refine Prices</strong>. Results show raw + prev tier ingredients, profit after return rate, and 30K focus estimate.</p>
        </div>
      )}
    </div>
  );
}
