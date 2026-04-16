import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { ALL_ITEMS } from '../../data/items';
import { ZVZ_META_BASE_IDS } from '../../data/zvzMeta';
import { CITIES } from '../../data/cities';
import { fetchPrices } from '../../services/api';
import { calculateCrafting } from '../../utils/profitCalculator';
import { calculateReturnRate } from '../../utils/returnRate';
import { resolveItemId, resolveMaterialId, resolveArtifactId } from '../../utils/itemIdParser';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { ageHoursOf, formatAge, ageColor } from '../../utils/dataAge';
import ItemIcon from '../common/ItemIcon';
import TierSelector from '../common/TierSelector';
import EnchantmentSelector from '../common/EnchantmentSelector';
import type { Tier, Enchantment, ItemDefinition, MarketPrice } from '../../types';

interface BmQualityOrder {
  quality: number;
  price: number;
  priceMin: number;
}

interface CityPriceInfo {
  city: string;
  sellPrice: number;
  profit: number;
  margin: number;
  ageHours: number;
}

interface ScanResult {
  item: ItemDefinition;
  craftCity: string;
  sellCity: string;
  materialCost: number;
  sellPrice: number;
  profit: number;
  margin: number;
  itemId: string;
  /** Sell prices across ALL cities for this item (sorted by profit desc). */
  allCities?: CityPriceInfo[];
  // BM specific
  bmBuyOrders?: number;
  bmQualities?: BmQualityOrder[];
  cheapestFlipCity?: string;
  cheapestFlipPrice?: number;
  flipProfit?: number;
  isCraftBetter?: boolean;
}

type SortKey = 'profit' | 'margin' | 'sellPrice' | 'materialCost' | 'name';

const SELL_CITIES = CITIES.filter(c => c.id !== 'Black Market').map(c => c.id);

interface Props {
  blackMarketOnly?: boolean;
}

