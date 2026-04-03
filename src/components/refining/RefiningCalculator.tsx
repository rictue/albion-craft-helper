import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { getRefineSpec } from '../../data/specs';
import { lpbToReturnRate } from '../../utils/returnRate';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';

const BASE_REFINE_LPB = 15;
const CITY_REFINE_LPB = 53;
const FOCUS_REFINE_LPB = 53;

const ENCHANT_COLORS: Record<number, string> = {
  0: 'text-slate-300',
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
}

export default function RefiningCalculator() {
  const { settings } = useAppStore();
  const [results, setResults] = useState<RefineResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [useFocus, setUseFocus] = useState(true);
  const [refineCity, setRefineCity] = useState(settings.craftingCity);
  const [showAll, setShowAll] = useState(true);

  // Show all resources (no hardcoded filter)
  const speccedResources: string[] = [];

  const scan = useCallback(async () => {
    setScanning(true);
    setResults([]);

    try {
      const allIds: string[] = [];
      const typesToScan = showAll ? RESOURCE_TYPES : RESOURCE_TYPES.filter(rt => speccedResources.includes(rt.refinedPrefix));

      for (const rt of typesToScan) {
        for (const r of rt.recipes) {
          allIds.push(r.rawId, r.refinedId);
          if (r.prevRefinedId) allIds.push(r.prevRefinedId);
        }
      }

      const allPrices = await fetchPrices([...new Set(allIds)]);

      const cheapest = new Map<string, number>();
      const bestSell = new Map<string, { price: number; city: string }>();

      for (const p of allPrices) {
        if (p.sell_price_min > 0) {
          const ex = cheapest.get(p.item_id);
          if (!ex || p.sell_price_min < ex) cheapest.set(p.item_id, p.sell_price_min);

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
          const rawPrice = cheapest.get(recipe.rawId) || 0;
          const prevPrice = recipe.prevRefinedId ? (cheapest.get(recipe.prevRefinedId) || 0) : 0;
          const sell = bestSell.get(recipe.refinedId);
          if (!sell || rawPrice === 0) continue;

          const specLevel = getRefineSpec(rt.refinedPrefix, recipe.tier);
          const specBonusLPB = specLevel * 0.3;
          let lpb = BASE_REFINE_LPB;
          if (cityBonus.includes(rt.id)) lpb += CITY_REFINE_LPB;
          if (useFocus) lpb += FOCUS_REFINE_LPB;
          lpb += specBonusLPB;

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
  }, [useFocus, refineCity, showAll, speccedResources]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Refine City</label>
            <select
              value={refineCity}
              onChange={(e) => setRefineCity(e.target.value)}
              className="bg-surface-light border border-surface-lighter rounded-lg px-2 py-2 text-sm text-slate-200"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-blue-500" />
            <span className="text-sm text-slate-300">Focus</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-gold" />
            <span className="text-sm text-slate-300">Show All Resources</span>
          </label>
          {CITY_REFINE_BONUS[refineCity]?.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400">
              +53% LPB ({CITY_REFINE_BONUS[refineCity].join(', ')})
            </span>
          )}
          {!showAll && (
            <span className="text-xs text-slate-500 pb-1">
              Showing: {speccedResources.length > 0 ? speccedResources.join(', ') : 'none'} (your specs)
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
            {scannedAt && <span className="text-xs text-slate-500">Scanned at {scannedAt}</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-surface-lighter">
                  <th className="text-left px-3 py-2.5">Resource</th>
                  <th className="text-center px-3 py-2.5">Tier</th>
                  <th className="text-center px-3 py-2.5">Spec</th>
                  <th className="text-center px-3 py-2.5">RR</th>
                  <th className="text-right px-3 py-2.5">Input Cost</th>
                  <th className="text-right px-3 py-2.5">After Return</th>
                  <th className="text-right px-3 py-2.5">Sell</th>
                  <th className="text-right px-3 py-2.5">Profit</th>
                  <th className="text-right px-3 py-2.5">Margin</th>
                  <th className="text-left px-3 py-2.5">Sell At</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.refinedName + r.tier + r.enchant} className="border-b border-surface-lighter/50 hover:bg-surface-light transition-colors">
                    <td className="px-3 py-2.5">
                      <div className={ENCHANT_COLORS[r.enchant] || 'text-slate-200'}>{r.refinedName}</div>
                      <div className="text-xs text-slate-500">{r.rawName}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs font-bold text-gold">T{r.tier}</span>
                      {r.enchant > 0 && <span className={`text-xs ml-0.5 ${ENCHANT_COLORS[r.enchant]}`}>.{r.enchant}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.specLevel > 0 ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400">{r.specLevel}</span>
                      ) : (
                        <span className="text-xs text-slate-600">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400">
                      {formatPercent(r.returnRate * 100)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{formatSilver(r.rawCost)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">{formatSilver(r.totalCost)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-200">{formatSilver(r.sellPrice)}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${r.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${r.margin > 0 ? 'text-profit' : 'text-loss'}`}>
                      {r.margin > 0 ? '+' : ''}{formatPercent(r.margin)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-slate-400">{r.bestSellCity}</span>
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
          <h2 className="text-lg text-slate-400 mb-2">Refining Calculator</h2>
          <p className="text-sm text-slate-500">
            Compare refining profits with enchanted tiers included.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            {speccedResources.length > 0
              ? `Your specs: ${speccedResources.join(', ')}. Check "Show All" to see all resources.`
              : 'No refine specs found. Check "Show All" to see all resources.'}
          </p>
        </div>
      )}
    </div>
  );
}
