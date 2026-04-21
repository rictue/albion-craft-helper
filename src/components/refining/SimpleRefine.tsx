import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPrices, clearPriceCache } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { lpbToReturnRate } from '../../utils/returnRate';
import { computeFocusCost } from '../../utils/focusCost';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { ageHoursOf } from '../../utils/dataAge';
import { CITIES } from '../../data/cities';
import { getRefineSpec, setRefineSpec } from '../../data/specs';
import ItemIcon from '../common/ItemIcon';

const BASE_LPB = 18;
const CITY_LPB = 40;
const FOCUS_LPB = 59;
const TAX_RATE = 0.065; // Premium

// Raw resources + refined materials weight (Albion: all raw 0.1 kg, refined 0.2 kg)
const RAW_WEIGHT_KG = 0.1;
const REFINED_WEIGHT_KG = 0.2;

// Transport mount carry capacity in kg
const MOUNTS = [
  { id: 't4ox', name: 'T4 Transport Ox', capacity: 2500 },
  { id: 't5ox', name: 'T5 Transport Ox', capacity: 3000 },
  { id: 't6ox', name: 'T6 Transport Ox', capacity: 3500 },
  { id: 't7ox', name: 'T7 Transport Ox', capacity: 4000 },
  { id: 't8ox', name: 'T8 Transport Ox', capacity: 4500 },
  { id: 't5mam', name: 'T5 Transport Mammoth', capacity: 9000 },
  { id: 't8mam', name: 'T8 Transport Mammoth', capacity: 16000 },
];


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
  // Daily Production Bonus — shown on the island/station UI in-game. Rotates
  // daily per category (+20% for the listed items). It is a FLAT additive to
  // return rate, NOT an LPB add, so we add it after lpbToReturnRate().
  const [dailyBonus, setDailyBonus] = useState(0);
  const [customRaw, setCustomRaw] = useState<number | null>(null);
  const [customPrev, setCustomPrev] = useState<number | null>(null);
  const [customSell, setCustomSell] = useState<number | null>(null);
  // Sticky city selections — persist across tier/enchant changes
  const [rawCitySel, setRawCitySel] = useState<string | null>(null);
  const [prevCitySel, setPrevCitySel] = useState<string | null>(null);
  const [sellCitySel, setSellCitySel] = useState<string | null>(null);
  // Transport mount for weight calculation
  const [mount, setMount] = useState('t8ox');
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

  // Tick every 5s so the "Updated Xs ago" label refreshes. Using a state
  // bump instead of reading Date.now() during render (React purity rule).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Clear custom price overrides AND sticky cities only when resource changes
  // (tier/enchant keeps sticky city selection so user doesn't have to re-pick)
  useEffect(() => {
    setCustomRaw(null);
    setCustomPrev(null);
    setCustomSell(null);
    setRawCitySel(null);
    setPrevCitySel(null);
    setSellCitySel(null);
  }, [resource]);

  // Also clear typed custom number on tier/enchant change, but KEEP city selection
  useEffect(() => {
    setCustomRaw(null);
    setCustomPrev(null);
    setCustomSell(null);
  }, [tier, enchant]);

  // T2/T3 have no enchanted variants — reset to .0 when dropping below T4
  useEffect(() => {
    if (tier < 4) setEnchant(0);
  }, [tier]);

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
  // Priority: typed custom number > sticky city selection's current price > default (refine city)
  const resolveRaw = (): { price: number; city: string } => {
    if (customRaw != null) return { price: customRaw, city: 'Custom' };
    if (rawCitySel && prices?.raw.has(rawCitySel)) return { price: prices.raw.get(rawCitySel) || 0, city: rawCitySel };
    if (buyCity === 'auto') return { price: bestBuy?.raw?.price ?? 0, city: bestBuy?.raw?.city ?? '' };
    return { price: prices?.raw.get(buyCity) ?? 0, city: buyCity };
  };
  const resolvePrev = (): { price: number; city: string } => {
    if (customPrev != null) return { price: customPrev, city: 'Custom' };
    if (prevCitySel && prices?.prev.has(prevCitySel)) return { price: prices.prev.get(prevCitySel) || 0, city: prevCitySel };
    if (buyCity === 'auto') return { price: bestBuy?.prev?.price ?? 0, city: bestBuy?.prev?.city ?? '' };
    return { price: prices?.prev.get(buyCity) ?? 0, city: buyCity };
  };
  const resolveSell = (): { price: number; city: string } => {
    if (customSell != null) return { price: customSell, city: 'Custom' };
    if (sellCitySel && prices?.refined.has(sellCitySel)) return { price: prices.refined.get(sellCitySel) || 0, city: sellCitySel };
    if (sellCity === 'auto') return { price: bestSell?.price ?? 0, city: bestSell?.city ?? '' };
    return { price: prices?.refined.get(sellCity) ?? 0, city: sellCity };
  };
  const rawResolved = resolveRaw();
  const prevResolved = resolvePrev();
  const sellResolved = resolveSell();
  const rawPrice = rawResolved.price;
  const rawPriceCity = rawResolved.city;
  const prevPrice = prevResolved.price;
  const sellPrice = sellResolved.price;
  const sellPriceCity = sellResolved.city;

  // LPB + RR: two variants for split focus/no-focus
  const cityBonusActive = (CITY_REFINE_BONUS[refineCity] || []).includes(resource);
  const lpbNoFocus = BASE_LPB + (cityBonusActive ? CITY_LPB : 0);
  const lpbFocus = lpbNoFocus + FOCUS_LPB;
  const dailyBonusFrac = Math.max(0, dailyBonus) / 100;
  const rrNoFocus = Math.min(0.999, lpbToReturnRate(lpbNoFocus) + dailyBonusFrac);
  const rrFocus = Math.min(0.999, lpbToReturnRate(lpbFocus) + dailyBonusFrac);
  // Effective RR shown in UI (if focus used AND budget > 0, show focus rate; else no-focus)
  const lpb = useFocus ? lpbFocus : lpbNoFocus;
  const rr = useFocus ? rrFocus : rrNoFocus;

  // Sum of user's specs across ALL tiers of this resource (loaded from
  // localStorage). Albion's official formula applies a 0.3× bonus per
  // total-tier spec in addition to the 2.5× bonus for the current tier.
  // Missing tier specs simply contribute 0 — user can set them via the
  // "Your Spec" input while switching tiers.
  const totalResourceSpec = useMemo(() => {
    const rt = RESOURCE_TYPES.find(r => r.id === resource);
    if (!rt) return 0;
    let sum = 0;
    for (let t = 2; t <= 8; t++) {
      const s = t === tier ? specInput : getRefineSpec(rt.refinedPrefix, t);
      sum += s;
    }
    return sum;
  }, [resource, tier, specInput]);

  // Focus cost per craft — shared utility (src/utils/focusCost.ts) that
  // applies the full Albion formula including enchant multiplier + the
  // cross-tier spec sum × 0.3 discount.
  const focusCostPerCraft = useMemo(() => {
    if (!recipe) return 0;
    return computeFocusCost({
      tier,
      enchant,
      tierSpec: specInput,
      totalResourceSpec,
    });
  }, [tier, enchant, specInput, totalResourceSpec, recipe]);

  // Reinvest loop simulation — single unified chain that consumes focus
  // pass-by-pass. Previously the code pre-split initial crafts into focus
  // vs no-focus and ran two parallel chains, which (a) ignored focus spent
  // on chain crafts and (b) treated reinvest crafts as free focus. That
  // over-reported output by 15-30% on enchanted refining.
  const simulation = useMemo(() => {
    if (!recipe) return null;
    const rawPerCraft = recipe.rawPerCraft;
    const prevPerCraft = recipe.prevPerCraft;
    const initialCrafts = Math.floor(rawCount / rawPerCraft);

    let raw = initialCrafts * rawPerCraft;
    let prev = initialCrafts * prevPerCraft;
    let focusRemaining = useFocus && focusCostPerCraft > 0 ? focusBudget : 0;
    let totalFocusCrafts = 0;
    let totalNoFocusCrafts = 0;
    const passes: Array<{ pass: number; crafts: number; focusCrafts: number; noFocusCrafts: number; rawUsed: number; prevUsed: number; rawBack: number; prevBack: number; mode: 'focus' | 'normal' | 'mixed' }> = [];

    for (let pass = 1; pass <= 30; pass++) {
      const fromRaw = Math.floor(raw / rawPerCraft);
      const fromPrev = prevPerCraft > 0 ? Math.floor(prev / prevPerCraft) : Infinity;
      const crafts = Math.min(fromRaw, fromPrev);
      if (crafts <= 0) break;

      // Split this pass by remaining focus budget
      const focusCraftsThisPass = focusCostPerCraft > 0
        ? Math.min(crafts, Math.floor(focusRemaining / focusCostPerCraft))
        : 0;
      const noFocusCraftsThisPass = crafts - focusCraftsThisPass;

      const rawUsed = crafts * rawPerCraft;
      const prevUsed = crafts * prevPerCraft;
      // Return materials at the rate matching how each sub-segment crafted
      const rawBack = focusCraftsThisPass * rawPerCraft * rrFocus + noFocusCraftsThisPass * rawPerCraft * rrNoFocus;
      const prevBack = focusCraftsThisPass * prevPerCraft * rrFocus + noFocusCraftsThisPass * prevPerCraft * rrNoFocus;

      raw = raw - rawUsed + rawBack;
      prev = prev - prevUsed + prevBack;
      focusRemaining -= focusCraftsThisPass * focusCostPerCraft;
      totalFocusCrafts += focusCraftsThisPass;
      totalNoFocusCrafts += noFocusCraftsThisPass;

      const mode: 'focus' | 'normal' | 'mixed' =
        focusCraftsThisPass === crafts ? 'focus'
        : focusCraftsThisPass === 0 ? 'normal'
        : 'mixed';

      passes.push({
        pass, crafts,
        focusCrafts: focusCraftsThisPass,
        noFocusCrafts: noFocusCraftsThisPass,
        rawUsed, prevUsed, rawBack, prevBack, mode,
      });
    }

    const totalOutput = totalFocusCrafts + totalNoFocusCrafts;
    const usedFocus = totalFocusCrafts * focusCostPerCraft;

    return {
      initialCrafts,
      focusCrafts: totalFocusCrafts,
      noFocusCrafts: totalNoFocusCrafts,
      focusOutput: totalFocusCrafts,
      noFocusOutput: totalNoFocusCrafts,
      totalOutput,
      usedFocus,
      passes,
      leftoverRaw: raw,
      leftoverPrev: prev,
    };
  }, [recipe, rawCount, useFocus, focusBudget, focusCostPerCraft, rrFocus, rrNoFocus]);

  // Back-compat view for UI — derives from simulation instead of pre-computing
  const focusSplit = useMemo(() => {
    if (!simulation) return { focusCrafts: 0, noFocusCrafts: 0, usedFocus: 0 };
    return {
      focusCrafts: simulation.focusCrafts,
      noFocusCrafts: simulation.noFocusCrafts,
      usedFocus: simulation.usedFocus,
    };
  }, [simulation]);

  // Financial results
  const result = useMemo(() => {
    if (!recipe || !simulation || rawPrice === 0 || sellPrice === 0) return null;

    const initialRaw = simulation.initialCrafts * recipe.rawPerCraft;
    const initialPrev = simulation.initialCrafts * recipe.prevPerCraft;

    const rawCost = initialRaw * rawPrice;
    const prevCost = initialPrev * prevPrice;
    // Station fee is paid per craft ACTION, including reinvest passes.
    // Previously we only charged initial crafts, which understated fees by
    // ~2× when RR is high. Now we charge all chain crafts.
    const feeTotal = simulation.totalOutput * feePerCraft;
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

  // Stale price warning (>6h old). Uses the shared AODP-aware parser so
  // the user's timezone doesn't inflate ages by +3h (UTC+3 Turkey).
  const priceAge = (dateStr: string): number => ageHoursOf(dateStr);
  const staleWarning = prices && Math.max(
    priceAge(prices.rawDate),
    priceAge(prices.prevDate),
    priceAge(prices.refinedDate),
  ) > 6;

  if (!recipe) return null;

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-10">
      {/* Compact breadcrumb / page label */}
      <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-[0.22em] text-zinc-600 font-semibold">
        <span className="w-6 h-px bg-cyan-400/60" />
        <span className="text-cyan-300">Refining</span>
        <span className="text-zinc-700">/</span>
        <span>{recipe.refinedName}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* ==================== SIDEBAR ==================== */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          {/* Step 1 — What to refine */}
          <div className="surface p-4 space-y-3">
            <StepHeader num={1} label="What to refine" />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Resource</label>
              <select value={resource} onChange={(e) => setResource(e.target.value)} className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
                {RESOURCE_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Tier</label>
              <div className="grid grid-cols-7 gap-1">
                {[2, 3, 4, 5, 6, 7, 8].map(t => (
                  <button key={t} onClick={() => setTier(t)} className={`h-9 rounded-lg text-xs font-bold transition-all ${tier === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-500 border border-[color:var(--color-border)] hover:text-zinc-300'}`}>
                    T{t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
                Enchant
                {tier < 4 && <span className="ml-2 text-zinc-600 normal-case">(T2/T3 has no enchants)</span>}
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map(e => (
                  <button
                    key={e}
                    onClick={() => setEnchant(e)}
                    disabled={tier < 4 && e > 0}
                    className={`h-9 rounded-lg text-xs font-bold transition-all
                      ${enchant === e ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-500 border border-[color:var(--color-border)] hover:text-zinc-300'}
                      ${tier < 4 && e > 0 ? 'opacity-25 cursor-not-allowed' : ''}`}
                  >
                    .{e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Raw resource amount</label>
              <input type="number" min={1} value={rawCount} onChange={(e) => setRawCount(parseInt(e.target.value) || 0)} className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            </div>
          </div>

          {/* Step 2 — Where & how */}
          <div className="surface p-4 space-y-3">
            <StepHeader num={2} label="Where & how" />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Refine city</label>
              <select value={refineCity} onChange={(e) => setRefineCity(e.target.value)} className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
                {CITIES.filter(c => c.id !== 'Black Market').map(c => <option key={c.id} value={c.id}>{c.name}{(CITY_REFINE_BONUS[c.id] || []).includes(resource) ? ' ★' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Your spec (this tier)</label>
              <input type="number" min={0} max={100} value={specInput} onChange={(e) => updateSpec(parseInt(e.target.value) || 0)} className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center justify-center gap-1.5 cursor-pointer border rounded-lg px-2 py-2 text-xs font-semibold transition-all ${useFocus ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border)] text-zinc-400 hover:text-zinc-200'}`}>
                <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-cyan-500" />
                Focus
              </label>
              <label className={`flex items-center justify-center gap-1.5 cursor-pointer border rounded-lg px-2 py-2 text-xs font-semibold transition-all ${premium ? 'bg-gold/15 border-gold/40 text-gold' : 'bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border)] text-zinc-400 hover:text-zinc-200'}`}>
                <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-amber-500" />
                Premium
              </label>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5" title="Daily Production Bonus — shown at the refining station in-game">
                Daily bonus %
              </label>
              <input
                type="number" min={0} max={60} step={5}
                value={dailyBonus}
                onChange={(e) => setDailyBonus(Math.max(0, Math.min(60, parseFloat(e.target.value) || 0)))}
                placeholder="0"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${dailyBonus > 0 ? 'bg-amber-500/5 border-amber-500/40 text-amber-300 font-semibold' : 'bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border)] text-zinc-200'}`}
              />
            </div>
            {useFocus && (
              <div className="pt-3 border-t border-[color:var(--color-border)] space-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Focus budget</label>
                  <input type="number" min={0} step={1000} value={focusBudget} onChange={(e) => setFocusBudget(parseInt(e.target.value) || 0)} className="w-full bg-[color:var(--color-bg-overlay)] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-cyan-300 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
                </div>
                <div className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-[11px] leading-tight">
                  <div>
                    <span className="text-cyan-400 font-bold tabular-nums">{focusSplit.focusCrafts}</span>
                    <span className="text-zinc-500"> w/focus · </span>
                    <span className="text-amber-400 font-bold tabular-nums">{focusSplit.noFocusCrafts}</span>
                    <span className="text-zinc-500"> without</span>
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    Spending <span className="text-cyan-400 tabular-nums">{focusSplit.usedFocus.toLocaleString()}</span> / {focusBudget.toLocaleString()}
                  </div>
                  {focusSplit.noFocusCrafts > 0 && (
                    <div className="text-[10px] text-amber-400 mt-1">⚠ Budget exhausts mid-chain</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3 — How to sell */}
          <div className="surface p-4 space-y-3">
            <StepHeader num={3} label="How to sell" />
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => setSellMode('market')} className={`h-9 rounded-lg text-[11px] font-semibold transition-all ${sellMode === 'market' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-400 border border-[color:var(--color-border)]'}`}>
                Market {premium ? '−6.5%' : '−10.5%'}
              </button>
              <button onClick={() => setSellMode('discord')} className={`h-9 rounded-lg text-[11px] font-semibold transition-all ${sellMode === 'discord' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-400 border border-[color:var(--color-border)]'}`}>
                Discord −5%
              </button>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Station fee / craft</label>
              <input type="number" min={0} value={feePerCraft} onChange={(e) => setFeePerCraft(parseInt(e.target.value) || 0)} className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            </div>
          </div>

          {/* Data freshness controls */}
          <div className="surface-flat p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => doFetch(true)}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold bg-[color:var(--color-bg-overlay)] hover:bg-[color:var(--color-bg-elevated)] text-zinc-300 border border-[color:var(--color-border)] disabled:opacity-50 transition-colors"
                title="Force refresh prices from AODP"
              >
                {loading ? 'Loading…' : '↻ Refresh prices'}
              </button>
              <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border text-[11px] font-semibold transition-colors ${liveMode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-[color:var(--color-bg-overlay)] border-[color:var(--color-border)] text-zinc-400'}`}>
                <input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} className="accent-emerald-500" />
                {liveMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                Live
              </label>
            </div>
            {lastFetchAt && (
              <div className="text-[10px] text-zinc-600 text-center">
                Updated {Math.max(0, Math.floor((nowTick - lastFetchAt) / 1000))}s ago
              </div>
            )}
            {staleWarning && !liveMode && (
              <div className="text-[10px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2 py-1.5">
                ⚠ Prices &gt;6h old — open ADP + AH in-game
              </div>
            )}
          </div>
        </aside>

        {/* ==================== MAIN ==================== */}
        <main className="space-y-4 min-w-0">
          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`chip ${cityBonusActive ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-zinc-500 bg-[color:var(--color-bg-raised)] border-[color:var(--color-border)]'}`}>
              {cityBonusActive ? '★ City bonus' : 'No city bonus'}
            </span>
            <span className="chip text-cyan-300 bg-cyan-500/10 border-cyan-500/30">
              RR {formatPercent(rr * 100)}
            </span>
            <span className="chip text-zinc-400 bg-[color:var(--color-bg-raised)] border-[color:var(--color-border)]">
              LPB {lpb}
            </span>
            {useFocus && (
              <span className="chip text-purple-300 bg-purple-500/10 border-purple-500/30">
                Focus/craft {focusCostPerCraft}
              </span>
            )}
            {dailyBonus > 0 && (
              <span className="chip text-amber-300 bg-amber-500/10 border-amber-500/30">
                ⚡ Daily +{dailyBonus}%
              </span>
            )}
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

          {/* Prices section */}
          <div className="surface p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-zinc-400 font-semibold">Market Prices</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">Auto-filled from AODP. Click a city to override, or type your actual price.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <PriceInput
                label="Raw Price"
                itemId={recipe.rawId}
                effectivePrice={rawPrice}
                effectiveCity={rawPriceCity}
                defaultPrice={bestBuy?.raw?.price ?? 0}
                defaultCity={bestBuy?.raw?.city ?? ''}
                customValue={customRaw}
                stickyCity={rawCitySel}
                onTypeNumber={(v) => { setCustomRaw(v); if (v != null) setRawCitySel(null); }}
                onPickCity={(city) => { setRawCitySel(city); setCustomRaw(null); }}
                onReset={() => { setCustomRaw(null); setRawCitySel(null); }}
                allCities={prices?.raw}
              />
              {recipe.prevPerCraft > 0 && (
                <PriceInput
                  label="Prev Tier Price"
                  itemId={recipe.prevRefinedId}
                  effectivePrice={prevPrice}
                  effectiveCity={prevResolved.city}
                  defaultPrice={bestBuy?.prev?.price ?? 0}
                  defaultCity={bestBuy?.prev?.city ?? ''}
                  customValue={customPrev}
                  stickyCity={prevCitySel}
                  onTypeNumber={(v) => { setCustomPrev(v); if (v != null) setPrevCitySel(null); }}
                  onPickCity={(city) => { setPrevCitySel(city); setCustomPrev(null); }}
                  onReset={() => { setCustomPrev(null); setPrevCitySel(null); }}
                  allCities={prices?.prev}
                />
              )}
              <PriceInput
                label="Sell Price"
                itemId={recipe.refinedId}
                effectivePrice={sellPrice}
                effectiveCity={sellPriceCity}
                defaultPrice={bestSell?.price ?? 0}
                defaultCity={bestSell?.city ?? ''}
                customValue={customSell}
                stickyCity={sellCitySel}
                onTypeNumber={(v) => { setCustomSell(v); if (v != null) setSellCitySel(null); }}
                onPickCity={(city) => { setSellCitySel(city); setCustomSell(null); }}
                onReset={() => { setCustomSell(null); setSellCitySel(null); }}
                allCities={prices?.refined}
                accent="green"
              />
            </div>
          </div>

          {/* Transport / Weight card */}
          {(() => {
            const rawWeightTotal = result.initialRaw * RAW_WEIGHT_KG;
            const prevWeightTotal = result.initialPrev * REFINED_WEIGHT_KG;
            const outputWeightTotal = simulation.totalOutput * REFINED_WEIGHT_KG;
            // Transport planning: need to carry buy materials TO refine city, AND output FROM refine city to sell city
            const buyTripWeight = rawWeightTotal + prevWeightTotal;
            const sellTripWeight = outputWeightTotal;
            const mountCap = MOUNTS.find(m => m.id === mount)?.capacity ?? 4500;
            const buyTrips = Math.ceil(buyTripWeight / mountCap);
            const sellTrips = Math.ceil(sellTripWeight / mountCap);
            const buyColor = buyTrips === 1 ? 'text-green-400' : buyTrips <= 3 ? 'text-amber-400' : 'text-red-400';
            const sellColor = sellTrips === 1 ? 'text-green-400' : sellTrips <= 3 ? 'text-amber-400' : 'text-red-400';

            return (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-orange-400/80 font-semibold">🐂 Transport</div>
                  <select value={mount} onChange={(e) => setMount(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                    {MOUNTS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.capacity.toLocaleString()} kg)</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                    <div className="text-[10px] uppercase text-zinc-600">Buy trip (to refine city)</div>
                    <div className="text-sm text-zinc-300 font-semibold tabular-nums">{buyTripWeight.toFixed(0)} kg</div>
                    <div className="text-[10px] text-zinc-600 leading-tight">
                      {result.initialRaw} raw × {RAW_WEIGHT_KG} kg = {rawWeightTotal.toFixed(0)} kg
                      {result.initialPrev > 0 && <><br/>{result.initialPrev} prev × {REFINED_WEIGHT_KG} kg = {prevWeightTotal.toFixed(0)} kg</>}
                    </div>
                    <div className="text-xs mt-1.5">
                      <span className={`font-bold ${buyColor}`}>{buyTrips}</span>
                      <span className="text-zinc-500"> trip{buyTrips > 1 ? 's' : ''} needed</span>
                    </div>
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                    <div className="text-[10px] uppercase text-zinc-600">Sell trip (to sell city)</div>
                    <div className="text-sm text-zinc-300 font-semibold tabular-nums">{sellTripWeight.toFixed(0)} kg</div>
                    <div className="text-[10px] text-zinc-600 leading-tight">
                      {simulation.totalOutput} planks × {REFINED_WEIGHT_KG} kg = {outputWeightTotal.toFixed(0)} kg
                    </div>
                    <div className="text-xs mt-1.5">
                      <span className={`font-bold ${sellColor}`}>{sellTrips}</span>
                      <span className="text-zinc-500"> trip{sellTrips > 1 ? 's' : ''} needed</span>
                    </div>
                  </div>
                </div>
                {(buyTrips > 1 || sellTrips > 1) && (
                  <div className="mt-3 text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                    ⚠ Multiple trips needed. Upgrade to a bigger mount or split the batch.
                  </div>
                )}
              </div>
            );
          })()}

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
        </main>
      </div>
    </div>
  );
}

/** Small numbered step marker used in the sidebar sections */
function StepHeader({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300">
        {num}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-300 font-semibold">{label}</span>
    </div>
  );
}

interface PriceInputProps {
  label: string;
  itemId: string;
  effectivePrice: number;
  effectiveCity: string;
  defaultPrice: number;
  defaultCity: string;
  customValue: number | null;
  stickyCity: string | null;
  onTypeNumber: (v: number | null) => void;
  onPickCity: (city: string) => void;
  onReset: () => void;
  allCities?: Map<string, number>;
  accent?: 'green';
}

function PriceInput({ label, itemId, effectivePrice, effectiveCity, defaultPrice, defaultCity, customValue, stickyCity, onTypeNumber, onPickCity, onReset, allCities, accent }: PriceInputProps) {
  const color = accent === 'green' ? 'text-green-400' : 'text-zinc-200';
  const hasOverride = customValue != null || stickyCity != null;
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <ItemIcon itemId={itemId} size={24} />
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      </div>
      <input
        type="number"
        min={0}
        placeholder={effectivePrice > 0 ? effectivePrice.toString() : 'N/A'}
        value={customValue ?? ''}
        onChange={(e) => onTypeNumber(e.target.value ? parseInt(e.target.value) : null)}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm ${color} placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40`}
      />
      <div className="text-[10px] text-zinc-600 mt-1.5 flex items-center justify-between">
        <span>
          {hasOverride
            ? <span className="text-cyan-400">Using: {formatSilver(effectivePrice)} @ {effectiveCity}</span>
            : <>Default: {defaultPrice > 0 ? `${formatSilver(defaultPrice)} @ ${defaultCity}` : 'N/A'}</>
          }
        </span>
        {hasOverride && (
          <button onClick={onReset} className="text-cyan-500 hover:text-cyan-400 text-[9px] underline">reset</button>
        )}
      </div>
      {allCities && allCities.size > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-0.5">
          {[...allCities.entries()].sort((a, b) => a[1] - b[1]).map(([city, price]) => {
            const isSelected = stickyCity === city || (stickyCity == null && customValue == null && effectiveCity === city);
            return (
              <button
                key={city}
                onClick={() => onPickCity(city)}
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
