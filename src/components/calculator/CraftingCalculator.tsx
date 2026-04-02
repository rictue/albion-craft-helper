import { useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { fetchPrices, buildPriceMap } from '../../services/api';
import { calculateCrafting } from '../../utils/profitCalculator';
import { calculateReturnRate } from '../../utils/returnRate';
import { resolveItemId, resolveMaterialId, resolveArtifactId } from '../../utils/itemIdParser';
import ItemSearch from './ItemSearch';
import CraftingSettings from './CraftingSettings';
import RecipeDisplay from './RecipeDisplay';
import ReturnRateSlider from './ReturnRateSlider';
import CityPriceComparison from './CityPriceComparison';
import ProfitSummary from './ProfitSummary';
import TierSelector from '../common/TierSelector';
import EnchantmentSelector from '../common/EnchantmentSelector';
import type { Tier, Enchantment } from '../../types';

export default function CraftingCalculator() {
  const {
    selectedItem, tier, enchantment,
    setSelectedItem, setTier, setEnchantment,
    settings, prices, setPrices, pricesLoading, setPricesLoading,
    customPrices, addToPlan,
  } = useAppStore();

  const loadPrices = useCallback(async () => {
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

      const data = await fetchPrices(itemIds);
      setPrices(data);
    } catch (err) {
      console.error('Failed to load prices:', err);
    } finally {
      setPricesLoading(false);
    }
  }, [selectedItem, tier, enchantment, setPrices, setPricesLoading]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

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

    const materialMap = buildPriceMap(prices, settings.craftingCity);
    const sellMap = buildPriceMap(prices, settings.sellingLocation, true);

    // Fallback: all cities
    const allCitiesMap = new Map<string, number>();
    for (const price of prices) {
      const bestPrice = price.sell_price_min > 0
        ? price.sell_price_min
        : price.buy_price_max > 0
          ? price.buy_price_max
          : 0;
      if (bestPrice > 0) {
        const existing = allCitiesMap.get(price.item_id);
        if (!existing || bestPrice < existing) {
          allCitiesMap.set(price.item_id, bestPrice);
        }
      }
    }

    allCitiesMap.forEach((v, k) => map.set(k, v));
    materialMap.forEach((v, k) => map.set(k, v));

    // Resolve sell price: try both 2H_ and MAIN_ variants
    if (selectedItem) {
      const itemId = craftedItemId;
      const altId = itemId.includes('_2H_')
        ? itemId.replace('_2H_', '_MAIN_')
        : itemId.includes('_MAIN_')
          ? itemId.replace('_MAIN_', '_2H_')
          : null;

      // From selling location
      sellMap.forEach((v, k) => {
        if (k === itemId) map.set(itemId, v);
        if (altId && k === altId && !map.has(itemId)) map.set(itemId, v);
      });

      // Fallback: from all cities
      if (!map.has(itemId) || map.get(itemId) === 0) {
        const altPrice = altId ? allCitiesMap.get(altId) : undefined;
        if (altPrice) map.set(itemId, altPrice);
      }
    }

    // Cross-map all 2H_↔MAIN_ variants so any lookup works
    const crossKeys = [...map.keys()];
    for (const k of crossKeys) {
      let alt: string | null = null;
      if (k.includes('_2H_')) alt = k.replace('_2H_', '_MAIN_');
      else if (k.includes('_MAIN_')) alt = k.replace('_MAIN_', '_2H_');
      if (alt && !map.has(alt)) map.set(alt, map.get(k)!);
    }

    // Custom prices (highest priority)
    Object.entries(customPrices).forEach(([key, price]) => {
      const [itemId] = key.split(':');
      map.set(itemId, price);
    });

    return map;
  }, [prices, settings.craftingCity, settings.sellingLocation, customPrices, selectedItem, craftedItemId]);

  const returnRate = useMemo(() => {
    if (settings.returnRateOverride !== null) return settings.returnRateOverride / 100;
    if (!selectedItem) return 0.152;
    return calculateReturnRate(settings.craftingCity, selectedItem.subcategory, settings.useFocus);
  }, [settings.craftingCity, settings.useFocus, settings.returnRateOverride, selectedItem]);

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
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gold">{selectedItem.name}</h2>
                  {pricesLoading && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      <span className="text-xs text-slate-500">Loading...</span>
                    </div>
                  )}
                  <button
                    onClick={loadPrices}
                    className="ml-auto text-xs text-slate-500 hover:text-gold transition-colors px-2 py-1 rounded hover:bg-surface-light"
                    title="Refresh prices"
                  >
                    &#8635; Refresh
                  </button>
                </div>
                <div className="flex gap-6">
                  <TierSelector value={tier} onChange={(t: Tier) => setTier(t)} />
                  <EnchantmentSelector value={enchantment} onChange={(e: Enchantment) => setEnchantment(e)} />
                </div>
              </div>

              <ReturnRateSlider subcategory={selectedItem.subcategory} />

              {result && <RecipeDisplay result={result} />}

              {prices.length > 0 && (
                <CityPriceComparison
                  prices={prices}
                  itemId={craftedItemId}
                  mainVariantId={altVariantId}
                />
              )}
            </>
          ) : (
            <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
              <div className="text-6xl mb-4 opacity-20">&#9876;</div>
              <h2 className="text-lg text-slate-400 mb-2">Select an Item</h2>
              <p className="text-sm text-slate-500">
                Choose an item from the list to calculate crafting costs and profit.
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar - Profit summary */}
        <div className="lg:col-span-3 lg:sticky lg:top-20">
          {result ? (
            <ProfitSummary result={result} onAddToPlan={handleAddToPlan} />
          ) : (
            <div className="bg-surface rounded-xl border border-surface-lighter p-6 text-center">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Profit</div>
              <div className="text-2xl text-slate-600">---</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
