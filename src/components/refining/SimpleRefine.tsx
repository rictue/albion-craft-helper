import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPrices, clearPriceCache } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { lpbToReturnRate } from '../../utils/returnRate';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import { getRefineSpec, setRefineSpec } from '../../data/specs';
import ItemIcon from '../common/ItemIcon';

const BASE_LPB = 18;
const CITY_LPB = 40;
const FOCUS_LPB = 59;
const TAX_RATE = 0.065; // Premium

// Base focus cost per tier (from game data)
const BASE_FOCUS: Record<number, number> = {
  2: 6, 3: 18, 4: 48, 5: 101, 6: 201, 7: 402, 8: 604,
};


interface CityPriceData {
  raw: Map<string, number>; // city → price
  prev: Map<string, number>;
  refined: Map<string, number>;
  rawDate: string;
  prevDate: string;
  refinedDate: string;
}

type SellMode = 'market' | 'discord';

export default function SimpleRefine() {
  const [resource, setResource] = useState('wood');
  const [tier, setTier] = useState(6);
  const [enchant, setEnchant] = useState(1);
  const [rawCount, setRawCount] = useState(5000);
  const [buyCity] = useState('auto');
  const [refineCity, setRefineCity] = useState('Fort Sterling');
  const [sellCity] = useState('auto');
  const [sellMode, setSellMode] = useState<SellMode>('market');
  const [useFocus, setUseFocus] = useState(false);
  const [focusBudget, setFocusBudget] = useState(30000);
  const [premium, setPremium] = useState(true);
  const [customRaw, setCustomRaw] = useState<number | null>(null);
  const [customPrev, setCustomPrev] = useState<number | null>(null);
  const [customSell, setCustomSell] = useState<number | null>(null);
  const [feePerCraft, setFeePerCraft] = useState(300);
  const [prices, setPrices] = useState<CityPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);

  // Get current recipe
  const recipe = useMemo(() => {
    const rt = RESOURCE_TYPES.find(r => r.id === resource);
    if (!rt) return null;
    return rt.recipes.find(r => r.tier === tier && r.enchant === enchant) || null;
  }, [resource, tier, enchant]);

  // Spec for current tier/resource
  const specLevel = useMemo(() => {
    if (!recipe) return 0;
    const rt = RESOURCE_TYPES.find(r => r.id === resource);
    return rt ? getRefineSpec(rt.refinedPrefix, tier) : 0;
  }, [resource, tier, recipe]);

  const [specInput, setSpecInput] = useState(specLevel);
  useEffect(() => { setSpecInput(specLevel); }, [specLevel]);

  const updateSpec = (val: number) => {
    const v = Math.max(0, Math.min(100, val));
    setSpecInput(v);
    const rt = RESOURCE_TYPES.find(r => r.id === resource);
    if (rt) setRefineSpec(rt.refinedPrefix, tier, v);
  };

  // Fetch function (shared by auto + manual + live)
  const doFetch = useCallback(async (force: boolean = false): Promise<void> => {
    if (!recipe) return;
    setLoading(true);
    if (force) clearPriceCache();
    const ids = [recipe.rawId, recipe.refinedId];
    if (recipe.prevRefinedId) ids.push(recipe.prevRefinedId);
    const data = await fetchPrices(ids, undefined, false, force);

    const rawMap = new Map<string, number>();
    const prevMap = new Map<string, number>();
    const refinedMap = new Map<string, number>();
    let rawDate = '', prevDate = '', refinedDate = '';

    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      if (p.item_id === recipe.rawId) {
        rawMap.set(p.city, p.sell_price_min);
        if (!rawDate || p.sell_price_min_date > rawDate) rawDate = p.sell_price_min_date;
      }
      if (recipe.prevRefinedId && p.item_id === recipe.prevRefinedId) {
        prevMap.set(p.city, p.sell_price_min);
        if (!prevDate || p.sell_price_min_date > prevDate) prevDate = p.sell_price_min_date;
      }
      if (p.item_id === recipe.refinedId) {
        refinedMap.set(p.city, p.sell_price_min);
        if (!refinedDate || p.sell_price_min_date > refinedDate) refinedDate = p.sell_price_min_date;
      }
    }

    setPrices({ raw: rawMap, prev: prevMap, refined: refinedMap, rawDate, prevDate, refinedDate });
    setLastFetchAt(Date.now());
    setLoading(false);
  }, [recipe]);

  // Auto-fetch on config change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await doFetch(false);
    })();
    return () => { cancelled = true; };
  }, [doFetch]);

  // LIVE MODE: poll every 15 seconds with force refresh
  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(() => {
      doFetch(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [liveMode, doFetch]);

  // Clear custom overrides when config changes
  useEffect(() => {
    setCustomRaw(null);
    setCustomPrev(null);
    setCustomSell(null);
  }, [resource, tier, enchant]);

  // Buy prices: default from refine city if available, otherwise cheapest
  const bestBuy = useMemo(() => {
    if (!prices) return null;
    // Prefer refine city price for both raw and prev
    const rawFromRefineCity = prices.raw.get(refineCity);
    const prevFromRefineCity = prices.prev.get(refineCity);

    // Fallback: cheapest across all cities
    let cheapestRaw = { city: '', price: Infinity };
    for (const [city, price] of prices.raw.entries()) {
      if (price < cheapestRaw.price) cheapestRaw = { city, price };
    }
    let cheapestPrev = { city: '', price: Infinity };
    for (const [city, price] of prices.prev.entries()) {
      if (price < cheapestPrev.price) cheapestPrev = { city, price };
    }

    return {
      raw: rawFromRefineCity != null
        ? { city: refineCity, price: rawFromRefineCity }
        : (cheapestRaw.price === Infinity ? null : cheapestRaw),
      prev: prevFromRefineCity != null
        ? { city: refineCity, price: prevFromRefineCity }
        : (cheapestPrev.price === Infinity ? null : cheapestPrev),
    };
  }, [prices, refineCity]);

  const bestSell = useMemo(() => {
    if (!prices || prices.refined.size === 0) return null;
    const entries = [...prices.refined.entries()].map(([city, price]) => ({ city, price }));
    // Outlier filter: 2x median
    const sorted = [...entries].sort((a, b) => a.price - b.price);
    const median = sorted[Math.floor(sorted.length / 2)].price;
    const filtered = entries.filter(e => e.price <= median * 2);
    if (filtered.length === 0) return null;
    filtered.sort((a, b) => b.price - a.price);
    return filtered[0];
  }, [prices]);

  // Resolved prices
  const rawPrice = customRaw ?? (buyCity === 'auto' ? bestBuy?.raw?.price ?? 0 : prices?.raw.get(buyCity) ?? 0);
  const rawPriceCity = customRaw ? 'Custom' : (buyCity === 'auto' ? bestBuy?.raw?.city ?? '' : buyCity);
  const prevPrice = customPrev ?? (buyCity === 'auto' ? bestBuy?.prev?.price ?? 0 : prices?.prev.get(buyCity) ?? 0);
  const sellPrice = customSell ?? (sellCity === 'auto' ? bestSell?.price ?? 0 : prices?.refined.get(sellCity) ?? 0);
  const sellPriceCity = customSell ? 'Custom' : (sellCity === 'auto' ? bestSell?.city ?? '' : sellCity);

  // LPB + RR: two variants for split focus/no-focus
  const cityBonusActive = (CITY_REFINE_BONUS[refineCity] || []).includes(resource);
  const lpbNoFocus = BASE_LPB + (cityBonusActive ? CITY_LPB : 0);
  const lpbFocus = lpbNoFocus + FOCUS_LPB;
  const rrNoFocus = lpbToReturnRate(lpbNoFocus);
  const rrFocus = lpbToReturnRate(lpbFocus);
  // Effective RR shown in UI (if focus used AND budget > 0, show focus rate; else no-focus)
  const lpb = useFocus ? lpbFocus : lpbNoFocus;
  const rr = useFocus ? rrFocus : rrNoFocus;

  // Focus cost per craft
  const focusCostPerCraft = useMemo(() => {
    if (!recipe) return 0;
    const base = BASE_FOCUS[tier] || 0;
    return Math.round(base * Math.pow(0.5, (specInput * 2.5) / 100));
  }, [tier, specInput, recipe]);

  // Split crafts into focus-eligible and no-focus segments based on budget
  const focusSplit = useMemo(() => {
    if (!recipe) return { focusCrafts: 0, noFocusCrafts: 0, usedFocus: 0 };
    const initialCrafts = Math.floor(rawCount / recipe.rawPerCraft);
    if (!useFocus || focusCostPerCraft <= 0) {
      return { focusCrafts: 0, noFocusCrafts: initialCrafts, usedFocus: 0 };
    }
    const maxFocusCrafts = Math.floor(focusBudget / focusCostPerCraft);
    const focusCrafts = Math.min(initialCrafts, maxFocusCrafts);
    const noFocusCrafts = initialCrafts - focusCrafts;
    const usedFocus = focusCrafts * focusCostPerCraft;
    return { focusCrafts, noFocusCrafts, usedFocus };
  }, [recipe, rawCount, useFocus, focusCostPerCraft, focusBudget]);

  // Reinvest loop simulation — runs two separate chains (focus + no-focus) and combines
  const simulation = useMemo(() => {
    if (!recipe) return null;
    const rawPerCraft = recipe.rawPerCraft;
    const prevPerCraft = recipe.prevPerCraft;

    function runChain(initialCrafts: number, rate: number) {
      if (initialCrafts <= 0) return { total: 0, passes: [] as Array<{ pass: number; crafts: number; rawUsed: number; prevUsed: number; rawBack: number; prevBack: number }>, leftoverRaw: 0, leftoverPrev: 0 };
      let raw = initialCrafts * rawPerCraft;
      let prev = initialCrafts * prevPerCraft;
      let total = 0;
      const passes: Array<{ pass: number; crafts: number; rawUsed: number; prevUsed: number; rawBack: number; prevBack: number }> = [];

      for (let pass = 1; pass <= 30; pass++) {
        const fromRaw = Math.floor(raw / rawPerCraft);
        const fromPrev = prevPerCraft > 0 ? Math.floor(prev / prevPerCraft) : Infinity;
        const crafts = Math.min(fromRaw, fromPrev);
        if (crafts <= 0) break;

        const rawUsed = crafts * rawPerCraft;
        const prevUsed = crafts * prevPerCraft;
        const rawBack = rawUsed * rate;
        const prevBack = prevUsed * rate;

        raw = raw - rawUsed + rawBack;
        prev = prev - prevUsed + prevBack;
        total += crafts;

        passes.push({ pass, crafts, rawUsed, prevUsed, rawBack, prevBack });
        if (crafts < 1) break;
      }

      return { total, passes, leftoverRaw: raw, leftoverPrev: prev };
    }

    const focusChain = runChain(focusSplit.focusCrafts, rrFocus);
    const noFocusChain = runChain(focusSplit.noFocusCrafts, rrNoFocus);

    const initialCrafts = focusSplit.focusCrafts + focusSplit.noFocusCrafts;
    const totalOutput = focusChain.total + noFocusChain.total;
    // Combine passes for breakdown (label focus vs no-focus)
    const passes = [
      ...focusChain.passes.map(p => ({ ...p, mode: 'focus' as const })),
      ...noFocusChain.passes.map(p => ({ ...p, mode: 'normal' as const })),
    ];

    return {
      initialCrafts,
      focusCrafts: focusSplit.focusCrafts,
      noFocusCrafts: focusSplit.noFocusCrafts,
      focusOutput: focusChain.total,
      noFocusOutput: noFocusChain.total,
      totalOutput,
      passes,
      leftoverRaw: focusChain.leftoverRaw + noFocusChain.leftoverRaw,
      leftoverPrev: focusChain.leftoverPrev + noFocusChain.leftoverPrev,
    };
  }, [recipe, focusSplit, rrFocus, rrNoFocus]);

  // Financial results
  const result = useMemo(() => {
    if (!recipe || !simulation || rawPrice === 0 || sellPrice === 0) return null;

    const initialRaw = simulation.initialCrafts * recipe.rawPerCraft;
    const initialPrev = simulation.initialCrafts * recipe.prevPerCraft;

    const rawCost = initialRaw * rawPrice;
    const prevCost = initialPrev * prevPrice;
    const feeTotal = simulation.initialCrafts * feePerCraft;
    const totalCost = rawCost + prevCost + feeTotal;

    // Sell revenue with mode-specific pricing
    let effectiveSellPrice = sellPrice;
    if (sellMode === 'discord') effectiveSellPrice = sellPrice * 0.95; // -5% discount, no tax
    else if (sellMode === 'market' && premium) effectiveSellPrice = sellPrice * (1 - TAX_RATE);
    else if (sellMode === 'market' && !premium) effectiveSellPrice = sellPrice * (1 - 0.105);

    const revenue = simulation.totalOutput * effectiveSellPrice;
    const profit = revenue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    const totalFocus = focusSplit.usedFocus;

    return {
      initialRaw, initialPrev,
      rawCost, prevCost, feeTotal, totalCost,
      effectiveSellPrice, revenue, profit, roi,
      totalFocus,
    };
  }, [recipe, simulation, rawPrice, prevPrice, sellPrice, feePerCraft, sellMode, premium, focusSplit]);

  // Stale price warning (>6h old)
  const priceAge = (dateStr: string): number => {
    if (!dateStr) return Infinity;
    const ageMs = Date.now() - new Date(dateStr).getTime();
    return ageMs / (1000 * 60 * 60); // hours
  };
  const staleWarning = prices && Math.max(
    priceAge(prices.rawDate),
    priceAge(prices.prevDate),
    priceAge(prices.refinedDate),
  ) > 6;

  if (!recipe) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-transparent rounded-xl border border-cyan-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">Refine Calculator</div>
        <div className="text-xs text-zinc-500">Buy cheapest → refine with bonus → sell highest. Auto-calc with reinvest loop.</div>
      </div>

      {/* Main config */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
        {/* Resource + Tier + Enchant */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Resource</label>
            <select value={resource} onChange={(e) => setResource(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
              {RESOURCE_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Tier</label>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8].map(t => (
                <button key={t} onClick={() => setTier(t)} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${tier === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}>
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Enchant</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(e => (
                <button key={e} onClick={() => setEnchant(e)} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${enchant === e ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}>
                  .{e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Raw count + Refine city + Spec + Focus */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Raw Logs</label>
            <input type="number" min={1} value={rawCount} onChange={(e) => setRawCount(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Refine City</label>
            <select value={refineCity} onChange={(e) => setRefineCity(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
              {CITIES.filter(c => c.id !== 'Black Market').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Your Spec</label>
            <input type="number" min={0} max={100} value={specInput} onChange={(e) => updateSpec(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Options</label>
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <label className="flex items-center justify-center gap-1.5 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-xs text-zinc-200 hover:bg-zinc-800/80">
                <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-cyan-500" />
                Focus
              </label>
              <label className="flex items-center justify-center gap-1.5 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-xs text-zinc-200 hover:bg-zinc-800/80">
                <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-cyan-500" />
                Premium
              </label>
            </div>
          </div>
        </div>

        {/* Focus budget row — only when focus enabled */}
        {useFocus && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-zinc-800/60">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Focus Budget</label>
              <input type="number" min={0} step={1000} value={focusBudget} onChange={(e) => setFocusBudget(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
              <div className="text-[9px] text-zinc-600 mt-1">Max focus you can spend (cap 30K daily)</div>
            </div>
            <div className="col-span-1 md:col-span-3 flex items-end">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-4 py-2.5 w-full">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Focus Split</div>
                <div className="text-xs text-zinc-300">
                  <span className="text-cyan-400 font-bold">{focusSplit.focusCrafts}</span> crafts with focus
                  <span className="text-zinc-600"> (RR {formatPercent(rrFocus * 100)})</span>
                  <span className="text-zinc-600 mx-2">·</span>
                  <span className="text-amber-400 font-bold">{focusSplit.noFocusCrafts}</span> crafts without
                  <span className="text-zinc-600"> (RR {formatPercent(rrNoFocus * 100)})</span>
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  Using <span className="text-cyan-400">{focusSplit.usedFocus.toLocaleString()}</span> / {focusBudget.toLocaleString()} focus
                  {focusSplit.noFocusCrafts > 0 && <span className="text-amber-400 ml-2">⚠ Budget exceeded, remainder runs without focus</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className={`px-3 py-1.5 rounded-lg border font-semibold ${cityBonusActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-zinc-800/50 border-zinc-800 text-zinc-500'}`}>
            {cityBonusActive ? '★ City Bonus' : 'No City Bonus'}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold">
            RR: {formatPercent(rr * 100)}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-800 text-zinc-400">
            LPB: {lpb}
          </div>
          {useFocus && (
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
              Focus/craft: {focusCostPerCraft}
            </div>
          )}
          {loading && <span className="text-[10px] text-zinc-500">Loading...</span>}
          {staleWarning && !liveMode && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
              ⚠ Prices &gt;6h old — open ADP Client + AH in-game
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {lastFetchAt && (
              <span className="text-[10px] text-zinc-600">
                Updated {Math.max(0, Math.floor((Date.now() - lastFetchAt) / 1000))}s ago
              </span>
            )}
            <button
              onClick={() => doFetch(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50 transition-colors"
              title="Force refresh prices from AODP"
            >
              ↻ Refresh
            </button>
            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${liveMode ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
              <input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} className="accent-green-500" />
              {liveMode && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              LIVE
            </label>
          </div>
        </div>
      </div>

      {/* Price inputs */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Prices</div>
            <div className="text-[10px] text-zinc-600">Auto-filled from market. Override to use your actual prices.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PriceInput
            label="Raw Price"
            itemId={recipe.rawId}
            auto={bestBuy?.raw?.price ?? 0}
            autoCity={bestBuy?.raw?.city ?? ''}
            value={customRaw}
            onChange={setCustomRaw}
            allCities={prices?.raw}
          />
          {recipe.prevPerCraft > 0 && (
            <PriceInput
              label="Prev Tier Price"
              itemId={recipe.prevRefinedId}
              auto={bestBuy?.prev?.price ?? 0}
              autoCity={bestBuy?.prev?.city ?? ''}
              value={customPrev}
              onChange={setCustomPrev}
              allCities={prices?.prev}
            />
          )}
          <PriceInput
            label="Sell Price"
            itemId={recipe.refinedId}
            auto={bestSell?.price ?? 0}
            autoCity={bestSell?.city ?? ''}
            value={customSell}
            onChange={setCustomSell}
            allCities={prices?.refined}
            accent="green"
          />
        </div>

        {/* Sell mode + fee */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Sell Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setSellMode('market')} className={`h-9 rounded-lg text-xs font-semibold transition-all ${sellMode === 'market' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Market ({premium ? '−6.5%' : '−10.5%'} tax)
              </button>
              <button onClick={() => setSellMode('discord')} className={`h-9 rounded-lg text-xs font-semibold transition-all ${sellMode === 'discord' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Discord (−5%)
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Station Fee / Craft</label>
            <input type="number" min={0} value={feePerCraft} onChange={(e) => setFeePerCraft(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </div>
        </div>
      </div>

      {/* Results */}
      {result && simulation && (
        <>
          {/* Big profit card */}
          <div className={`rounded-2xl border p-6 ${result.profit > 0 ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20' : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <ItemIcon itemId={recipe.refinedId} size={56} />
                </div>
                <div>
                  <div className="text-lg font-bold text-zinc-100">{recipe.refinedName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">T{tier}{enchant > 0 && `.${enchant}`}</span>
                    <span className="text-[11px] text-zinc-500">{simulation.totalOutput} planks</span>
                    <span className="text-[11px] text-zinc-600">·</span>
                    <span className="text-[11px] text-zinc-500">{simulation.passes.length} passes</span>
                    {useFocus && <span className="text-[11px] text-purple-400">· {result.totalFocus.toLocaleString()} focus</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-black tabular-nums ${result.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.profit > 0 ? '+' : ''}{formatSilver(result.profit)}
                </div>
                <div className={`text-sm font-semibold ${result.profit > 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
                  {formatPercent(result.roi)} ROI
                </div>
              </div>
            </div>
          </div>

          {/* 3-column breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="text-[10px] uppercase tracking-widest text-red-400/80 font-semibold">💰 Buy</div>
              <div className="text-xl font-black text-zinc-100 mt-1 tabular-nums">{formatSilver(result.rawCost + result.prevCost)}</div>
              <div className="text-[11px] text-zinc-500 mt-2 space-y-0.5">
                <div>{result.initialRaw} raw × {formatSilver(rawPrice)} {rawPriceCity && <span className="text-zinc-700">@ {rawPriceCity}</span>}</div>
                {result.initialPrev > 0 && (
                  <div>{result.initialPrev} prev × {formatSilver(prevPrice)}</div>
                )}
                <div className="text-zinc-700 text-[10px]">+ {formatSilver(result.feeTotal)} fees</div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-semibold">⚒ Refine</div>
              <div className="text-xl font-black text-cyan-400 mt-1 tabular-nums">{simulation.totalOutput} <span className="text-sm text-zinc-500 font-normal">planks</span></div>
              <div className="text-[11px] text-zinc-500 mt-2 space-y-0.5">
                <div>{simulation.initialCrafts} initial → ×{(simulation.totalOutput / Math.max(1, simulation.initialCrafts)).toFixed(2)} reinvest</div>
                <div>{simulation.passes.length} passes · RR {formatPercent(rr * 100)}</div>
                <div className="text-zinc-700 text-[10px]">@ {refineCity}</div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="text-[10px] uppercase tracking-widest text-green-400/80 font-semibold">💸 Sell</div>
              <div className="text-xl font-black text-green-400 mt-1 tabular-nums">{formatSilver(result.revenue)}</div>
              <div className="text-[11px] text-zinc-500 mt-2 space-y-0.5">
                <div>{simulation.totalOutput} × {formatSilver(result.effectiveSellPrice)}</div>
                <div>{sellPriceCity && <span className="text-zinc-700">@ {sellPriceCity}</span>}</div>
                <div className="text-zinc-700 text-[10px]">{sellMode === 'market' ? `${premium ? '6.5%' : '10.5%'} tax` : '5% Discord discount'}</div>
              </div>
            </div>
          </div>

          {/* Reinvest breakdown (collapsible) */}
          <details className="bg-zinc-900 rounded-xl border border-zinc-800">
            <summary className="cursor-pointer px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 font-semibold">
              Reinvest loop · {simulation.passes.length} passes · {simulation.totalOutput} total crafts
            </summary>
            <div className="px-5 pb-4 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-zinc-600 border-b border-zinc-800">
                    <th className="text-left py-2 pr-3">Pass</th>
                    <th className="text-right py-2 px-3">Crafts</th>
                    <th className="text-right py-2 px-3">Raw used</th>
                    <th className="text-right py-2 px-3">Prev used</th>
                    <th className="text-right py-2 px-3">Raw back</th>
                    <th className="text-right py-2 px-3">Prev back</th>
                    <th className="text-right py-2 pl-3">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cum = 0;
                    return simulation.passes.map(p => {
                      cum += p.crafts;
                      return (
                        <tr key={p.pass} className="border-b border-zinc-800/50">
                          <td className="py-1.5 pr-3 text-zinc-400 font-semibold">#{p.pass}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-200 tabular-nums">{p.crafts}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-500 tabular-nums">{Math.round(p.rawUsed)}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-500 tabular-nums">{Math.round(p.prevUsed)}</td>
                          <td className="py-1.5 px-3 text-right text-cyan-400/80 tabular-nums">+{Math.round(p.rawBack)}</td>
                          <td className="py-1.5 px-3 text-right text-cyan-400/80 tabular-nums">+{Math.round(p.prevBack)}</td>
                          <td className="py-1.5 pl-3 text-right text-gold tabular-nums font-semibold">{cum}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              <div className="text-[10px] text-zinc-600 mt-3 flex items-center gap-3">
                <span>Leftover: {simulation.leftoverRaw.toFixed(1)} raw, {simulation.leftoverPrev.toFixed(1)} prev</span>
              </div>
            </div>
          </details>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 text-amber-500/60 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-[11px] text-zinc-500">
              <span className="text-amber-400/70 font-medium">Expected values</span> — actual results vary ±20-30% per batch due to RNG. Run 30+ cycles for convergence. Check in-game prices for large investments.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface PriceInputProps {
  label: string;
  itemId: string;
  auto: number;
  autoCity: string;
  value: number | null;
  onChange: (v: number | null) => void;
  allCities?: Map<string, number>;
  accent?: 'green';
}

function PriceInput({ label, itemId, auto, autoCity, value, onChange, allCities, accent }: PriceInputProps) {
  const color = accent === 'green' ? 'text-green-400' : 'text-zinc-200';
  // The currently effective price (either user override or auto-filled)
  const effectivePrice = value ?? auto;
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <ItemIcon itemId={itemId} size={24} />
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      </div>
      <input
        type="number"
        min={0}
        placeholder={auto > 0 ? auto.toString() : 'N/A'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm ${color} placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40`}
      />
      {auto > 0 && autoCity && (
        <div className="text-[10px] text-zinc-600 mt-1.5 flex items-center justify-between">
          <span>Default: {formatSilver(auto)} @ {autoCity}</span>
          {value != null && (
            <button onClick={() => onChange(null)} className="text-cyan-500 hover:text-cyan-400 text-[9px] underline">reset</button>
          )}
        </div>
      )}
      {allCities && allCities.size > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-0.5">
          {[...allCities.entries()].sort((a, b) => a[1] - b[1]).map(([city, price]) => {
            const isSelected = Math.abs(effectivePrice - price) < 0.5;
            return (
              <button
                key={city}
                onClick={() => onChange(price)}
                className={`w-full flex items-center justify-between px-1.5 py-1 rounded text-[10px] transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {isSelected && <span className="text-cyan-400">✓</span>}
                  {city}
                </span>
                <span className="tabular-nums">{formatSilver(price)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
