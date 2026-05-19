import { useEffect, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { fetchPrices, buildPriceMap } from '../../services/api';
import { calculateCrafting } from '../../utils/profitCalculator';
import { calculateReturnRate } from '../../utils/returnRate';
import { resolveItemId, resolveMaterialId, resolveArtifactId } from '../../utils/itemIdParser';
import { formatPercent } from '../../utils/formatters';
import { ALL_ITEMS } from '../../data/items';

const RECENT_ITEMS_LS = 'albion-recent-items-v1';
const RECENT_ITEMS_LIMIT = 8;

function loadRecentBaseIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ITEMS_LS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // localStorage unavailable or corrupt JSON — start fresh.
  }
  return [];
}

// Short labels for the material-budget widget so the user knows what unit
// they are entering into the input (e.g. "999 Planks").
const MATERIAL_LABELS: Record<string, string> = {
  METALBAR: 'Metal Bars',
  PLANKS: 'Planks',
  CLOTH: 'Cloth',
  LEATHER: 'Leather',
  STONEBLOCK: 'Stone Blocks',
};
import ItemSearch from './ItemSearch';
import CraftingSettings from './CraftingSettings';
import RecipeDisplay from './RecipeDisplay';
import ReturnRateSlider from './ReturnRateSlider';
import ProfitSummary from './ProfitSummary';
import JournalBoostCard from './JournalBoostCard';
import LiquidityCard from './LiquidityCard';
import TierSelector from '../common/TierSelector';
import EnchantmentSelector from '../common/EnchantmentSelector';
import type { Tier, Enchantment, ItemDefinition } from '../../types';
import ItemIcon from '../common/ItemIcon';

