import { useEffect, useCallback, useMemo, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { fetchPrices, buildPriceMap } from '../../services/api';
import { calculateCrafting } from '../../utils/profitCalculator';
import { calculateReturnRate } from '../../utils/returnRate';
import { resolveItemId, resolveMaterialId, resolveArtifactId } from '../../utils/itemIdParser';
import { formatPercent } from '../../utils/formatters';

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
import type { Tier, Enchantment } from '../../types';

export default function CraftingCalculator() {
  const {
    selectedItem, tier, enchantment,
    setSelectedItem, setTier, setEnchantment,
    settings, updateSettings, prices, setPrices, pricesLoading, setPricesLoading,
    customPrices, addToPlan,
  } = useAppStore();

  // Material budget widget — user enters 'I have X of the primary material'
  // and the quantity input is auto-computed based on the recipe's primary
  // resource count (first ingredient) AND the current return rate.
  const [budgetInput, setBudgetInput] = useState<number | ''>('');
  // Reset the budget whenever the selected item changes — the recipe
  // changes so a previous budget would be applied to a different material.
  useEffect(() => { setBudgetInput(''); }, [selectedItem, tier, enchantment]);

  // Timestamp of the last successful fetch, so we can show "Updated Xm ago"
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  // Re-render clock so the "Xm ago" label stays fresh without mutating state
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick(n => n + 1), 30_000);
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

  // Format "Xm ago" / "just now" label for the last fetch timestamp
  const fetchedAgoLabel = useMemo(() => {
    if (!fetchedAt) return '';
    const sec = Math.floor((Date.now() - fetchedAt) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  }, [fetchedAt, pricesLoading]); // pricesLoading triggers recompute on refresh

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
    allCitiesMaterials.forEach((v, k) => map.set(k, v));
    // (Craft-city override removed: prevents a single 70k outlier at the
    // current craft city from dominating the cost calculation.)

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
    }

    // Custom prices (highest priority). Skip entries with price <= 0 so
    // a cleared override falls back to the API price instead of zeroing it.
    Object.entries(customPrices).forEach(([key, price]) => {
      if (!(price > 0)) return;
      const [itemId] = key.split(':');
      map.set(itemId, price);
    });

    return map;
  }, [prices, settings.craftingCity, settings.sellingLocation, customPrices, selectedItem, craftedItemId]);

  const returnRate = useMemo(() => {
    if (settings.returnRateOverride !== null) return settings.returnRateOverride / 100;
    if (!selectedItem) return 0.152;
    const base = calculateReturnRate(settings.craftingCity, selectedItem.subcategory, settings.useFocus);
    // Today's station / production bonus is a flat RR add-on on top of
    // whatever the city + focus combo gives. User enters it as a percent.
    const daily = (settings.dailyStationBonusPct || 0) / 100;
    return Math.min(0.999, base + daily);
  }, [settings.craftingCity, settings.useFocus, settings.returnRateOverride, settings.dailyStationBonusPct, selectedItem]);

  const result = useMemo(() => {
    if (!selectedItem) return null;
    return calculateCrafting(
      selectedItem, tier, enchantment, settings.quantity,
      returnRate, settings.hasPremium, settings.usageFeePerHundred, priceMap,
    );
  }, [selectedItem, tier, enchantment, settings, returnRate, priceMap]);

  const handleAddToPlan = () => {
    if (!selectedItem) return;
    addToPlan({ item: selectedItem, tier, enchantment, quantity: settings.quantity });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <CraftingSettings />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left sidebar - Item selection */}
        <div className="lg:col-span-3 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:sticky lg:top-20">
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
            <ProfitSummary result={result} onAddToPlan={handleAddToPlan} prices={prices} itemId={craftedItemId} altItemId={altVariantId} journalNet={journalNet} />
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
