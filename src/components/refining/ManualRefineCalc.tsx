import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { lpbToReturnRate } from '../../utils/returnRate';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';

const BASE_LPB = 18;
const CITY_LPB = 40;
const FOCUS_LPB = 59;

interface Result {
  rawId: string;
  refinedId: string;
  prevRefinedId: string;
  rawName: string;
  refinedName: string;
  tier: number;
  enchant: number;
  rawPerCraft: number;
  prevPerCraft: number;
  cheapRaw: number; cheapRawCity: string;
  cheapPrev: number;
  bestSell: number; bestSellCity: string;
  returnRate: number;
  crafts: number;
  totalOutput: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
}

export default function ManualRefineCalc() {
  const [resource, setResource] = useState('wood');
  const [tier, setTier] = useState(6);
  const [enchant, setEnchant] = useState(0);
  const [rawCount, setRawCount] = useState(600);
  const [city, setCity] = useState('Fort Sterling');
  const [useFocus, setUseFocus] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    setResult(null);

    const rt = RESOURCE_TYPES.find(r => r.id === resource);
    if (!rt) { setLoading(false); return; }
    const recipe = rt.recipes.find(r => r.tier === tier && r.enchant === enchant);
    if (!recipe) { setLoading(false); return; }

    const ids = [recipe.rawId, recipe.refinedId];
    if (recipe.prevRefinedId) ids.push(recipe.prevRefinedId);

    const prices = await fetchPrices(ids);

    const cheapest = new Map<string, { price: number; city: string }>();
    const byCity = new Map<string, Array<{ price: number; city: string }>>();
    for (const p of prices) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const cur = cheapest.get(p.item_id);
      if (!cur || p.sell_price_min < cur.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });
      if (!byCity.has(p.item_id)) byCity.set(p.item_id, []);
      byCity.get(p.item_id)!.push({ price: p.sell_price_min, city: p.city });
    }

    // Outlier-filtered max for sell
    let bestSell = { price: 0, city: '' };
    const refinedList = byCity.get(recipe.refinedId) || [];
    if (refinedList.length > 0) {
      const sorted = [...refinedList].sort((a, b) => a.price - b.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      const filtered = refinedList.filter(e => e.price <= median * 2);
      if (filtered.length > 0) {
        filtered.sort((a, b) => b.price - a.price);
        bestSell = filtered[0];
      }
    }

    const cheapRaw = cheapest.get(recipe.rawId);
    const cheapPrev = recipe.prevRefinedId ? cheapest.get(recipe.prevRefinedId) : undefined;

    if (!cheapRaw || bestSell.price === 0) {
      setLoading(false);
      return;
    }

    // LPB calculation
    let lpb = BASE_LPB;
    const cityBonus = CITY_REFINE_BONUS[city] || [];
    if (cityBonus.includes(resource)) lpb += CITY_LPB;
    if (useFocus) lpb += FOCUS_LPB;
    const rr = lpbToReturnRate(lpb);

    // Crafts the user can run with their raw count
    const crafts = Math.floor(rawCount / recipe.rawPerCraft);
    // Reinvest model: total output per craft = 1 / (1 - RR)
    const outputMult = rr < 1 ? 1 / (1 - rr) : 1;
    const totalOutput = crafts * outputMult;

    const rawCost = crafts * recipe.rawPerCraft * cheapRaw.price;
    const prevCost = recipe.prevRefinedId ? crafts * recipe.prevPerCraft * (cheapPrev?.price || 0) : 0;
    const totalCost = rawCost + prevCost;
    const totalRevenue = totalOutput * bestSell.price;
    const profit = totalRevenue - totalCost;

    setResult({
      rawId: recipe.rawId,
      refinedId: recipe.refinedId,
      prevRefinedId: recipe.prevRefinedId,
      rawName: recipe.rawName,
      refinedName: recipe.refinedName,
      tier, enchant,
      rawPerCraft: recipe.rawPerCraft,
      prevPerCraft: recipe.prevPerCraft,
      cheapRaw: cheapRaw.price,
      cheapRawCity: cheapRaw.city,
      cheapPrev: cheapPrev?.price || 0,
      bestSell: bestSell.price,
      bestSellCity: bestSell.city,
      returnRate: rr,
      crafts,
      totalOutput,
      totalCost,
      totalRevenue,
      profit,
    });
    setLoading(false);
  }, [resource, tier, enchant, rawCount, city, useFocus]);

  const bonusActive = (CITY_REFINE_BONUS[city] || []).includes(resource);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Manual Calculator</h3>
          <div className="text-[10px] text-zinc-600">Pick exactly what you want to refine and see expected profit</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Resource</label>
            <select value={resource} onChange={(e) => setResource(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
              {RESOURCE_TYPES.map(rt => (<option key={rt.id} value={rt.id}>{rt.name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Tier</label>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8].map(t => (
                <button key={t} onClick={() => setTier(t)} className={`w-10 h-9 rounded text-xs font-bold ${tier === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-500'}`}>T{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Enchant</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(e => (
                <button key={e} onClick={() => setEnchant(e)} className={`w-9 h-9 rounded text-xs font-bold ${enchant === e ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-500'}`}>.{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Raw Count</label>
            <input type="number" min={0} value={rawCount} onChange={(e) => setRawCount(parseInt(e.target.value) || 0)} className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-purple-500" />
            <span className="text-sm text-zinc-200">Focus</span>
          </label>
          {bonusActive && <span className="text-[10px] px-2 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">★ City Bonus</span>}
          <button onClick={calculate} disabled={loading} className="ml-auto px-6 py-2 rounded-lg text-sm font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 disabled:opacity-50">
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>

        {result && (
          <div className="mt-2 bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ItemIcon itemId={result.refinedId} size={40} />
                <div>
                  <div className="text-sm font-bold text-zinc-200">{result.refinedName}</div>
                  <div className="text-[10px] text-zinc-500">T{result.tier}{result.enchant > 0 && `.${result.enchant}`} · {formatPercent(result.returnRate * 100)} RR · {result.crafts} crafts</div>
                </div>
              </div>
              <div className={`text-right px-3 py-1.5 rounded-lg border ${result.profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className={`text-lg font-bold ${result.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.profit > 0 ? '+' : ''}{formatSilver(result.profit)}
                </div>
                <div className={`text-[10px] ${result.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent((result.profit / Math.max(1, result.totalCost)) * 100)} ROI
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2">
                <div className="text-[10px] uppercase text-zinc-600">Upfront cost</div>
                <div className="text-zinc-300 font-semibold tabular-nums">{formatSilver(result.totalCost)}</div>
                <div className="text-[10px] text-zinc-600">
                  {result.crafts * result.rawPerCraft} raw × {formatSilver(result.cheapRaw)} @ {result.cheapRawCity}
                  {result.prevPerCraft > 0 && ` + ${result.crafts * result.prevPerCraft} prev × ${formatSilver(result.cheapPrev)}`}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2">
                <div className="text-[10px] uppercase text-zinc-600">Output w/ reinvest</div>
                <div className="text-zinc-300 font-semibold tabular-nums">{Math.floor(result.totalOutput)} planks</div>
                <div className="text-[10px] text-zinc-600">×{(result.totalOutput / Math.max(1, result.crafts)).toFixed(2)} multiplier</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2 col-span-2">
                <div className="text-[10px] uppercase text-zinc-600">Revenue @ {result.bestSellCity}</div>
                <div className="text-green-400 font-semibold tabular-nums">{formatSilver(result.totalRevenue)}</div>
                <div className="text-[10px] text-zinc-600">{formatSilver(result.bestSell)} × {Math.floor(result.totalOutput)} outputs</div>
              </div>
            </div>

            <div className="text-[10px] text-amber-400/70 italic">
              Expected value — single runs vary ±20–30% from average due to RNG. Run 30+ cycles for convergence.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
