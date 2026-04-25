/**
 * Cooking calculator — single-recipe deep-dive + bulk scan modes.
 *
 * The single-recipe view mirrors SimpleRefine's sidebar layout: numbered
 * config steps on the left, full breakdown on the right. The bulk scan
 * mode falls back to the old "scan all recipes ranked by profit" flow.
 *
 * Math:
 *   - RR uses the LPB formula shared with refining: rr = lpb / (100 + lpb)
 *   - Focus cost uses computeFocusCost (cooking shares the same per-tier
 *     base values as refining/crafting)
 *   - Tax: 6.5% premium / 10.5% non-premium (setup + sales)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { COOKING_RECIPES, COOKING_CATEGORIES, COOKING_CITY_BONUS, BASE_COOKING_FOCUS } from '../../data/cooking';
import type { CookingRecipe } from '../../data/cooking';
import { lpbToReturnRate } from '../../utils/returnRate';
import { computeFocusCost } from '../../utils/focusCost';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { getRefineSpec, setRefineSpec } from '../../data/specs';
import {
  TAX_PREMIUM, TAX_NON_PREMIUM, BASE_LPB, REFINE_CITY_LPB, FOCUS_LPB,
  ROYAL_CITIES, DEFAULT_STATION_FEE,
} from '../../data/constants';
import SidebarLayout from '../common/SidebarLayout';
import StepHeader from '../common/StepHeader';
import ItemIcon from '../common/ItemIcon';

// Cooking accent matches in-game station: warm orange/amber
const COOKING_ACCENT = { ring: 'orange-500', text: 'orange-300' };

// ============================================================================
// SCAN RESULT TYPE (bulk mode)
// ============================================================================
interface ScanResult {
  mealId: string;
  mealName: string;
  category: string;
  tier: number;
  enchant: number;
  totalCost: number;
  effectiveCost: number;
  sellPrice: number;
  sellCity: string;
  profit: number;
  margin: number;
  hasMissing: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type Mode = 'single' | 'scan';

export default function Cooking() {
  const [mode, setMode] = useState<Mode>('single');
  return (
    <div>
      <ModeSwitcher mode={mode} onChange={setMode} />
      {mode === 'single' ? <SingleRecipe /> : <BulkScan />}
    </div>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-5">
      <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
        <button
          onClick={() => onChange('single')}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
            mode === 'single' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Single Recipe
        </button>
        <button
          onClick={() => onChange('scan')}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
            mode === 'scan' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Scan All
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SINGLE RECIPE DEEP-DIVE
// ============================================================================

function SingleRecipe() {
  // Step 1 — What to cook
  const [category, setCategory] = useState<string>('Omelette');
  const [tier, setTier] = useState(6);
  const [enchant, setEnchant] = useState(0);
  const [batchSize, setBatchSize] = useState(100);

  // Step 2 — Where & how
  const [cookCity, setCookCity] = useState<string>('Lymhurst');
  const [useFocus, setUseFocus] = useState(true);
  const [premium, setPremium] = useState(true);
  const [spec, setSpec] = useState(() => getRefineSpec('COOKING', 6));
  const [feePerCraft, setFeePerCraft] = useState(DEFAULT_STATION_FEE);

  // Step 3 — Overrides
  const [rrOverride, setRrOverride] = useState<number | null>(null); // 0-100 % override
  const [customSell, setCustomSell] = useState<number | null>(null);

  // Recipe
  const recipe = useMemo<CookingRecipe | null>(() => {
    return COOKING_RECIPES.find(
      r => r.category === category && r.tier === tier && r.enchant === enchant
    ) || null;
  }, [category, tier, enchant]);

  // Reset enchant if T2/T3 selected
  useEffect(() => {
    if (tier < 4) setEnchant(0);
  }, [tier]);

  // Persist spec input
  useEffect(() => {
    setSpec(getRefineSpec('COOKING', tier));
  }, [tier]);

  const updateSpec = (val: number) => {
    const v = Math.max(0, Math.min(100, val));
    setSpec(v);
    setRefineSpec('COOKING', tier, v);
  };

  // Cross-tier spec sum for the focus discount. Cooking uses the same
  // formula as refining: 0.3× per other-tier spec point.
  const totalSpec = useMemo(() => {
    let sum = 0;
    for (const t of [2, 3, 4, 5, 6, 7, 8]) {
      sum += t === tier ? spec : getRefineSpec('COOKING', t);
    }
    return sum;
  }, [tier, spec]);

  // Prices
  const [prices, setPrices] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!recipe) return;
    setLoading(true);
    const ids = [recipe.mealId, ...recipe.ingredients.map(i => i.itemId)];
    const data = await fetchPrices(ids);
    const map = new Map<string, Map<string, number>>();
    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market' || p.city === 'Caerleon') continue;
      if (!map.has(p.item_id)) map.set(p.item_id, new Map());
      map.get(p.item_id)!.set(p.city, p.sell_price_min);
    }
    setPrices(map);
    setLoading(false);
  }, [recipe]);

  useEffect(() => { refresh(); }, [refresh]);

  // Pricing helpers — cheapest buy for ingredients, best sell for meal
  const cheapestPrice = (itemId: string): { price: number; city: string } | null => {
    const cityMap = prices.get(itemId);
    if (!cityMap || cityMap.size === 0) return null;
    let best = { price: Infinity, city: '' };
    for (const [city, price] of cityMap.entries()) {
      if (price < best.price) best = { price, city };
    }
    return best.price === Infinity ? null : best;
  };

  const bestSellPrice = (itemId: string): { price: number; city: string } | null => {
    const cityMap = prices.get(itemId);
    if (!cityMap || cityMap.size === 0) return null;
    // Outlier filter: drop > 3× median
    const sorted = [...cityMap.values()].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const cutoff = median * 3 || Infinity;
    let best = { price: 0, city: '' };
    for (const [city, price] of cityMap.entries()) {
      if (price > cutoff) continue;
      if (price > best.price) best = { price, city };
    }
    return best.price === 0 ? null : best;
  };

  // ============================== MATH ==============================
  const cityBonusActive = recipe ? (COOKING_CITY_BONUS[cookCity] || []).includes(category) : false;
  const lpb = BASE_LPB + (cityBonusActive ? REFINE_CITY_LPB : 0) + (useFocus ? FOCUS_LPB : 0);
  const autoRr = lpbToReturnRate(lpb);
  const rr = rrOverride != null ? rrOverride / 100 : autoRr;

  const focusCost = useMemo(() => {
    if (!recipe) return 0;
    return computeFocusCost({
      tier: recipe.tier,
      enchant: recipe.enchant,
      tierSpec: spec,
      totalResourceSpec: totalSpec,
      baseOverride: BASE_COOKING_FOCUS[recipe.tier] ?? 0,
    });
  }, [recipe, spec, totalSpec]);

  const taxRate = premium ? TAX_PREMIUM : TAX_NON_PREMIUM;

  const calc = useMemo(() => {
    if (!recipe) return null;

    // Per-craft material cost (raw, before RR)
    let perCraftRaw = 0;
    const ingredientDetail: Array<{ name: string; itemId: string; count: number; unit: number; total: number; city: string; missing: boolean }> = [];
    for (const ing of recipe.ingredients) {
      const cheap = cheapestPrice(ing.itemId);
      const unit = cheap?.price ?? 0;
      const totalIng = unit * ing.count;
      perCraftRaw += totalIng;
      ingredientDetail.push({
        name: ing.name, itemId: ing.itemId, count: ing.count, unit,
        total: totalIng, city: cheap?.city ?? '-', missing: cheap == null,
      });
    }

    const sellInfo = customSell != null
      ? { price: customSell, city: 'Custom' }
      : bestSellPrice(recipe.mealId) ?? { price: 0, city: '-' };

    // Effective per-craft cost after return rate (RR returns ingredients)
    const effectivePerCraft = perCraftRaw * (1 - rr);

    // Sell after tax
    const sellAfterTax = sellInfo.price * (1 - taxRate);

    // Per-craft profit (excluding station fee)
    const profitPerCraft = sellAfterTax - effectivePerCraft - feePerCraft;

    // Batch math
    const batchProfit = profitPerCraft * batchSize;
    const batchRevenue = sellAfterTax * batchSize;
    const batchCost = (effectivePerCraft + feePerCraft) * batchSize;
    const focusForBatch = useFocus ? focusCost * batchSize : 0;
    const profitPerFocus = focusForBatch > 0 ? batchProfit / focusForBatch : 0;

    return {
      ingredientDetail, perCraftRaw, effectivePerCraft, sellInfo, sellAfterTax,
      profitPerCraft, batchProfit, batchRevenue, batchCost, focusForBatch,
      profitPerFocus,
    };
  }, [recipe, prices, customSell, rr, feePerCraft, taxRate, batchSize, focusCost, useFocus]);

  if (!recipe) {
    return (
      <div className="max-w-[1500px] mx-auto px-4 py-12 text-center text-zinc-500">
        Pick a recipe to begin.
      </div>
    );
  }

  const sidebar = (
    <>
      {/* Step 1 — What */}
      <div className="surface p-4 space-y-3">
        <StepHeader num={1} label="What to cook" accent={COOKING_ACCENT} />
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {COOKING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Tier</label>
          <div className="grid grid-cols-7 gap-1">
            {[2, 3, 4, 5, 6, 7, 8].map(t => {
              const exists = COOKING_RECIPES.some(r => r.category === category && r.tier === t);
              return (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  disabled={!exists}
                  className={`h-9 rounded-lg text-xs font-bold transition-all
                    ${tier === t ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-500 border border-[color:var(--color-border)] hover:text-zinc-300'}
                    ${!exists ? 'opacity-25 cursor-not-allowed' : ''}`}
                >
                  T{t}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
            Enchant {tier < 4 && <span className="ml-2 text-zinc-600 normal-case">(T2/T3 has no enchants)</span>}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map(e => (
              <button
                key={e}
                onClick={() => setEnchant(e)}
                disabled={tier < 4 && e > 0}
                className={`h-9 rounded-lg text-xs font-bold transition-all
                  ${enchant === e ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-500 border border-[color:var(--color-border)] hover:text-zinc-300'}
                  ${tier < 4 && e > 0 ? 'opacity-25 cursor-not-allowed' : ''}`}
              >
                .{e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Batch size (crafts)</label>
          <input
            type="number" min={1}
            value={batchSize}
            onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-sm text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>
      </div>

      {/* Step 2 — Where */}
      <div className="surface p-4 space-y-3">
        <StepHeader num={2} label="Where & how" accent={COOKING_ACCENT} />
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Cooking city</label>
          <div className="grid grid-cols-1 gap-1">
            {ROYAL_CITIES.map(c => {
              const bonus = (COOKING_CITY_BONUS[c] || []).includes(category);
              return (
                <button
                  key={c}
                  onClick={() => setCookCity(c)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition
                    ${cookCity === c ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'bg-[color:var(--color-bg-overlay)] text-zinc-400 border border-[color:var(--color-border)] hover:text-zinc-200'}`}
                >
                  <span>{c}</span>
                  {bonus && <span className="text-[9px] text-emerald-400">★ {category} bonus</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
            Your spec (T{tier} {category}): {spec}
          </label>
          <input
            type="range" min={0} max={100}
            value={spec}
            onChange={(e) => updateSpec(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-orange-500" />
          <span className="text-xs text-zinc-300">Use focus <span className="text-zinc-600">({focusCost} per craft)</span></span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-orange-500" />
          <span className="text-xs text-zinc-300">Premium account <span className="text-zinc-600">({premium ? '6.5%' : '10.5%'} tax)</span></span>
        </label>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">Station fee per craft</label>
          <input
            type="number" min={0}
            value={feePerCraft}
            onChange={(e) => setFeePerCraft(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-xs text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>
      </div>

      {/* Step 3 — Overrides */}
      <div className="surface p-4 space-y-3">
        <StepHeader num={3} label="Manual overrides" accent={COOKING_ACCENT} />
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
            RR override (%) <span className="text-zinc-700 normal-case">auto: {(autoRr * 100).toFixed(1)}%</span>
          </label>
          <input
            type="number" min={0} max={100} step={0.1}
            value={rrOverride ?? ''}
            placeholder={`Auto ${(autoRr * 100).toFixed(1)}%`}
            onChange={(e) => {
              const v = e.target.value;
              setRrOverride(v === '' ? null : Math.max(0, Math.min(100, parseFloat(v) || 0)));
            }}
            className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-xs text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1.5">
            Custom sell price <span className="text-zinc-700 normal-case">{calc?.sellInfo.price ? `(market: ${formatSilver(calc.sellInfo.price)})` : ''}</span>
          </label>
          <input
            type="number" min={0}
            value={customSell ?? ''}
            placeholder={calc?.sellInfo.price ? formatSilver(calc.sellInfo.price) : 'Auto'}
            onChange={(e) => {
              const v = e.target.value;
              setCustomSell(v === '' ? null : Math.max(0, parseInt(v) || 0));
            }}
            className="w-full bg-[color:var(--color-bg-overlay)] border border-[color:var(--color-border)] rounded-lg px-3 py-2 text-xs text-zinc-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="w-full px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 text-xs font-semibold hover:bg-orange-500/20 transition disabled:opacity-40"
        >
          {loading ? 'Loading…' : '↻ Refresh prices'}
        </button>
      </div>
    </>
  );

  const breadcrumb = (
    <>
      <span className="w-6 h-px bg-orange-400/60" />
      <span className="text-orange-300">Cooking</span>
      <span className="text-zinc-700">/</span>
      <span>{recipe.mealName}</span>
    </>
  );

  return (
    <SidebarLayout breadcrumb={breadcrumb} sidebar={sidebar}>
      {/* Recipe info */}
      <div className="surface p-5">
        <div className="flex items-start gap-4">
          <ItemIcon itemId={recipe.mealId} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-zinc-100">{recipe.mealName}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-gold font-bold">T{recipe.tier}{recipe.enchant > 0 && `.${recipe.enchant}`}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">{recipe.category}</span>
              {cityBonusActive && <span className="text-emerald-400">· ★ {cookCity} bonus</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Sell @ {calc?.sellInfo.city || '—'}</div>
            <div className="text-base font-bold text-zinc-100 tabular-nums">
              {calc?.sellInfo.price ? formatSilver(calc.sellInfo.price) : '—'}
            </div>
            <div className="text-[10px] text-zinc-600">after {(taxRate * 100).toFixed(1)}% tax: {calc?.sellAfterTax ? formatSilver(calc.sellAfterTax) : '—'}</div>
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
          Ingredients per craft
        </div>
        <div className="divide-y divide-zinc-800/60">
          {calc?.ingredientDetail.map(ing => (
            <div key={ing.itemId} className="flex items-center gap-3 px-4 py-2.5">
              <ItemIcon itemId={ing.itemId} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">
                  {ing.name} <span className="text-zinc-600 text-xs">×{ing.count}</span>
                </div>
                {ing.missing ? (
                  <div className="text-[10px] text-amber-500">No market data</div>
                ) : (
                  <div className="text-[10px] text-zinc-600">{ing.city} · {formatSilver(ing.unit)} each</div>
                )}
              </div>
              <div className="text-sm tabular-nums text-zinc-300">{formatSilver(ing.total)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/40">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Raw cost / craft</span>
            <span className="text-sm font-semibold tabular-nums text-zinc-100">{formatSilver(calc?.perCraftRaw || 0)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/5">
            <span className="text-xs text-emerald-400/80 uppercase tracking-wider">After RR ({(rr * 100).toFixed(1)}%)</span>
            <span className="text-sm font-semibold tabular-nums text-emerald-300">{formatSilver(calc?.effectivePerCraft || 0)}</span>
          </div>
        </div>
      </div>

      {/* RR + Focus breakdown */}
      <div className="surface p-4 grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">Return rate</div>
          <Row label="Base LPB" value={`${BASE_LPB}`} />
          {cityBonusActive && <Row label={`${cookCity} bonus`} value={`+${REFINE_CITY_LPB}`} accent="emerald" />}
          {useFocus && <Row label="Focus" value={`+${FOCUS_LPB}`} accent="orange" />}
          <Row label="Total LPB" value={`${lpb}`} bold />
          <Row label="→ Return rate" value={`${(rr * 100).toFixed(1)}%`} bold accent="emerald" />
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">Focus</div>
          <Row label={`Base T${recipe.tier}`} value={`${BASE_COOKING_FOCUS[recipe.tier]}`} />
          {recipe.enchant > 0 && <Row label={`Enchant ×${[1,2,4,8][recipe.enchant]}`} value="" />}
          <Row label={`Spec ${spec}`} value="" />
          <Row label="Per craft" value={useFocus ? `${focusCost}` : '—'} bold accent="orange" />
        </div>
      </div>

      {/* Profit summary */}
      <div className={`rounded-xl border-2 px-5 py-4 ${(calc?.profitPerCraft ?? 0) >= 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Profit / craft</div>
            <div className={`text-2xl font-bold tabular-nums ${(calc?.profitPerCraft ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
              {(calc?.profitPerCraft ?? 0) >= 0 ? '+' : ''}{formatSilver(calc?.profitPerCraft ?? 0)}
            </div>
          </div>
          {useFocus && (calc?.profitPerFocus ?? 0) > 0 && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Per focus</div>
              <div className="text-lg font-bold tabular-nums text-orange-300">
                {formatSilver(calc?.profitPerFocus ?? 0)}
              </div>
              <div className="text-[10px] text-zinc-600">silver / focus</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Batch profit</div>
            <div className={`text-base font-bold tabular-nums ${(calc?.batchProfit ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
              {(calc?.batchProfit ?? 0) >= 0 ? '+' : ''}{formatSilver(calc?.batchProfit ?? 0)}
            </div>
            <div className="text-[9px] text-zinc-600">{batchSize} crafts</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Batch cost</div>
            <div className="text-base font-bold tabular-nums text-zinc-300">{formatSilver(calc?.batchCost ?? 0)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Focus needed</div>
            <div className="text-base font-bold tabular-nums text-orange-300">
              {useFocus ? (calc?.focusForBatch ?? 0).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: 'emerald' | 'orange' }) {
  const color = accent === 'emerald' ? 'text-emerald-300' : accent === 'orange' ? 'text-orange-300' : 'text-zinc-300';
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-zinc-500">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );
}

// ============================================================================
// BULK SCAN MODE — kept simple, ranked profit list
// ============================================================================

function BulkScan() {
  const [cookCity, setCookCity] = useState('Lymhurst');
  const [useFocus, setUseFocus] = useState(true);
  const [premium, setPremium] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEnchant, setFilterEnchant] = useState<number | 'all'>(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const taxRate = premium ? TAX_PREMIUM : TAX_NON_PREMIUM;

  const scan = useCallback(async () => {
    setScanning(true);
    setResults([]);
    try {
      const recipes = COOKING_RECIPES.filter(r =>
        (filterCategory === 'all' || r.category === filterCategory) &&
        (filterEnchant === 'all' || r.enchant === filterEnchant)
      );
      const idSet = new Set<string>();
      for (const r of recipes) {
        idSet.add(r.mealId);
        for (const ing of r.ingredients) idSet.add(ing.itemId);
      }
      const data = await fetchPrices([...idSet]);

      const cheapMap = new Map<string, { price: number; city: string }>();
      const sellMap = new Map<string, Map<string, number>>();
      for (const p of data) {
        if (p.sell_price_min <= 0 || p.city === 'Black Market' || p.city === 'Caerleon') continue;
        const ex = cheapMap.get(p.item_id);
        if (!ex || p.sell_price_min < ex.price) cheapMap.set(p.item_id, { price: p.sell_price_min, city: p.city });
        if (!sellMap.has(p.item_id)) sellMap.set(p.item_id, new Map());
        sellMap.get(p.item_id)!.set(p.city, p.sell_price_min);
      }

      const out: ScanResult[] = [];
      for (const r of recipes) {
        const cityMap = sellMap.get(r.mealId);
        if (!cityMap || cityMap.size === 0) continue;
        // Outlier filter on sell side
        const sorted = [...cityMap.values()].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        let bestSell = { price: 0, city: '' };
        for (const [city, price] of cityMap.entries()) {
          if (price > median * 3) continue;
          if (price > bestSell.price) bestSell = { price, city };
        }
        if (bestSell.price === 0) continue;

        let totalRaw = 0;
        let hasMissing = false;
        for (const ing of r.ingredients) {
          const cheap = cheapMap.get(ing.itemId);
          if (!cheap) { hasMissing = true; continue; }
          totalRaw += cheap.price * ing.count;
        }
        if (totalRaw === 0) continue;

        const cityBonus = (COOKING_CITY_BONUS[cookCity] || []).includes(r.category);
        const lpb = BASE_LPB + (cityBonus ? REFINE_CITY_LPB : 0) + (useFocus ? FOCUS_LPB : 0);
        const rr = lpbToReturnRate(lpb);
        const effectiveCost = totalRaw * (1 - rr);
        const sellAfterTax = bestSell.price * (1 - taxRate);
        const profit = sellAfterTax - effectiveCost;
        const margin = sellAfterTax > 0 ? (profit / sellAfterTax) * 100 : 0;

        out.push({
          mealId: r.mealId, mealName: r.mealName, category: r.category,
          tier: r.tier, enchant: r.enchant, totalCost: totalRaw, effectiveCost,
          sellPrice: bestSell.price, sellCity: bestSell.city, profit, margin, hasMissing,
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
  }, [cookCity, useFocus, premium, filterCategory, filterEnchant, taxRate]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Cooking City</label>
          <select value={cookCity} onChange={(e) => setCookCity(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
            {ROYAL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
            <option value="all">All</option>
            {COOKING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Enchant</label>
          <select
            value={filterEnchant}
            onChange={(e) => setFilterEnchant(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
          >
            <option value={0}>.0 only</option>
            <option value={1}>.1 only</option>
            <option value={2}>.2 only</option>
            <option value={3}>.3 only</option>
            <option value="all">All enchants</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
          <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-orange-500" />
          <span className="text-sm text-zinc-200">Focus</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-orange-500" />
          <span className="text-sm text-zinc-200">Premium</span>
        </label>
        <button
          onClick={scan}
          disabled={scanning}
          className="ml-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 disabled:opacity-50 transition"
        >
          {scanning ? 'Scanning…' : 'Scan All Recipes'}
        </button>
      </div>

      {scannedAt && <div className="text-[10px] text-zinc-600 text-right px-1">Scanned at {scannedAt}</div>}

      {scanning && <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">Fetching prices…</div>}

      {!scanning && results.length === 0 && scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No recipes had enough market data to compute a profit.
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Meal</th>
                <th className="text-right px-4 py-3">Tier</th>
                <th className="text-right px-4 py-3">Sell</th>
                <th className="text-right px-4 py-3">Cost</th>
                <th className="text-right px-4 py-3">Profit</th>
                <th className="text-right px-4 py-3">Margin</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.mealId} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-2.5 text-zinc-600 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <ItemIcon itemId={r.mealId} size={32} />
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">{r.mealName}</div>
                        <div className="text-[10px] text-zinc-600">@ {r.sellCity}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-gold font-bold">T{r.tier}{r.enchant > 0 && `.${r.enchant}`}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-zinc-300 tabular-nums">{formatSilver(r.sellPrice)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums">{formatSilver(r.effectiveCost)}</td>
                  <td className={`px-4 py-2.5 text-right text-sm font-bold tabular-nums ${r.profit >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                    {r.profit >= 0 ? '+' : ''}{formatSilver(r.profit)}
                  </td>
                  <td className={`px-4 py-2.5 text-right text-xs tabular-nums ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(r.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
