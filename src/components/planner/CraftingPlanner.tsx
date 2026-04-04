import { useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { fetchPrices, buildPriceMap } from '../../services/api';
import { calculateCrafting } from '../../utils/profitCalculator';
import { calculateReturnRate } from '../../utils/returnRate';
import { resolveItemId, resolveMaterialId, resolveArtifactId } from '../../utils/itemIdParser';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

export default function CraftingPlanner() {
  const {
    plannerItems, removeFromPlan, updatePlanQuantity, clearPlan,
    settings, prices, setPrices, setPricesLoading, customPrices,
    profitHistory, addProfitRecord, clearProfitHistory,
  } = useAppStore();

  const loadAllPrices = useCallback(async () => {
    if (plannerItems.length === 0) return;

    setPricesLoading(true);
    try {
      const itemIds = new Set<string>();
      for (const entry of plannerItems) {
        const id = resolveItemId(entry.item.baseId, entry.tier, entry.enchantment);
        itemIds.add(id);
        // Always fetch both 2H_ and MAIN_ variants
        if (id.includes('_2H_')) itemIds.add(id.replace('_2H_', '_MAIN_'));
        else if (id.includes('_MAIN_')) itemIds.add(id.replace('_MAIN_', '_2H_'));
        for (const req of entry.item.recipe) {
          itemIds.add(resolveMaterialId(req.materialBase, entry.tier, entry.enchantment));
        }
        if (entry.item.artifactId) {
          itemIds.add(resolveArtifactId(entry.item.artifactId, entry.tier));
        }
      }
      const data = await fetchPrices([...itemIds]);
      setPrices(data);
    } catch (err) {
      console.error('Failed to load planner prices:', err);
    } finally {
      setPricesLoading(false);
    }
  }, [plannerItems, setPrices, setPricesLoading]);

  useEffect(() => {
    loadAllPrices();
  }, [loadAllPrices]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    // Fallback: all cities cheapest price (sell first, then buy orders)
    for (const price of prices) {
      const bestPrice = price.sell_price_min > 0
        ? price.sell_price_min
        : price.buy_price_max > 0
          ? price.buy_price_max
          : 0;
      if (bestPrice > 0) {
        const existing = map.get(price.item_id);
        if (!existing || bestPrice < existing) {
          map.set(price.item_id, bestPrice);
        }
      }
    }
    // Override with crafting city
    const materialMap = buildPriceMap(prices, settings.craftingCity);
    materialMap.forEach((v, k) => map.set(k, v));
    // Override sell prices from selling location
    const sellMap = buildPriceMap(prices, settings.sellingLocation, true);
    sellMap.forEach((v, k) => map.set(k, v));

    // Map alt-variant prices: if T4_MAIN_X has price but T4_2H_X doesn't, copy it
    const allKeys = [...map.keys()];
    for (const k of allKeys) {
      let altKey: string | null = null;
      if (k.includes('_2H_')) altKey = k.replace('_2H_', '_MAIN_');
      else if (k.includes('_MAIN_')) altKey = k.replace('_MAIN_', '_2H_');
      if (altKey && !map.has(altKey)) map.set(altKey, map.get(k)!);
    }

    // Custom prices highest priority
    Object.entries(customPrices).forEach(([key, price]) => {
      const [itemId] = key.split(':');
      map.set(itemId, price);
    });
    return map;
  }, [prices, settings.craftingCity, settings.sellingLocation, customPrices]);

  const results = useMemo(() => {
    return plannerItems.map((entry) => {
      const rr = calculateReturnRate(settings.craftingCity, entry.item.subcategory, settings.useFocus);
      return {
        entry,
        result: calculateCrafting(
          entry.item, entry.tier, entry.enchantment, entry.quantity,
          rr, settings.hasPremium, settings.usageFeePerHundred, priceMap,
        ),
      };
    });
  }, [plannerItems, settings, priceMap]);

  const totals = useMemo(() => {
    let totalInvestment = 0;
    let totalProfit = 0;
    let totalSell = 0;
    const materialTotals = new Map<string, { name: string; count: number; cost: number }>();

    for (const { result } of results) {
      totalInvestment += result.investment;
      totalProfit += result.profit;
      totalSell += result.sellPrice;

      for (const mat of result.materials) {
        const existing = materialTotals.get(mat.materialBase);
        if (existing) {
          existing.count += mat.count;
          existing.cost += mat.totalPrice;
        } else {
          materialTotals.set(mat.materialBase, { name: mat.name, count: mat.count, cost: mat.totalPrice });
        }
      }
    }

    return { totalInvestment, totalProfit, totalSell, materialTotals };
  }, [results]);

  if (plannerItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-surface rounded-xl border border-surface-lighter p-12 text-center">
          <div className="text-6xl mb-4 opacity-20">&#128221;</div>
          <h2 className="text-lg text-zinc-400 mb-2">Planner is Empty</h2>
          <p className="text-sm text-zinc-500">
            Add items from the Calculator using the "Add to Planner" button.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gold">Crafting Plan</h2>
        <div className="flex gap-2">
          <button
            onClick={loadAllPrices}
            className="text-xs text-zinc-400 hover:text-gold px-3 py-1.5 rounded-lg bg-surface border border-surface-lighter transition-colors"
          >
            Refresh Prices
          </button>
          <button
            onClick={clearPlan}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-surface border border-surface-lighter transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {results.map(({ entry, result }) => (
          <div key={entry.id} className="bg-surface rounded-xl border border-surface-lighter p-4 flex items-center gap-4">
            <ItemIcon itemId={result.itemId} size={48} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-200">{entry.item.name}</div>
              <div className="text-xs text-zinc-500">
                T{entry.tier}.{entry.enchantment}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Qty:</label>
              <input
                type="number"
                min={1}
                value={entry.quantity}
                onChange={(e) => updatePlanQuantity(entry.id, Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-surface-light border border-surface-lighter rounded px-2 py-1 text-sm text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-gold/50"
              />
            </div>
            <div className="text-right w-28">
              <div className="text-xs text-zinc-500">Cost</div>
              <div className="text-sm text-zinc-200">{formatSilver(result.investment)}</div>
            </div>
            <div className="text-right w-28">
              <div className="text-xs text-zinc-500">Profit</div>
              <div className={`text-sm font-medium ${result.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {result.profit >= 0 ? '+' : ''}{formatSilver(result.profit)}
              </div>
            </div>
            <button
              onClick={() => removeFromPlan(entry.id)}
              className="text-zinc-500 hover:text-red-400 transition-colors p-1"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>

      {/* Material aggregation */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Total Materials Needed</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...totals.materialTotals.entries()].map(([key, mat]) => (
            <div key={key} className="bg-surface-light rounded-lg p-3">
              <div className="text-sm text-zinc-200">{mat.name}</div>
              <div className="text-lg font-bold text-gold">{mat.count.toLocaleString()}</div>
              <div className="text-xs text-zinc-500">{formatSilver(mat.cost)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className={`rounded-xl border p-4 ${
        totals.totalProfit >= 0
          ? 'bg-green-950/20 border-green-800/30'
          : 'bg-red-950/20 border-red-800/30'
      }`}>
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-zinc-500">Total Investment</div>
            <div className="text-xl font-bold text-zinc-200">{formatSilver(totals.totalInvestment)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500">Total Revenue</div>
            <div className="text-xl font-bold text-zinc-200">{formatSilver(totals.totalSell)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500">Total Profit</div>
            <div className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
              {totals.totalProfit >= 0 ? '+' : ''}{formatSilver(totals.totalProfit)}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            results.forEach(({ entry, result }) => {
              addProfitRecord({ itemName: entry.item.name + ' T' + entry.tier + '.' + entry.enchantment, quantity: entry.quantity, profit: result.profit });
            });
            clearPlan();
          }}
          className="mt-4 w-full bg-green-900/30 hover:bg-green-900/50 text-green-300 border border-green-800/30 rounded-lg py-2.5 text-sm font-semibold transition-colors"
        >
          Mark All as Crafted
        </button>
      </div>

      {/* Profit History */}
      {profitHistory.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider">
              Craft History ({profitHistory.length})
            </h3>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${profitHistory.reduce((s, r) => s + r.profit, 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                Total: {profitHistory.reduce((s, r) => s + r.profit, 0) >= 0 ? '+' : ''}{formatSilver(profitHistory.reduce((s, r) => s + r.profit, 0))}
              </span>
              <button onClick={clearProfitHistory} className="text-xs text-zinc-600 hover:text-red-400">Clear</button>
            </div>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {profitHistory.slice(0, 50).map(r => (
              <div key={r.id} className="flex justify-between text-xs py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400">{r.itemName} x{r.quantity}</span>
                <div className="flex gap-3">
                  <span className={r.profit >= 0 ? 'text-profit' : 'text-loss'}>
                    {r.profit >= 0 ? '+' : ''}{formatSilver(r.profit)}
                  </span>
                  <span className="text-zinc-600">{new Date(r.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
