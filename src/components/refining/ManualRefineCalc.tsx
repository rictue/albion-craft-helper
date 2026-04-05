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

interface Pass {
  pass: number;
  crafts: number;
  outputs: number;
  rawConsumed: number;
  prevConsumed: number;
  rawReturned: number;
  prevReturned: number;
}

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
  initialRaw: number;
  initialPrev: number;
  totalCrafts: number;
  totalOutput: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  passes: Pass[];
  stoppedBecause: string;
  leftoverRaw: number;
  leftoverPrev: number;
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

    // EXPLICIT REINVEST SIMULATION
    // User starts with `rawCount` raws + matching prev planks.
    // Each pass: do as many crafts as possible with current stockpile,
    // then add the proportional returned materials, loop until materials
    // run out for one of the two inputs.
    const rawPerCraft = recipe.rawPerCraft;
    const prevPerCraft = recipe.prevPerCraft;

    // Initial prev count matches max crafts the user would want to do
    // with their raws (assume they bought exactly enough prev planks).
    const initialCrafts = Math.floor(rawCount / rawPerCraft);
    let raw = initialCrafts * rawPerCraft;
    let prev = initialCrafts * prevPerCraft;
    const initialRaw = raw;
    const initialPrev = prev;

    let totalCrafts = 0;
    let totalOutput = 0;
    const passes: Pass[] = [];
    let stoppedBecause = 'out of materials';

    for (let passNum = 1; passNum <= 40; passNum++) {
      const craftsFromRaw = Math.floor(raw / rawPerCraft);
      const craftsFromPrev = prevPerCraft > 0 ? Math.floor(prev / prevPerCraft) : Infinity;
      const crafts = Math.min(craftsFromRaw, craftsFromPrev);
      if (crafts <= 0) {
        if (craftsFromRaw < craftsFromPrev) stoppedBecause = 'raw material ran out';
        else if (craftsFromPrev < craftsFromRaw) stoppedBecause = 'previous-tier material ran out';
        break;
      }

      const rawConsumed = crafts * rawPerCraft;
      const prevConsumed = crafts * prevPerCraft;
      // Each resource independently rolls return at RR%. Use expected value.
      const rawReturned = rawConsumed * rr;
      const prevReturned = prevConsumed * rr;

      raw = raw - rawConsumed + rawReturned;
      prev = prev - prevConsumed + prevReturned;

      totalCrafts += crafts;
      totalOutput += crafts;

      passes.push({
        pass: passNum,
        crafts,
        outputs: crafts,
        rawConsumed,
        prevConsumed,
        rawReturned,
        prevReturned,
      });

      if (crafts < 1) break;
    }

    const leftoverRaw = raw;
    const leftoverPrev = prev;

    const rawCost = initialRaw * cheapRaw.price;
    const prevCost = recipe.prevRefinedId ? initialPrev * (cheapPrev?.price || 0) : 0;
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
      rawPerCraft, prevPerCraft,
      cheapRaw: cheapRaw.price,
      cheapRawCity: cheapRaw.city,
      cheapPrev: cheapPrev?.price || 0,
      bestSell: bestSell.price,
      bestSellCity: bestSell.city,
      returnRate: rr,
      initialRaw, initialPrev,
      totalCrafts,
      totalOutput,
      totalCost,
      totalRevenue,
      profit,
      passes,
      stoppedBecause,
      leftoverRaw,
      leftoverPrev,
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
                  <div className="text-[10px] text-zinc-500">T{result.tier}{result.enchant > 0 && `.${result.enchant}`} · {formatPercent(result.returnRate * 100)} RR · {result.passes.length} passes · {result.totalCrafts} crafts</div>
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
                <div className="text-[10px] uppercase text-zinc-600">Upfront buy</div>
                <div className="text-zinc-300 font-semibold tabular-nums">{formatSilver(result.totalCost)}</div>
                <div className="text-[10px] text-zinc-600">
                  {result.initialRaw} raw × {formatSilver(result.cheapRaw)} @ {result.cheapRawCity}
                  {result.prevPerCraft > 0 && ` + ${result.initialPrev} prev × ${formatSilver(result.cheapPrev)}`}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2">
                <div className="text-[10px] uppercase text-zinc-600">Total output</div>
                <div className="text-zinc-300 font-semibold tabular-nums">{result.totalOutput} planks</div>
                <div className="text-[10px] text-zinc-600">after {result.passes.length} reinvest passes</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2 col-span-2">
                <div className="text-[10px] uppercase text-zinc-600">Revenue @ {result.bestSellCity}</div>
                <div className="text-green-400 font-semibold tabular-nums">{formatSilver(result.totalRevenue)}</div>
                <div className="text-[10px] text-zinc-600">{formatSilver(result.bestSell)} × {result.totalOutput} outputs</div>
              </div>
            </div>

            {/* Pass-by-pass breakdown */}
            <details className="bg-zinc-900 border border-zinc-800 rounded">
              <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300">
                Reinvest loop breakdown ({result.passes.length} passes)
              </summary>
              <div className="px-3 pb-3">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-zinc-600 border-b border-zinc-800">
                      <th className="text-left py-1">Pass</th>
                      <th className="text-right py-1">Crafts</th>
                      <th className="text-right py-1">Raws used</th>
                      <th className="text-right py-1">Prev used</th>
                      <th className="text-right py-1">Raws ret.</th>
                      <th className="text-right py-1">Prev ret.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.passes.map(p => (
                      <tr key={p.pass} className="border-b border-zinc-800/50">
                        <td className="py-1 text-zinc-400">#{p.pass}</td>
                        <td className="py-1 text-right text-zinc-300 tabular-nums">{p.crafts}</td>
                        <td className="py-1 text-right text-zinc-500 tabular-nums">{Math.round(p.rawConsumed)}</td>
                        <td className="py-1 text-right text-zinc-500 tabular-nums">{Math.round(p.prevConsumed)}</td>
                        <td className="py-1 text-right text-cyan-400 tabular-nums">+{Math.round(p.rawReturned)}</td>
                        <td className="py-1 text-right text-cyan-400 tabular-nums">+{Math.round(p.prevReturned)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-[10px] text-zinc-600 mt-2">
                  Stopped: <span className="text-amber-400">{result.stoppedBecause}</span> · Leftover: {result.leftoverRaw.toFixed(1)} raw, {result.leftoverPrev.toFixed(1)} prev
                </div>
              </div>
            </details>

            <div className="text-[10px] text-amber-400/70 italic">
              Returns use expected values — actual runs will vary ±20–30% due to RNG. Run 30+ cycles for convergence.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
