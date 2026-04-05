import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { COOKING_RECIPES, COOKING_CATEGORIES, COOKING_CITY_BONUS } from '../../data/cooking';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';

interface CookingResult {
  mealId: string;
  mealName: string;
  category: string;
  tier: number;
  ingredients: { itemId: string; name: string; count: number; unitPrice: number; totalPrice: number; city: string }[];
  totalCost: number;
  effectiveCost: number;
  sellPrice: number;
  sellCity: string;
  profit: number;
  margin: number;
  returnRate: number;
  cityBonus: boolean;
}

// Cooking return rates (approximation from in-game values)
// Base RRR without bonuses
const BASE_RR = 0.152;            // 15.2%
const CITY_BONUS_RR = 0.20;       // +20% for matching city
const FOCUS_RR = 0.475;           // 47.5% with focus (matches albiononlinetools)

const TAX_RATE = 0.065; // 6.5% with premium

export default function Cooking() {
  const [cookCity, setCookCity] = useState('Martlock');
  const [useFocus, setUseFocus] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [results, setResults] = useState<CookingResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setResults([]);

    try {
      const recipesToScan = category === 'all' ? COOKING_RECIPES : COOKING_RECIPES.filter(r => r.category === category);

      // Collect all needed item IDs
      const idSet = new Set<string>();
      for (const r of recipesToScan) {
        idSet.add(r.mealId);
        for (const ing of r.ingredients) idSet.add(ing.itemId);
      }

      const prices = await fetchPrices([...idSet]);

      // Build cheapest buy + best sell maps
      const cheapest = new Map<string, { price: number; city: string }>();
      const bestSell = new Map<string, { price: number; city: string }>();
      const priceByCity = new Map<string, Map<string, number>>();

      for (const p of prices) {
        if (p.sell_price_min > 0) {
          const ex = cheapest.get(p.item_id);
          if (!ex || p.sell_price_min < ex.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });

          if (!priceByCity.has(p.item_id)) priceByCity.set(p.item_id, new Map());
          priceByCity.get(p.item_id)!.set(p.city, p.sell_price_min);
        }
      }

      // Outlier-filtered best sell (ignores single overpriced listings)
      for (const [itemId, cityPrices] of priceByCity.entries()) {
        const entries = [...cityPrices.entries()]
          .filter(([city]) => city !== 'Black Market' && city !== 'Caerleon')
          .map(([city, price]) => ({ city, price }));
        if (entries.length === 0) continue;
        const sorted = [...entries].sort((a, b) => a.price - b.price);
        const median = sorted[Math.floor(sorted.length / 2)].price;
        const filtered = entries.filter(e => e.price <= median * 2);
        if (filtered.length === 0) continue;
        filtered.sort((a, b) => b.price - a.price);
        bestSell.set(itemId, filtered[0]);
      }

      const cityBonuses = COOKING_CITY_BONUS[cookCity] || [];
      const out: CookingResult[] = [];

      for (const recipe of recipesToScan) {
        const sell = bestSell.get(recipe.mealId);
        if (!sell) continue;

        const ingDetails: CookingResult['ingredients'] = [];
        let totalCost = 0;
        let missing = false;

        for (const ing of recipe.ingredients) {
          const info = cheapest.get(ing.itemId);
          if (!info) { missing = true; break; }
          const totalPrice = info.price * ing.count;
          totalCost += totalPrice;
          ingDetails.push({
            itemId: ing.itemId, name: ing.name, count: ing.count,
            unitPrice: info.price, totalPrice, city: info.city,
          });
        }

        if (missing || totalCost === 0) continue;

        // Return rate
        const cityBonus = cityBonuses.includes(recipe.category);
        let rr = BASE_RR;
        if (cityBonus) rr = CITY_BONUS_RR;
        if (useFocus) rr = FOCUS_RR;

        const effectiveCost = totalCost * (1 - rr);
        const sellAfterTax = sell.price * (1 - TAX_RATE);
        const profit = sellAfterTax - effectiveCost;
        const margin = sellAfterTax > 0 ? (profit / sellAfterTax) * 100 : 0;

        out.push({
          mealId: recipe.mealId,
          mealName: recipe.mealName,
          category: recipe.category,
          tier: recipe.tier,
          ingredients: ingDetails,
          totalCost,
          effectiveCost,
          sellPrice: sell.price,
          sellCity: sell.city,
          profit,
          margin,
          returnRate: rr,
          cityBonus,
        });
      }

      out.sort((a, b) => b.profit - a.profit);
      setResults(out);
      setScannedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Cooking scan failed:', err);
    } finally {
      setScanning(false);
    }
  }, [cookCity, useFocus, category]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent rounded-xl border border-orange-500/20 px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-xs text-zinc-400">
          <div className="text-zinc-200 font-semibold mb-0.5">Cooking Profit Calculator</div>
          Scans all meal recipes, picks cheapest ingredients and best sell market. Calculates profit with return rate, 6.5% premium tax, and city cooking bonus.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Cooking City</label>
            <select
              value={cookCity}
              onChange={(e) => setCookCity(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="all">All Meals</option>
              {COOKING_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-orange-500" />
            <span className="text-sm text-zinc-200">Use Focus <span className="text-[10px] text-zinc-500">(47.5% RR)</span></span>
          </label>

          {COOKING_CITY_BONUS[cookCity]?.length > 0 && (
            <span className="text-xs px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
              ★ Bonus: {COOKING_CITY_BONUS[cookCity].join(', ')}
            </span>
          )}

          <button
            onClick={scan}
            disabled={scanning}
            className="ml-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 disabled:opacity-50 transition-colors"
          >
            {scanning ? 'Scanning...' : 'Scan All Recipes'}
          </button>
        </div>
      </div>

      {scannedAt && (
        <div className="text-[10px] text-zinc-600 text-right px-1">Scanned at {scannedAt}</div>
      )}

      {/* Results as cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map(r => {
            const profitColor = r.profit > 0 ? 'text-green-400' : 'text-red-400';
            const profitBg = r.profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
            return (
              <div key={r.mealId} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ItemIcon itemId={r.mealId} size={40} />
                    <div>
                      <div className="text-sm font-bold text-zinc-200">{r.mealName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-gold">T{r.tier}</span>
                        <span className="text-[10px] text-zinc-500">· {r.category}</span>
                        {r.cityBonus && <span className="text-[10px] text-green-400">★ Bonus</span>}
                      </div>
                    </div>
                  </div>
                  <div className={`text-right px-2 py-1 rounded-lg border ${profitBg}`}>
                    <div className={`text-sm font-bold ${profitColor}`}>
                      {r.profit >= 0 ? '+' : ''}{formatSilver(r.profit)}
                    </div>
                    <div className={`text-[10px] ${profitColor}`}>{formatPercent(r.margin)}</div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="px-4 py-3 space-y-1.5 border-b border-zinc-800">
                  {r.ingredients.map(ing => (
                    <div key={ing.itemId} className="flex items-center gap-2 text-xs">
                      <ItemIcon itemId={ing.itemId} size={22} />
                      <span className="text-zinc-400 flex-1 truncate">{ing.name} <span className="text-zinc-600">x{ing.count}</span></span>
                      <span className="text-[10px] text-zinc-600">{ing.city.substring(0, 5)}</span>
                      <span className="text-zinc-300 tabular-nums">{formatSilver(ing.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="px-4 py-3 space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Raw cost</span>
                    <span className="tabular-nums">{formatSilver(r.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>After return ({formatPercent(r.returnRate * 100)})</span>
                    <span className="tabular-nums">{formatSilver(r.effectiveCost)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Sell @ {r.sellCity}</span>
                    <span className="tabular-nums font-semibold">{formatSilver(r.sellPrice)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!scanning && results.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#127858;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Cooking Calculator</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">Click <strong className="text-gold">Scan All Recipes</strong> to fetch live ingredient and meal prices. Results are sorted by profit and show a clean breakdown of each recipe.</p>
        </div>
      )}

      {scanning && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          Fetching prices for all cooking recipes...
        </div>
      )}

      {!scanning && scannedAt && results.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No profitable recipes found. Try a different city or category.
        </div>
      )}
    </div>
  );
}