export default function CraftingCalculator() {
  const {
    selectedItem, tier, enchantment,
    setSelectedItem, setTier, setEnchantment,
    settings, updateSettings, prices, setPrices, pricesLoading, setPricesLoading,
    customPrices,
  } = useAppStore();

  // URL state sync — shareable links like /calculator?item=MAIN_SWORD&t=6&e=2.
  // URL wins on mount (so a shared link applies cleanly); subsequent state
  // changes then push back into the URL with replace so we don't spam history.
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlHydrated, setUrlHydrated] = useState(false);

  useEffect(() => {
    if (urlHydrated) return;
    const itemId = searchParams.get('item');
    const t = searchParams.get('t');
    const e = searchParams.get('e');
    if (itemId) {
      const found = ALL_ITEMS.find(i => i.baseId === itemId);
      if (found) setSelectedItem(found);
    }
    if (t) {
      const parsedT = parseInt(t);
      if ([4, 5, 6, 7, 8].includes(parsedT)) setTier(parsedT as Tier);
    }
    if (e) {
      const parsedE = parseInt(e);
      if ([0, 1, 2, 3, 4].includes(parsedE)) setEnchantment(parsedE as Enchantment);
    }
    setUrlHydrated(true);
  }, [urlHydrated, searchParams, setSelectedItem, setTier, setEnchantment]);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams();
    if (selectedItem) params.set('item', selectedItem.baseId);
    if (tier !== 4) params.set('t', String(tier));
    if (enchantment !== 0) params.set('e', String(enchantment));
    setSearchParams(params, { replace: true });
  }, [urlHydrated, selectedItem, tier, enchantment, setSearchParams]);

  // Recently-used items chip row — last N base item IDs the user picked,
  // persisted to localStorage so it survives reloads. We dedupe-and-prepend
  // on every selection so the most recent is always at index 0.
  const [recentBaseIds, setRecentBaseIds] = useState<string[]>(() => loadRecentBaseIds());

  useEffect(() => {
    if (!selectedItem) return;
    setRecentBaseIds(prev => {
      const filtered = prev.filter(id => id !== selectedItem.baseId);
      const next = [selectedItem.baseId, ...filtered].slice(0, RECENT_ITEMS_LIMIT);
      try {
        localStorage.setItem(RECENT_ITEMS_LS, JSON.stringify(next));
      } catch {
        // localStorage full or unavailable — keep in-memory only.
      }
      return next;
    });
  }, [selectedItem]);

  const recentItems = useMemo<ItemDefinition[]>(() => {
    return recentBaseIds
      .map(id => ALL_ITEMS.find(i => i.baseId === id))
      .filter((i): i is ItemDefinition => i !== undefined);
  }, [recentBaseIds]);

  // Material budget widget — user enters 'I have X of the primary material'
  // and the quantity input is auto-computed based on the recipe's primary
  // resource count (first ingredient) AND the current return rate.
  const [budgetInput, setBudgetInput] = useState<number | ''>('');
  // Reset the budget whenever the selected item changes — the recipe
  // changes so a previous budget would be applied to a different material.
  useEffect(() => { setBudgetInput(''); }, [selectedItem, tier, enchantment]);

  // Timestamp of the last successful fetch, so we can show "Updated Xm ago"
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  // "Now" tick so the "Xm ago" label stays fresh without reading Date.now()
  // during render (React purity rule). Bumps every 30s.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Net silver from selling filled journals, reported upward by JournalBoostCard
  // so ProfitSummary can fold it into the combined profit figure.
  const [journalNet, setJournalNet] = useState(0);
  // Reset when item/tier/enchant changes — new journal card will re-report.
  useEffect(() => { setJournalNet(0); }, [selectedItem, tier, enchantment]);

  const loadPrices = useCallback(async (force: boolean = false) => {
    if (!selectedItem) return;

    setPricesLoading(true);
    try {
      const itemIds: string[] = [];

      // Always fetch BOTH 2H_ and MAIN_ variants (Albion API is inconsistent)
      const mainItemId = resolveItemId(selectedItem.baseId, tier, enchantment);
      itemIds.push(mainItemId);
      if (mainItemId.includes('_2H_')) {
        itemIds.push(mainItemId.replace('_2H_', '_MAIN_'));
      } else if (mainItemId.includes('_MAIN_')) {
        itemIds.push(mainItemId.replace('_MAIN_', '_2H_'));
      }

      for (const req of selectedItem.recipe) {
        itemIds.push(resolveMaterialId(req.materialBase, tier, enchantment));
      }

      if (selectedItem.artifactId) {
        itemIds.push(resolveArtifactId(selectedItem.artifactId, tier));
      }

      // Fetch ALL qualities. The old quality=1 filter only returned Normal
      // quality listings — but in Albion the real liquid market is quality
      // 2-3 (Good/Outstanding). Quality 1 often has zero or one absurdly
      // overpriced listing, which is why the user was seeing 300K for an
      // item that actually costs 27K at Outstanding quality.
      const data = await fetchPrices(itemIds, undefined, true, force);
      setPrices(data);
      setFetchedAt(Date.now());
    } catch (err) {
      console.error('Failed to load prices:', err);
    } finally {
      setPricesLoading(false);
    }
  }, [selectedItem, tier, enchantment, setPrices, setPricesLoading]);

  useEffect(() => {
    loadPrices(false);
  }, [loadPrices]);

  // Format "Xm ago" / "just now" label for the last fetch timestamp.
  // Reads from nowTick instead of Date.now() so it's a pure computation.
  const fetchedAgoLabel = useMemo(() => {
    if (!fetchedAt) return '';
    const sec = Math.floor((nowTick - fetchedAt) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  }, [fetchedAt, nowTick]);

  const craftedItemId = useMemo(() => {
    if (!selectedItem) return '';
    return resolveItemId(selectedItem.baseId, tier, enchantment);
  }, [selectedItem, tier, enchantment]);

  const altVariantId = useMemo(() => {
    if (!craftedItemId) return undefined;
    if (craftedItemId.includes('_2H_')) return craftedItemId.replace('_2H_', '_MAIN_');
    if (craftedItemId.includes('_MAIN_')) return craftedItemId.replace('_MAIN_', '_2H_');
    return undefined;
  }, [craftedItemId]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();

    const sellMap = buildPriceMap(prices, settings.sellingLocation, true);

    // Build per-item listing arrays so we can median-filter outliers on
    // BOTH sides. Without this, a single joke listing (e.g. somebody
    // posts T4.3 Leather at 70k in a thin market) becomes the 'price' the
    // calculator uses, making the craft look 10x more expensive than it
    // really is. 2x median drops outliers on the high side.
    const byItemCityPrices = new Map<string, number[]>();
    for (const price of prices) {
      if (price.sell_price_min <= 0) continue;
      if (price.city === 'Black Market' || price.city === 'Caerleon') continue;
      if (!byItemCityPrices.has(price.item_id)) byItemCityPrices.set(price.item_id, []);
      byItemCityPrices.get(price.item_id)!.push(price.sell_price_min);
    }

    // Cheapest non-outlier price across all cities — what you'd pay to buy
    // the material. Used for materials regardless of craft city.
    const allCitiesMaterials = new Map<string, number>();
    // Highest non-outlier sell price across royal cities — what you get
    // selling the crafted item.
    const allCitiesSell = new Map<string, number>();

    for (const [id, list] of byItemCityPrices.entries()) {
      if (list.length === 0) continue;
      const sorted = [...list].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const filtered = list.filter(p => p <= median * 2);
      if (filtered.length === 0) continue;
      allCitiesMaterials.set(id, Math.min(...filtered));
      allCitiesSell.set(id, Math.max(...filtered));
    }

    // Materials: use the filtered cheapest across ALL cities. The craft
    // city's individual price is no longer authoritative — in thin markets
    // the craft city might be the one hosting the outlier listing.
    //
    // CRITICAL: skip the crafted item ID itself. allCitiesMaterials.get
    // returns the CHEAPEST sell price across cities, which is what a buyer
    // pays — never what a crafter receives. Letting it land in the map
    // for the output item used to "leak" through if the sellMap+sellPrice
    // fallback below both came back empty, making the calc treat the
    // output as costing the same as the cheapest sell elsewhere → fake
    // catastrophic loss.
    allCitiesMaterials.forEach((v, k) => {
      if (k !== craftedItemId) map.set(k, v);
    });

    // Resolve sell price for crafted item. Match ONLY the exact itemId —
    // the old altId (2H_↔MAIN_) fallback cross-contaminated distinct items
    // like Battleaxe (MAIN_AXE) and Greataxe (2H_AXE), silently showing
    // the wrong item's market price when one of them had no listings.
    if (selectedItem) {
      const itemId = craftedItemId;
      let sellPrice = sellMap.get(itemId) ?? 0;
      // Fallback: best sell price from any city (NOT buy orders)
      if (sellPrice <= 0) {
        sellPrice = allCitiesSell.get(itemId) ?? 0;
      }
      if (sellPrice > 0) map.set(itemId, sellPrice);
      // No fallback set: the calc will see 0 sellPrice and naturally
      // report 0 revenue rather than a misleading "cheapest material price"
      // sneaking in from allCitiesMaterials.
    }

    // Custom prices (highest priority). Skip entries with price <= 0 so
    // a cleared override falls back to the API price instead of zeroing it.
    // Apply city-specific keys first, then the special `:custom` suffix so
    // an explicit inline override beats older per-city custom prices for
    // the same item.
    const customEntries = Object.entries(customPrices).filter(([, p]) => p > 0);
    for (const [key, price] of customEntries) {
      if (key.endsWith(':custom')) continue;
      const [itemId] = key.split(':');
      map.set(itemId, price);
    }
    for (const [key, price] of customEntries) {
      if (!key.endsWith(':custom')) continue;
      const [itemId] = key.split(':');
      map.set(itemId, price);
    }

    return map;
    // settings.craftingCity used to be a dep back when the craft-city price
    // overrode the cross-city cheapest — that override has been removed
    // (see comment above) so craftingCity no longer affects this map.
  }, [prices, settings.sellingLocation, customPrices, selectedItem, craftedItemId]);

  const returnRate = useMemo(() => {
    if (settings.returnRateOverride !== null) return settings.returnRateOverride / 100;
    if (!selectedItem) return 0.152;
    // Today's station / production bonus is part of the same LPB pool as city
    // bonus and focus, then the combined value is converted to RR.
    return calculateReturnRate(
      settings.craftingCity,
      selectedItem.subcategory,
      settings.useFocus,
      0,
      settings.dailyStationBonusPct || 0,
    );
  }, [settings.craftingCity, settings.useFocus, settings.returnRateOverride, settings.dailyStationBonusPct, selectedItem]);

  const result = useMemo(() => {
    if (!selectedItem) return null;
    return calculateCrafting(
      selectedItem, tier, enchantment, settings.quantity,
      returnRate, settings.feeSettings, settings.usageFeePerHundred, priceMap,
    );
  }, [selectedItem, tier, enchantment, settings, returnRate, priceMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <CraftingSettings />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left sidebar - Item selection */}
        <div className="lg:col-span-3 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:sticky lg:top-20 space-y-2">
          {recentItems.length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-lighter p-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-1.5 px-1">
                Recent · click to reload
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentItems.map(item => {
                  const active = selectedItem?.baseId === item.baseId;
                  return (
                    <button
                      key={item.baseId}
                      onClick={() => setSelectedItem(item)}
                      title={item.name}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded-md border transition-colors ${
                        active
                          ? 'bg-gold/20 border-gold/60 text-gold-light'
                          : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'
                      }`}
                    >
                      <ItemIcon itemId={`T4_${item.baseId}`} size={20} quality={1} className="rounded shrink-0" />
                      <span className="text-[10px] font-semibold truncate max-w-[80px]">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <ItemSearch onSelect={setSelectedItem} selectedItem={selectedItem} />
        </div>

        {/* Main content */}
        <div className="lg:col-span-6 space-y-4">
          {selectedItem ? (
            <>
              <div className="bg-surface rounded-xl border border-surface-lighter p-4">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <h2 className="text-lg font-semibold text-gold">{selectedItem.name}</h2>
                  {pricesLoading && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      <span className="text-xs text-zinc-500">Loading...</span>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {fetchedAt && !pricesLoading && (
                      <span className="text-[10px] text-zinc-500" title={new Date(fetchedAt).toLocaleString()}>
                        Prices updated {fetchedAgoLabel}
                      </span>
                    )}
                    <button
                      onClick={() => loadPrices(true)}
                      disabled={pricesLoading}
                      className="text-xs font-bold text-gold bg-gold/10 hover:bg-gold/20 border border-gold/30 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      title="Bypass the 30s cache and fetch the latest market data"
                    >
                      <span className={pricesLoading ? 'animate-spin inline-block' : 'inline-block'}>&#8635;</span>
                      {pricesLoading ? 'Refreshing...' : 'Refresh Prices'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-6">
                  <TierSelector value={tier} onChange={(t: Tier) => setTier(t)} />
                  <EnchantmentSelector value={enchantment} onChange={(e: Enchantment) => setEnchantment(e)} />
                </div>

                {/* Material budget → auto-quantity helper */}
                {selectedItem.recipe.length > 0 && (() => {
                  // Use the primary (largest-count) recipe ingredient as
                  // the limiting resource. Includes reinvest loop gain.
                  const primary = [...selectedItem.recipe].sort((a, b) => b.count - a.count)[0];
                  const matLabel = MATERIAL_LABELS[primary.materialBase] ?? primary.materialBase;
                  const effectivePerCraft = primary.count * Math.max(0.01, 1 - returnRate);
                  const previewQty = budgetInput && budgetInput > 0
                    ? Math.max(1, Math.floor(budgetInput / effectivePerCraft))
                    : null;
                  return (
                    <div
                      className="mt-3 pt-3 border-t border-surface-lighter flex items-center gap-2 flex-wrap"
                      title={`Enter how many T${tier}${enchantment > 0 ? '.' + enchantment : ''} ${matLabel} you have in stock — quantity auto-updates based on the current return rate.`}
                    >
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        I have:
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={budgetInput}
                        placeholder="e.g. 999"
                        onChange={(e) => {
                          const n = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                          setBudgetInput(n);
                          if (typeof n === 'number' && n > 0 && effectivePerCraft > 0) {
                            const qty = Math.max(1, Math.floor(n / effectivePerCraft));
                            updateSettings({ quantity: Math.min(99999, qty) });
                          }
                        }}
                        className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-gold/40"
                      />
                      <span className="text-xs text-zinc-400">
                        T{tier}{enchantment > 0 ? '.' + enchantment : ''} {matLabel}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-auto">
                        {previewQty !== null ? (
                          <>
                            → <span className="text-gold font-bold tabular-nums">{previewQty}</span> crafts · uses <span className="text-zinc-400">{(previewQty * effectivePerCraft).toFixed(0)}</span> of {budgetInput}{' '}
                            <span className="text-zinc-600">({formatPercent(returnRate * 100)} RR)</span>
                          </>
                        ) : (
                          <span className="text-zinc-600">Recipe uses {primary.count} {matLabel.toLowerCase()} per craft</span>
                        )}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <ReturnRateSlider subcategory={selectedItem.subcategory} baseId={selectedItem.baseId} itemName={selectedItem.name} />

              {result && <RecipeDisplay result={result} prices={prices} />}

              <JournalBoostCard
                onNetChange={setJournalNet}
                selectedItem={selectedItem}
                tier={tier}
                enchantment={enchantment}
                quantity={settings.quantity}
                hasPremium={settings.hasPremium}
              />
            </>
          ) : (
            <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
              <div className="text-6xl mb-4 opacity-20">&#9876;</div>
              <h2 className="text-lg text-zinc-400 mb-2">Select an Item</h2>
              <p className="text-sm text-zinc-500">
                Choose an item from the list to calculate crafting costs and profit.
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar - Profit summary + market liquidity */}
        <div className="lg:col-span-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto space-y-4">
          {result ? (
            <ProfitSummary result={result} prices={prices} itemId={craftedItemId} altItemId={altVariantId} journalNet={journalNet} />
          ) : (
            <div className="bg-surface rounded-xl border border-surface-lighter p-6 text-center">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profit</div>
              <div className="text-2xl text-zinc-600">---</div>
            </div>
          )}
          {selectedItem && craftedItemId && (
            <LiquidityCard itemId={craftedItemId} altItemId={altVariantId} />
          )}
        </div>
      </div>
    </div>
  );
}
