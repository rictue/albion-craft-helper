import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { ALL_ITEMS } from '../../data/items';
import { CITIES } from '../../data/cities';
import { fetchPrices } from '../../services/api';
import { calculateCrafting } from '../../utils/profitCalculator';
import { calculateReturnRate } from '../../utils/returnRate';
import { resolveItemId, resolveMaterialId, resolveArtifactId } from '../../utils/itemIdParser';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import TierSelector from '../common/TierSelector';
import EnchantmentSelector from '../common/EnchantmentSelector';
import type { Tier, Enchantment, ItemDefinition, MarketPrice } from '../../types';

interface BmQualityOrder {
  quality: number;
  price: number;
  priceMin: number;
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
  const { settings, setSelectedItem, setTier, setEnchantment } = useAppStore();

  const [tier, setLocalTier] = useState<Tier>(4);
  const [enchantment, setLocalEnchant] = useState<Enchantment>(0);
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
      const allIds = new Set<string>();
      for (const item of ALL_ITEMS) {
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
      // For BM mode: fetch all qualities to count buy orders
      const useAllQualities = blackMarketOnly;
      const totalBatches = Math.ceil(idArray.length / batchSize);

      for (let i = 0; i < idArray.length; i += batchSize) {
        const batch = idArray.slice(i, i + batchSize);
        const data = await fetchPrices(batch, undefined, useAllQualities);
        allPrices.push(...data);
        setProgress(Math.round(((i / batchSize + 1) / totalBatches) * 100));
      }

      // Build price maps per city
      const materialPriceByCity = new Map<string, Map<string, number>>();
      const sellPriceByCity = new Map<string, Map<string, number>>();

      for (const city of CITIES) {
        const matMap = new Map<string, number>();
        const sellMap = new Map<string, number>();
        for (const p of allPrices) {
          if (p.city !== city.id) continue;
          if (p.sell_price_min > 0) {
            const existing = matMap.get(p.item_id);
            if (!existing || p.sell_price_min < existing) matMap.set(p.item_id, p.sell_price_min);
            sellMap.set(p.item_id, p.sell_price_min);
          }
        }
        materialPriceByCity.set(city.id, matMap);
        sellPriceByCity.set(city.id, sellMap);
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

      const craftCity = settings.craftingCity;
      const craftMaterials = materialPriceByCity.get(craftCity) || new Map();
      const scanResults: ScanResult[] = [];

      for (const item of ALL_ITEMS) {
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
          for (const sellCityId of SELL_CITIES) {
            const cityPrices = sellPriceByCity.get(sellCityId);
            if (!cityPrices) continue;
            const sellPrice = cityPrices.get(itemId) || (altId ? cityPrices.get(altId) : 0) || 0;
            if (sellPrice <= 0) continue;
            priceMap.set(itemId, sellPrice);

            const rr = calculateReturnRate(craftCity, item.subcategory, settings.useFocus);
            const result = calculateCrafting(item, tier, enchantment, 1, rr, settings.hasPremium, settings.usageFeePerHundred, priceMap);

            if (result.profit > 0) {
              scanResults.push({
                item, craftCity, sellCity: sellCityId,
                materialCost: result.effectiveMaterialCost, sellPrice,
                profit: result.profit, margin: result.profitMargin, itemId,
              });
            }
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

        const rr = calculateReturnRate(craftCity, item.subcategory, settings.useFocus);
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

      // Best per item
      const final = new Map<string, ScanResult>();
      for (const r of scanResults) {
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
  }, [tier, enchantment, settings, blackMarketOnly]);

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
    navigate('/');
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
          <div className="flex items-end gap-3 text-sm">
            <span className="text-slate-500">Craft:</span>
            <span className="text-gold">{settings.craftingCity}</span>
            {settings.hasPremium && <span className="text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded">Premium</span>}
            {settings.useFocus && <span className="text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">Focus</span>}
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
            <p className="text-xs text-slate-500 mt-1">Fetching prices... {progress}%</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-lighter flex justify-between items-center">
            <h3 className={`text-sm font-medium ${blackMarketOnly ? 'text-red-300' : 'text-gold'}`}>
              {results.length} profitable crafts{blackMarketOnly ? ' on Black Market' : ''}
            </h3>
            {scannedAt && <span className="text-xs text-slate-500">Scanned at {scannedAt}</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-surface-lighter">
                  <th className="text-left px-3 py-2.5 w-12"></th>
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
                {sorted.map((r) => (
                  <tr
                    key={r.item.baseId}
                    onClick={() => handleItemClick(r)}
                    className="border-b border-surface-lighter/50 hover:bg-surface-light cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <ItemIcon itemId={r.itemId} size={32} className="bg-surface-lighter rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-slate-200">{r.item.name}</span>
                      {r.item.artifactId && <span className="text-purple-400 text-xs ml-1">*</span>}
                    </td>
                    {!blackMarketOnly && (
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          r.sellCity === 'Black Market' ? 'bg-red-900/30 text-red-300' : 'bg-surface-lighter text-slate-300'
                        }`}>{r.sellCity}</span>
                      </td>
                    )}
                    {blackMarketOnly && (
                      <td className="px-3 py-2.5">
                        {r.bmQualities && r.bmQualities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {[...r.bmQualities].sort((a, b) => a.quality - b.quality).map((q) => {
                              const qNames = ['', 'Normal', 'Good', 'Outstanding', 'Excellent', 'Masterpiece'];
                              const qColors = ['', 'text-slate-300', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
                              const hasMultiple = q.priceMin > 0 && q.priceMin !== q.price;
                              return (
                                <span key={q.quality} className={`text-[11px] px-1.5 py-0.5 rounded bg-surface-lighter ${qColors[q.quality] || 'text-slate-400'}`}>
                                  {qNames[q.quality]}: {formatSilver(q.price)}
                                  {hasMultiple && <span className="text-slate-500 ml-0.5">(2+)</span>}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right text-slate-400">{formatSilver(r.materialCost)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-200">{formatSilver(r.sellPrice)}</td>
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
                              <span className="text-[10px] text-slate-500">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">{blackMarketOnly ? '&#9876;' : '&#128200;'}</div>
          <h2 className="text-lg text-slate-400 mb-2">{title}</h2>
          <p className="text-sm text-slate-500">{emptyText}</p>
          <p className="text-xs text-slate-600 mt-2">Settings (craft city, premium, focus) from Calculator page.</p>
        </div>
      )}
    </div>
  );
}