export default function SuggestedCrafts({ blackMarketOnly = false }: Props) {
  const navigate = useNavigate();
  const { settings, setSelectedItem, setTier, setEnchantment, updateSettings } = useAppStore();

  const [tier, setLocalTier] = useState<Tier>(4);
  const [enchantment, setLocalEnchant] = useState<Enchantment>(0);
  // Local override for the craft city — changing it here also writes back to
  // global settings so the main Calculator picks up the same city when the
  // user jumps over from a suggestion row.
  const [localCraftCity, setLocalCraftCity] = useState<string>(settings.craftingCity);
  const handleCityChange = (city: string) => {
    setLocalCraftCity(city);
    updateSettings({ craftingCity: city });
  };
  const [zvzOnly, setZvzOnly] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [sortAsc, setSortAsc] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setProgress(0);
    setResults([]);

    try {
      // Use the exported Set directly instead of relying on the zvzMeta
      // property mutation — more reliable at runtime.
      const itemPool = zvzOnly
        ? ALL_ITEMS.filter(i => ZVZ_META_BASE_IDS.has(i.baseId))
        : ALL_ITEMS;
      const allIds = new Set<string>();
      for (const item of itemPool) {
        const itemId = resolveItemId(item.baseId, tier, enchantment);
        allIds.add(itemId);
        if (itemId.includes('_2H_')) allIds.add(itemId.replace('_2H_', '_MAIN_'));
        else if (itemId.includes('_MAIN_')) allIds.add(itemId.replace('_MAIN_', '_2H_'));

        for (const req of item.recipe) {
          allIds.add(resolveMaterialId(req.materialBase, tier, enchantment));
        }
        if (item.artifactId) {
          allIds.add(resolveArtifactId(item.artifactId, tier));
        }
      }

      const idArray = [...allIds];
      const allPrices: MarketPrice[] = [];
      const batchSize = 50;
      const totalBatches = Math.ceil(idArray.length / batchSize);

      for (let i = 0; i < idArray.length; i += batchSize) {
        const batch = idArray.slice(i, i + batchSize);
        // Always fetch all qualities — the old blackMarketOnly guard forced
        // quality=1 in normal mode, which returned fake 300K prices instead
        // of the real 27K Outstanding-quality market. This was also why ZvZ
        // scans returned 0 results (all items looked unprofitable at Q1).
        const data = await fetchPrices(batch);
        allPrices.push(...data);
        setProgress(Math.round(((i / batchSize + 1) / totalBatches) * 100));
      }

      // Build price maps per city + date maps for age display
      const materialPriceByCity = new Map<string, Map<string, number>>();
      const sellPriceByCity = new Map<string, Map<string, number>>();
      const sellDateByCity = new Map<string, Map<string, string>>();

      for (const city of CITIES) {
        const matMap = new Map<string, number>();
        const sellMap = new Map<string, number>();
        const dateMap = new Map<string, string>();
        for (const p of allPrices) {
          if (p.city !== city.id) continue;
          if (p.sell_price_min > 0) {
            const existing = matMap.get(p.item_id);
            if (!existing || p.sell_price_min < existing) {
              matMap.set(p.item_id, p.sell_price_min);
              if (p.sell_price_min_date) dateMap.set(p.item_id, p.sell_price_min_date);
            }
            sellMap.set(p.item_id, p.sell_price_min);
          }
        }
        materialPriceByCity.set(city.id, matMap);
        sellPriceByCity.set(city.id, sellMap);
        sellDateByCity.set(city.id, dateMap);
      }

      const cheapestMaterials = new Map<string, number>();
      for (const p of allPrices) {
        if (p.sell_price_min > 0) {
          const existing = cheapestMaterials.get(p.item_id);
          if (!existing || p.sell_price_min < existing) cheapestMaterials.set(p.item_id, p.sell_price_min);
        }
      }

      // For BM: find cheapest city sell price per item (for flip comparison)
      const cheapestSellByItem = new Map<string, { price: number; city: string }>();
      for (const cityId of SELL_CITIES) {
        const cityPrices = sellPriceByCity.get(cityId);
        if (!cityPrices) continue;
        for (const [itemId, price] of cityPrices) {
          const existing = cheapestSellByItem.get(itemId);
          if (!existing || price < existing.price) {
            cheapestSellByItem.set(itemId, { price, city: cityId });
          }
        }
      }

      // Count BM buy orders per item (estimate from price entries with buy_price_max > 0)
      const bmBuyOrderCount = new Map<string, number>();
      for (const p of allPrices) {
        if (p.city === 'Black Market' && p.buy_price_max > 0) {
          bmBuyOrderCount.set(p.item_id, (bmBuyOrderCount.get(p.item_id) || 0) + 1);
        }
      }

      const craftCity = localCraftCity;
      const craftMaterials = materialPriceByCity.get(craftCity) || new Map();
      const scanResults: ScanResult[] = [];

      for (const item of itemPool) {
        const itemId = resolveItemId(item.baseId, tier, enchantment);
        const altId = itemId.includes('_2H_')
          ? itemId.replace('_2H_', '_MAIN_')
          : itemId.includes('_MAIN_') ? itemId.replace('_MAIN_', '_2H_') : null;

        const priceMap = new Map<string, number>();
        let hasMissingPrices = false;

        for (const req of item.recipe) {
          const matId = resolveMaterialId(req.materialBase, tier, enchantment);
          const matPrice = craftMaterials.get(matId) || cheapestMaterials.get(matId) || 0;
          if (matPrice === 0) hasMissingPrices = true;
          priceMap.set(matId, matPrice);
        }
        if (item.artifactId) {
          const artId = resolveArtifactId(item.artifactId, tier);
          const artPrice = craftMaterials.get(artId) || cheapestMaterials.get(artId) || 0;
          if (artPrice === 0) hasMissingPrices = true;
          priceMap.set(artId, artPrice);
        }

        // Skip items with missing material/artifact prices - profit would be fake
        if (hasMissingPrices) continue;

        if (!blackMarketOnly) {
          // Collect all city prices for this item, filter outliers using median
          const allCityPrices: { city: string; price: number }[] = [];
          for (const sellCityId of SELL_CITIES) {
            const cityPrices = sellPriceByCity.get(sellCityId);
            if (!cityPrices) continue;
            const sellPrice = cityPrices.get(itemId) || (altId ? cityPrices.get(altId) : 0) || 0;
            if (sellPrice > 0) allCityPrices.push({ city: sellCityId, price: sellPrice });
          }

          // Filter outliers: remove prices > 2x median. 5x used to let through
          // stale single-listing spikes (e.g. T6.1 Muisak "selling" for 14M
          // because one person posted an absurd ask); 2x matches the rest of
          // the site's sanity bar.
          if (allCityPrices.length >= 2) {
            const sorted = [...allCityPrices].sort((a, b) => a.price - b.price);
            const median = sorted[Math.floor(sorted.length / 2)].price;
            const filtered = allCityPrices.filter(cp => cp.price <= median * 2);
            allCityPrices.length = 0;
            allCityPrices.push(...filtered);
          }

          // Compute profit for EACH city so we can show a per-city breakdown
          // when the user expands a row, just like the Calculator's city list.
          const baseRr = calculateReturnRate(craftCity, item.subcategory, settings.useFocus);
          const rr = baseRr;
          const perCityResults: CityPriceInfo[] = [];
          let bestCityResult: { city: string; price: number; profit: number; margin: number; matCost: number } | null = null;

          for (const cp of allCityPrices) {
            priceMap.set(itemId, cp.price);
            const result = calculateCrafting(item, tier, enchantment, 1, rr, settings.hasPremium, settings.usageFeePerHundred, priceMap);
            const dateStr = sellDateByCity.get(cp.city)?.get(itemId) ?? (altId ? sellDateByCity.get(cp.city)?.get(altId) : undefined);
            perCityResults.push({
              city: cp.city,
              sellPrice: cp.price,
              profit: result.profit,
              margin: result.profitMargin,
              ageHours: ageHoursOf(dateStr),
            });
            if (!bestCityResult || result.profit > bestCityResult.profit) {
              bestCityResult = { city: cp.city, price: cp.price, profit: result.profit, margin: result.profitMargin, matCost: result.effectiveMaterialCost };
            }
          }
          perCityResults.sort((a, b) => b.profit - a.profit);

          if (bestCityResult && bestCityResult.profit > 0) {
            scanResults.push({
              item, craftCity, sellCity: bestCityResult.city,
              materialCost: bestCityResult.matCost, sellPrice: bestCityResult.price,
              profit: bestCityResult.profit, margin: bestCityResult.margin, itemId,
              allCities: perCityResults,
            });
          }
        }

        // Black Market - collect all quality buy orders
        const bmEntries = allPrices.filter(p => p.city === 'Black Market' && (p.item_id === itemId || p.item_id === altId) && p.buy_price_max > 0);
        if (bmEntries.length === 0) continue;

        // Collect quality breakdown
        const bmQualities: BmQualityOrder[] = bmEntries.map(bp => ({
          quality: bp.quality,
          price: bp.buy_price_max,
          priceMin: bp.buy_price_min,
        })).sort((a, b) => b.price - a.price);

        // Use best (highest) buy price for profit calc
        const bestBmPrice = bmQualities[0].price;
        priceMap.set(itemId, bestBmPrice);

        const baseRr = calculateReturnRate(craftCity, item.subcategory, settings.useFocus);
        const rr = baseRr;
        const result = calculateCrafting(item, tier, enchantment, 1, rr, settings.hasPremium, settings.usageFeePerHundred, priceMap);

        const flipInfo = cheapestSellByItem.get(itemId) || (altId ? cheapestSellByItem.get(altId) : undefined);
        const flipProfit = flipInfo ? bestBmPrice * (1 - (settings.hasPremium ? 0.065 : 0.105)) - flipInfo.price : undefined;

        if (result.profit > 0) {
          scanResults.push({
            item, craftCity, sellCity: 'Black Market',
            materialCost: result.effectiveMaterialCost,
            sellPrice: bestBmPrice,
            profit: result.profit, margin: result.profitMargin, itemId,
            bmBuyOrders: bmEntries.length,
            bmQualities,
            cheapestFlipCity: flipInfo?.city,
            cheapestFlipPrice: flipInfo?.price,
            flipProfit,
            isCraftBetter: flipInfo ? result.effectiveMaterialCost < flipInfo.price : true,
          });
        }
      }

      // Sanity filters — any of these firing means the sell price is almost
      // certainly a stale/joke listing, not a real market price:
      //   1. Margin > 200% (selling for 3x the craft cost is unrealistic)
      //   2. Sell price > 50x craft cost (e.g. Muisak 14M vs 77K cost)
      //   3. Sell price > 5M per unit for a non-artifact (T6.1 gear
      //      almost never sells for >5M legitimately)
      const final = new Map<string, ScanResult>();
      for (const r of scanResults) {
        if (r.margin > 200) continue;
        if (r.materialCost > 0 && r.sellPrice / r.materialCost > 50) continue;
        if (!r.item.artifactId && r.sellPrice > 5_000_000) continue;
        const key = r.item.baseId;
        const existing = final.get(key);
        if (!existing || r.profit > existing.profit) final.set(key, r);
      }

      setResults([...final.values()]);
      setScannedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
      setProgress(100);
    }
  }, [tier, enchantment, settings, blackMarketOnly, localCraftCity, zvzOnly]);

  const sorted = useMemo(() => {
    const arr = [...results];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'profit': cmp = a.profit - b.profit; break;
        case 'margin': cmp = a.margin - b.margin; break;
        case 'sellPrice': cmp = a.sellPrice - b.sellPrice; break;
        case 'materialCost': cmp = a.materialCost - b.materialCost; break;
        case 'name': cmp = a.item.name.localeCompare(b.item.name); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [results, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleItemClick = (r: ScanResult) => {
    setSelectedItem(r.item);
    setTier(tier);
    setEnchantment(enchantment);
    navigate('/calculator');
  };

  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  const title = blackMarketOnly ? 'Black Market Crafts' : 'Suggested Crafts';
  const emptyText = blackMarketOnly
    ? 'Scan to find items profitable to craft and sell on the Black Market.'
    : 'Select tier & enchantment, then click "Scan Market" to find profitable crafts.';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className={`rounded-xl border p-4 ${blackMarketOnly ? 'bg-red-950/20 border-red-900/30' : 'bg-surface border-surface-lighter'}`}>
        <div className="flex flex-wrap items-end gap-6">
          <TierSelector value={tier} onChange={setLocalTier} />
          <EnchantmentSelector value={enchantment} onChange={setLocalEnchant} />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">Craft City</label>
            <select
              value={localCraftCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40 min-w-[140px]"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-1.5 pb-2">
            <button
              onClick={() => setZvzOnly(!zvzOnly)}
              className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${
                zvzOnly
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 ring-1 ring-red-500/30'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
              }`}
              title="Filter to ZvZ meta items only (top 30 items from 25-50+ player fights, sourced from AFM kill data)"
            >
              ⚔ ZvZ META
            </button>
            {settings.hasPremium && <span className="text-[10px] bg-gold/20 text-gold px-2 py-1 rounded font-semibold">PREMIUM</span>}
            {settings.useFocus && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded font-semibold">FOCUS</span>}
            {/* Daily station bonus intentionally NOT shown here — it's
                per-station and would mislead the scanner results. */}
          </div>
          <button
            onClick={scan}
            disabled={scanning}
            className={`ml-auto rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              blackMarketOnly
                ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800/30'
                : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
            }`}
          >
            {scanning ? 'Scanning...' : blackMarketOnly ? 'Scan Black Market' : 'Scan Market'}
          </button>
        </div>
        {scanning && (
          <div className="mt-3">
            <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${blackMarketOnly ? 'bg-red-500' : 'bg-gold'}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Fetching prices... {progress}%</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-lighter flex justify-between items-center">
            <h3 className={`text-sm font-medium ${blackMarketOnly ? 'text-red-300' : 'text-gold'}`}>
              {results.length} profitable crafts{blackMarketOnly ? ' on Black Market' : ''}
            </h3>
            {scannedAt && <span className="text-xs text-zinc-500">Scanned at {scannedAt}</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-lighter">
                  <th className="text-left px-3 py-2.5 w-[68px]"></th>
                  <th className="text-left px-3 py-2.5 cursor-pointer hover:text-gold" onClick={() => handleSort('name')}>Item{sortIcon('name')}</th>
                  {!blackMarketOnly && <th className="text-left px-3 py-2.5">Sell At</th>}
                  {blackMarketOnly && <th className="text-left px-3 py-2.5">BM Qualities</th>}
                  <th className="text-right px-3 py-2.5 cursor-pointer hover:text-gold" onClick={() => handleSort('materialCost')}>Craft Cost{sortIcon('materialCost')}</th>
                  <th className="text-right px-3 py-2.5 cursor-pointer hover:text-gold" onClick={() => handleSort('sellPrice')}>{blackMarketOnly ? 'Best Buy' : 'Sell'}{sortIcon('sellPrice')}</th>
                  <th className="text-right px-3 py-2.5 cursor-pointer hover:text-gold" onClick={() => handleSort('profit')}>Profit{sortIcon('profit')}</th>
                  <th className="text-right px-3 py-2.5 cursor-pointer hover:text-gold" onClick={() => handleSort('margin')}>Margin{sortIcon('margin')}</th>
                  {blackMarketOnly && <th className="text-left px-3 py-2.5">Craft vs Flip</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const isExpanded = expandedItem === r.item.baseId;
                  return (
                  <React.Fragment key={r.item.baseId}>
                  <tr
                    onClick={() => setExpandedItem(isExpanded ? null : r.item.baseId)}
                    className={`border-b border-surface-lighter/50 hover:bg-surface-light cursor-pointer transition-colors ${isExpanded ? 'bg-surface-light' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="w-14 h-14 flex items-center justify-center">
                        <ItemIcon itemId={r.itemId} size={56} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-zinc-200 font-medium">{r.item.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gold font-bold">T{tier}{enchantment > 0 && `.${enchantment}`}</span>
                        {r.item.artifactId && <span className="text-purple-400 text-[10px] font-semibold">Artifact</span>}
                        <span className="text-[9px] text-zinc-600">{isExpanded ? '▲' : '▼'} {r.allCities?.length ?? 0} cities</span>
                      </div>
                    </td>
                    {!blackMarketOnly && (
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          r.sellCity === 'Black Market' ? 'bg-red-900/30 text-red-300' : 'bg-surface-lighter text-zinc-300'
                        }`}>{r.sellCity}</span>
                      </td>
                    )}
                    {blackMarketOnly && (
                      <td className="px-3 py-2.5">
                        {r.bmQualities && r.bmQualities.length > 0 ? (
                          (() => {
                            const sorted = [...r.bmQualities].sort((a, b) => a.quality - b.quality);
                            // Best quality to target: has multiple orders (2+), NOT masterpiece (q5)
                            const withMultiple = sorted.filter(q => q.priceMin > 0 && q.priceMin !== q.price && q.quality < 5);
                            const bestTarget = withMultiple.length > 0 ? withMultiple[0].quality : sorted.filter(q => q.quality < 5)[0]?.quality;
                            return (
                              <div className="flex flex-wrap gap-1">
                                {sorted.map((q) => {
                                  const qNames = ['', 'Normal', 'Good', 'Outstanding', 'Excellent', 'Masterpiece'];
                                  const qColors = ['', 'text-zinc-300', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
                                  const hasMultiple = q.priceMin > 0 && q.priceMin !== q.price;
                                  const isBest = q.quality === bestTarget;
                                  return (
                                    <span key={q.quality} className={`text-[11px] px-1.5 py-0.5 rounded ${isBest ? 'bg-gold/20 ring-1 ring-gold/40' : 'bg-surface-lighter'} ${qColors[q.quality] || 'text-zinc-400'}`}>
                                      {qNames[q.quality]}: {formatSilver(q.price)}
                                      {hasMultiple && <span className="text-zinc-500 ml-0.5">(2+)</span>}
                                      {q.quality === 5 && <span className="text-zinc-600 ml-0.5">(!)</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-zinc-600">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right text-zinc-400">{formatSilver(r.materialCost)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-200">{formatSilver(r.sellPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-profit">+{formatSilver(r.profit)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-profit">+{formatPercent(r.margin)}</td>
                    {blackMarketOnly && (
                      <td className="px-3 py-2.5">
                        {r.cheapestFlipCity ? (
                          <div className="flex flex-col gap-0.5">
                            {r.isCraftBetter ? (
                              <span className="text-xs text-green-400">
                                Craft ({formatSilver(r.materialCost)})
                              </span>
                            ) : (
                              <span className="text-xs text-blue-400">
                                Flip {r.cheapestFlipCity} ({formatSilver(r.cheapestFlipPrice || 0)})
                              </span>
                            )}
                            {r.flipProfit !== undefined && r.flipProfit > 0 && !r.isCraftBetter && (
                              <span className="text-[10px] text-zinc-500">
                                flip profit: +{formatSilver(r.flipProfit)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-green-400">Craft only</span>
                        )}
                      </td>
                    )}
                  </tr>
                  {/* Expanded per-city price breakdown */}
                  {isExpanded && r.allCities && r.allCities.length > 0 && (
                    <tr className="bg-zinc-900/60">
                      <td colSpan={blackMarketOnly ? 8 : 7} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                            Sell Prices by City — {r.item.name} T{tier}{enchantment > 0 && `.${enchantment}`}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleItemClick(r); }}
                            className="text-[10px] text-gold hover:text-gold/80 font-semibold"
                          >
                            Open in Calculator →
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                          {r.allCities.map((cp, ci) => (
                            <div
                              key={cp.city}
                              className={`flex items-center justify-between px-3 py-1.5 rounded ${
                                ci === 0 ? 'bg-green-900/20 border border-green-700/30' : 'bg-zinc-800/50'
                              }`}
                            >
                              <span className={`text-xs ${ci === 0 ? 'text-green-300 font-semibold' : 'text-zinc-400'}`}>
                                {ci === 0 && '★ '}{cp.city}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-zinc-300 tabular-nums">{formatSilver(cp.sellPrice)}</span>
                                <span className={`text-xs font-semibold tabular-nums ${cp.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {cp.profit > 0 ? '+' : ''}{formatSilver(cp.profit)}
                                </span>
                                <span className={`text-[10px] tabular-nums ${ageColor(cp.ageHours)}`}>
                                  {formatAge(cp.ageHours)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">{blackMarketOnly ? '\u2694' : '\uD83D\uDCC8'}</div>
          <h2 className="text-lg text-zinc-400 mb-2">{title}</h2>
          <p className="text-sm text-zinc-500">{emptyText}</p>
          <p className="text-xs text-zinc-600 mt-2">Settings (craft city, premium, focus) from Calculator page.</p>
        </div>
      )}
    </div>
  );
}
