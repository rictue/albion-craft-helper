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

interface ScanResult {
  item: ItemDefinition;
  craftCity: string;
  sellCity: string;
  materialCost: number;
  sellPrice: number;
  profit: number;
  margin: number;
  itemId: string;
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
      // 1. Collect ALL item IDs + material IDs + artifact IDs
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

      // 2. Fetch prices in batches
      const idArray = [...allIds];
      const allPrices: MarketPrice[] = [];
      const batchSize = 50;
      const totalBatches = Math.ceil(idArray.length / batchSize);

      for (let i = 0; i < idArray.length; i += batchSize) {
        const batch = idArray.slice(i, i + batchSize);
        const data = await fetchPrices(batch);
        allPrices.push(...data);
        setProgress(Math.round(((i / batchSize + 1) / totalBatches) * 100));
      }

      // 3. Build price maps
      const materialPriceByCity = new Map<string, Map<string, number>>();
      const sellPriceByCity = new Map<string, Map<string, number>>();

      for (const city of CITIES) {
        const matMap = new Map<string, number>();
        const sellMap = new Map<string, number>();

        for (const p of allPrices) {
          if (p.city !== city.id) continue;
          if (p.sell_price_min > 0) {
            const existing = matMap.get(p.item_id);
            if (!existing || p.sell_price_min < existing) {
              matMap.set(p.item_id, p.sell_price_min);
            }
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
          if (!existing || p.sell_price_min < existing) {
            cheapestMaterials.set(p.item_id, p.sell_price_min);
          }
        }
      }

      // 4. Calculate profit
      const craftCity = settings.craftingCity;
      const craftMaterials = materialPriceByCity.get(craftCity) || new Map();
      const scanResults: ScanResult[] = [];

      for (const item of ALL_ITEMS) {
        const itemId = resolveItemId(item.baseId, tier, enchantment);
        const altId = itemId.includes('_2H_')
          ? itemId.replace('_2H_', '_MAIN_')
          : itemId.includes('_MAIN_')
            ? itemId.replace('_MAIN_', '_2H_')
            : null;

        const priceMap = new Map<string, number>();
        for (const req of item.recipe) {
          const matId = resolveMaterialId(req.materialBase, tier, enchantment);
          const price = craftMaterials.get(matId) || cheapestMaterials.get(matId) || 0;
          priceMap.set(matId, price);
        }
        if (item.artifactId) {
          const artId = resolveArtifactId(item.artifactId, tier);
          const artPrice = craftMaterials.get(artId) || cheapestMaterials.get(artId) || 0;
          priceMap.set(artId, artPrice);
        }

        // Regular cities (skip if BM only mode)
        if (!blackMarketOnly) {
          for (const sellCityId of SELL_CITIES) {
            const cityPrices = sellPriceByCity.get(sellCityId);
            if (!cityPrices) continue;

            const sellPrice = cityPrices.get(itemId) || (altId ? cityPrices.get(altId) : 0) || 0;
            if (sellPrice <= 0) continue;

            priceMap.set(itemId, sellPrice);

            const rr = calculateReturnRate(craftCity, item.subcategory, settings.useFocus);
            const result = calculateCrafting(
              item, tier, enchantment, 1, rr,
              settings.hasPremium, settings.usageFeePerHundred, priceMap,
            );

            if (result.profit > 0) {
              scanResults.push({
                item, craftCity, sellCity: sellCityId,
                materialCost: result.effectiveMaterialCost,
                sellPrice, profit: result.profit, margin: result.profitMargin, itemId,
              });
            }
          }
        }

        // Black Market (buy orders)
        const bmPrices = allPrices.filter(p => p.city === 'Black Market' && (p.item_id === itemId || p.item_id === altId));
        for (const bp of bmPrices) {
          if (bp.buy_price_max <= 0) continue;
          priceMap.set(itemId, bp.buy_price_max);

          const rr = calculateReturnRate(craftCity, item.subcategory, settings.useFocus);
          const result = calculateCrafting(
            item, tier, enchantment, 1, rr,
            settings.hasPremium, settings.usageFeePerHundred, priceMap,
          );

          if (result.profit > 0) {
            scanResults.push({
              item, craftCity, sellCity: 'Black Market',
              materialCost: result.effectiveMaterialCost,
              sellPrice: bp.buy_price_max, profit: result.profit, margin: result.profitMargin, itemId,
            });
          }
        }
      }

      // Keep best per item
      const bestPerItem = new Map<string, ScanResult>();
      for (const r of scanResults) {
        const key = r.item.baseId + ':' + r.sellCity;
        const existing = bestPerItem.get(key);
        if (!existing || r.profit > existing.profit) {
          bestPerItem.set(key, r);
        }
      }

      // For BM mode: one entry per item (best BM profit)
      // For normal mode: one entry per item (best city overall)
      const final = new Map<string, ScanResult>();
      for (const r of bestPerItem.values()) {
        const key = r.item.baseId;
        const existing = final.get(key);
        if (!existing || r.profit > existing.profit) {
          final.set(key, r);
        }
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
  const emptyIcon = blackMarketOnly ? '&#9876;' : '&#128200;';
  const emptyText = blackMarketOnly
    ? 'Scan to find items profitable to craft and sell on the Black Market.'
    : 'Select tier & enchantment, then click "Scan Market" to find profitable crafts.';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Controls */}
      <div className={`rounded-xl border p-4 ${
        blackMarketOnly ? 'bg-red-950/20 border-red-900/30' : 'bg-surface border-surface-lighter'
      }`}>
        <div className="flex flex-wrap items-end gap-6">
          <TierSelector value={tier} onChange={setLocalTier} />
          <EnchantmentSelector value={enchantment} onChange={setLocalEnchant} />

          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Craft City</label>
              <span className="text-sm text-gold">{settings.craftingCity}</span>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Premium</label>
              <span className="text-sm text-slate-300">{settings.hasPremium ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Focus</label>
              <span className="text-sm text-slate-300">{settings.useFocus ? 'Yes' : 'No'}</span>
            </div>
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
            {scanning ? 'Scanning...' : blackMarketOnly ? '&#9876; Scan Black Market' : '&#9889; Scan Market'}
          </button>
        </div>

        {scanning && (
          <div className="mt-3">
            <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${blackMarketOnly ? 'bg-red-500' : 'bg-gold'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Fetching prices... {progress}%</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-lighter flex justify-between items-center">
            <h3 className={`text-sm font-medium ${blackMarketOnly ? 'text-red-300' : 'text-gold'}`}>
              {results.length} profitable crafts found
              {blackMarketOnly && ' on Black Market'}
            </h3>
            {scannedAt && (
              <span className="text-xs text-slate-500">Scanned at {scannedAt}</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-surface-lighter">
                  <th className="text-left px-4 py-2 w-8"></th>
                  <th className="text-left px-4 py-2 cursor-pointer hover:text-gold" onClick={() => handleSort('name')}>
                    Item{sortIcon('name')}
                  </th>
                  {!blackMarketOnly && <th className="text-left px-4 py-2">Sell At</th>}
                  <th className="text-right px-4 py-2 cursor-pointer hover:text-gold" onClick={() => handleSort('materialCost')}>
                    Cost{sortIcon('materialCost')}
                  </th>
                  <th className="text-right px-4 py-2 cursor-pointer hover:text-gold" onClick={() => handleSort('sellPrice')}>
                    {blackMarketOnly ? 'BM Buy' : 'Sell'}{sortIcon('sellPrice')}
                  </th>
                  <th className="text-right px-4 py-2 cursor-pointer hover:text-gold" onClick={() => handleSort('profit')}>
                    Profit{sortIcon('profit')}
                  </th>
                  <th className="text-right px-4 py-2 cursor-pointer hover:text-gold" onClick={() => handleSort('margin')}>
                    Margin{sortIcon('margin')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.item.baseId}
                    onClick={() => handleItemClick(r)}
                    className="border-b border-surface-lighter/50 hover:bg-surface-light cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2">
                      <ItemIcon itemId={r.itemId} size={28} className="bg-surface-lighter rounded" />
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-slate-200">{r.item.name}</span>
                      {r.item.artifactId && <span className="text-purple-400 text-xs ml-1">*</span>}
                    </td>
                    {!blackMarketOnly && (
                      <td className="px-4 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          r.sellCity === 'Black Market' ? 'bg-red-900/30 text-red-300' : 'bg-surface-lighter text-slate-300'
                        }`}>
                          {r.sellCity}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2 text-right text-slate-400">
                      {formatSilver(r.materialCost)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-200">
                      {formatSilver(r.sellPrice)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-profit">
                      +{formatSilver(r.profit)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-profit">
                      +{formatPercent(r.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
          <div className="text-5xl mb-4 opacity-20" dangerouslySetInnerHTML={{ __html: emptyIcon }} />
          <h2 className="text-lg text-slate-400 mb-2">{title}</h2>
          <p className="text-sm text-slate-500">{emptyText}</p>
          <p className="text-xs text-slate-600 mt-2">
            Uses your Settings (craft city, premium, focus) from Calculator page.
          </p>
        </div>
      )}
    </div>
  );
}
