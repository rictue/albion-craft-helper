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
  const [customRawPrice, setCustomRawPrice] = useState<number | null>(null);
  const [customPrevPrice, setCustomPrevPrice] = useState<number | null>(null);
  const [customSellPrice, setCustomSellPrice] = useState<number | null>(null);
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

    const finalRawPrice = customRawPrice ?? cheapRaw?.price ?? 0;
    const finalRawCity = customRawPrice ? 'Custom' : (cheapRaw?.city || '');
    const finalPrevPrice = customPrevPrice ?? cheapPrev?.price ?? 0;
    const finalSellPrice = customSellPrice ?? bestSell.price;
    const finalSellCity = customSellPrice ? 'Custom' : bestSell.city;

    if (finalRawPrice === 0 || finalSellPrice === 0) {
      setLoading(false);
      return;
    }

    let lpb = BASE_LPB;
    const cityBonusList = CITY_REFINE_BONUS[city] || [];
    if (cityBonusList.includes(resource)) lpb += CITY_LPB;
    if (useFocus) lpb += FOCUS_LPB;
    const rr = lpbToReturnRate(lpb);

    const rawPerCraft = recipe.rawPerCraft;
    const prevPerCraft = recipe.prevPerCraft;

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
      const rawReturned = rawConsumed * rr;
      const prevReturned = prevConsumed * rr;

      raw = raw - rawConsumed + rawReturned;
      prev = prev - prevConsumed + prevReturned;

      totalCrafts += crafts;
      totalOutput += crafts;

      passes.push({ pass: passNum, crafts, outputs: crafts, rawConsumed, prevConsumed, rawReturned, prevReturned });
      if (crafts < 1) break;
    }

    const leftoverRaw = raw;
    const leftoverPrev = prev;

    const rawCost = initialRaw * finalRawPrice;
    const prevCost = recipe.prevRefinedId ? initialPrev * finalPrevPrice : 0;
    const totalCost = rawCost + prevCost;
    const totalRevenue = totalOutput * finalSellPrice;
    const profit = totalRevenue - totalCost;

    setResult({
      rawId: recipe.rawId, refinedId: recipe.refinedId, prevRefinedId: recipe.prevRefinedId,
      rawName: recipe.rawName, refinedName: recipe.refinedName, tier, enchant,
      rawPerCraft, prevPerCraft,
      cheapRaw: finalRawPrice, cheapRawCity: finalRawCity,
      cheapPrev: finalPrevPrice,
      bestSell: finalSellPrice, bestSellCity: finalSellCity,
      returnRate: rr, initialRaw, initialPrev, totalCrafts, totalOutput,
      totalCost, totalRevenue, profit, passes, stoppedBecause, leftoverRaw, leftoverPrev,
    });
    setLoading(false);
  }, [resource, tier, enchant, rawCount, city, useFocus, customRawPrice, customPrevPrice, customSellPrice]);

  const bonusActive = (CITY_REFINE_BONUS[city] || []).includes(resource);

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-purple-500/5 to-transparent">
        <h3 className="text-sm font-bold text-purple-400 tracking-wide">Manual Refine Calculator</h3>
        <div className="text-[11px] text-zinc-500 mt-0.5">Full reinvest loop simulation with your exact prices</div>
      </div>

      <div className="p-6 space-y-5">
        {/* Row 1: Resource + Tier + Enchant */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Resource</label>
            <select value={resource} onChange={(e) => setResource(e.target.value)} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
              {RESOURCE_TYPES.map(rt => (<option key={rt.id} value={rt.id}>{rt.name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Tier</label>
            <div className="flex gap-1.5">
              {[4, 5, 6, 7, 8].map(t => (
                <button key={t} onClick={() => setTier(t)} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${tier === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10' : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800'}`}>
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Enchant</label>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map(e => (
                <button key={e} onClick={() => setEnchant(e)} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${enchant === e ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10' : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800'}`}>
                  .{e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Raw Count + City + Focus */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Raw Count</label>
            <input type="number" min={0} value={rawCount} onChange={(e) => setRawCount(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all">
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-2.5 hover:bg-zinc-800 transition-all w-full">
              <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-purple-500 w-4 h-4" />
              <span className="text-sm text-zinc-200">Focus</span>
            </label>
          </div>
          <div className="flex items-end">
            {bonusActive ? (
              <div className="w-full flex items-center justify-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
                <span className="text-green-400 text-sm font-semibold">★ City Bonus</span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 bg-zinc-800/30 border border-zinc-800 rounded-xl px-4 py-2.5">
                <span className="text-zinc-600 text-sm">No Bonus</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Custom prices */}
        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-3">
            Custom Prices <span className="normal-case text-zinc-700 font-normal">— leave empty to auto-fetch market prices</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1.5">Raw (per 1)</label>
              <input type="number" min={0} placeholder="Auto" value={customRawPrice ?? ''} onChange={(e) => setCustomRawPrice(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder-zinc-600 transition-all" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1.5">Prev Plank (per 1)</label>
              <input type="number" min={0} placeholder="Auto" value={customPrevPrice ?? ''} onChange={(e) => setCustomPrevPrice(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder-zinc-600 transition-all" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1.5">Sell (per 1)</label>
              <input type="number" min={0} placeholder="Auto" value={customSellPrice ?? ''} onChange={(e) => setCustomSellPrice(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder-zinc-600 transition-all" />
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <button onClick={calculate} disabled={loading} className="w-full py-3 rounded-xl text-sm font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 disabled:opacity-50 transition-all">
          {loading ? 'Calculating...' : 'Calculate Profit'}
        </button>

        {/* Result */}
        {result && (
          <div className="space-y-4 pt-2">
            {/* Header + Profit badge */}
            <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 rounded-xl px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <ItemIcon itemId={result.refinedId} size={48} />
                </div>
                <div>
                  <div className="text-base font-bold text-zinc-100">{result.refinedName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">T{result.tier}{result.enchant > 0 && `.${result.enchant}`}</span>
                    <span className="text-[10px] text-zinc-500">{formatPercent(result.returnRate * 100)} RR</span>
                    <span className="text-[10px] text-zinc-600">·</span>
                    <span className="text-[10px] text-zinc-500">{result.passes.length} passes</span>
                    <span className="text-[10px] text-zinc-600">·</span>
                    <span className="text-[10px] text-zinc-500">{result.totalCrafts} total crafts</span>
                  </div>
                </div>
              </div>
              <div className={`text-right px-4 py-2.5 rounded-xl border ${result.profit > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className={`text-xl font-black tabular-nums ${result.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.profit > 0 ? '+' : ''}{formatSilver(result.profit)}
                </div>
                <div className={`text-[10px] font-semibold ${result.profit > 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                  {formatPercent((result.profit / Math.max(1, result.totalCost)) * 100)} ROI
                </div>
              </div>
            </div>

            {/* 3-column stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                <div className="text-[9px] uppercase tracking-widest text-red-400/60 font-semibold">Buy</div>
                <div className="text-lg font-black text-zinc-100 mt-1 tabular-nums">{formatSilver(result.totalCost)}</div>
                <div className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                  {result.initialRaw} raw × {formatSilver(result.cheapRaw)}
                  {result.cheapRawCity !== 'Custom' && <span className="text-zinc-700"> ({result.cheapRawCity})</span>}
                </div>
                {result.prevPerCraft > 0 && (
                  <div className="text-[10px] text-zinc-600 leading-relaxed">
                    {result.initialPrev} prev × {formatSilver(result.cheapPrev)}
                  </div>
                )}
                <div className="text-[9px] text-zinc-700 mt-1">
                  Per craft: {result.rawPerCraft} raw + {result.prevPerCraft > 0 ? `${result.prevPerCraft} prev` : 'no prev'} → {Math.floor(result.initialRaw / result.rawPerCraft)} crafts
                </div>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                <div className="text-[9px] uppercase tracking-widest text-cyan-400/60 font-semibold">Output</div>
                <div className="text-lg font-black text-cyan-400 mt-1 tabular-nums">{result.totalOutput} <span className="text-sm text-zinc-500 font-normal">planks</span></div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  ×{(result.totalOutput / Math.max(1, Math.floor(rawCount / result.rawPerCraft))).toFixed(2)} multiplier
                </div>
                <div className="text-[10px] text-zinc-700">
                  {result.passes.length} reinvest passes
                </div>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                <div className="text-[9px] uppercase tracking-widest text-green-400/60 font-semibold">Sell</div>
                <div className="text-lg font-black text-green-400 mt-1 tabular-nums">{formatSilver(result.totalRevenue)}</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {result.totalOutput} × {formatSilver(result.bestSell)}
                  {result.bestSellCity !== 'Custom' && <span className="text-zinc-700"> ({result.bestSellCity})</span>}
                </div>
              </div>
            </div>

            {/* Reinvest loop breakdown */}
            <details className="bg-zinc-950/40 border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="cursor-pointer px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 font-semibold transition-colors">
                Reinvest Loop · {result.passes.length} passes · {result.totalCrafts} crafts
              </summary>
              <div className="px-5 pb-4 pt-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-zinc-600 border-b border-zinc-800">
                        <th className="text-left py-1.5 pr-3">Pass</th>
                        <th className="text-right py-1.5 px-3">Crafts</th>
                        <th className="text-right py-1.5 px-3">Raw used</th>
                        <th className="text-right py-1.5 px-3">Prev used</th>
                        <th className="text-right py-1.5 px-3">Raw returned</th>
                        <th className="text-right py-1.5 px-3">Prev returned</th>
                        <th className="text-right py-1.5 pl-3">Cumulative output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let cumOutput = 0;
                        return result.passes.map(p => {
                          cumOutput += p.crafts;
                          return (
                            <tr key={p.pass} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                              <td className="py-1.5 pr-3 text-zinc-400 font-semibold">#{p.pass}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-200 tabular-nums font-semibold">{p.crafts}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-500 tabular-nums">{Math.round(p.rawConsumed)}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-500 tabular-nums">{Math.round(p.prevConsumed)}</td>
                              <td className="py-1.5 px-3 text-right text-cyan-400/80 tabular-nums">+{Math.round(p.rawReturned)}</td>
                              <td className="py-1.5 px-3 text-right text-cyan-400/80 tabular-nums">+{Math.round(p.prevReturned)}</td>
                              <td className="py-1.5 pl-3 text-right text-gold tabular-nums font-semibold">{cumOutput}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800 text-[10px]">
                  <span className="text-zinc-600">Stopped:</span>
                  <span className="text-amber-400 font-medium">{result.stoppedBecause}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-zinc-600">Leftover: <span className="text-zinc-400">{result.leftoverRaw.toFixed(1)} raw, {result.leftoverPrev.toFixed(1)} prev</span></span>
                </div>
              </div>
            </details>

            {/* RNG warning */}
            <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500/50 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-[11px] text-zinc-500">
                <span className="text-amber-400/70 font-medium">Expected values</span> — actual results vary ±20-30% due to RNG. Run 30+ cycles for the average to converge.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
