import { useState, useMemo } from 'react';
import type { CraftingResult } from '../../utils/profitCalculator';
import type { MarketPrice } from '../../types';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';

interface Props {
  result: CraftingResult;
  onAddToPlan: () => void;
  prices: MarketPrice[];
  itemId: string;
  altItemId?: string;
}

export default function ProfitSummary({ result, onAddToPlan, prices, itemId, altItemId }: Props) {
  const [added, setAdded] = useState(false);
  const { settings } = useAppStore();
  // Use the directly-calculated sell price for the selected city (more accurate than priceMap)
  const directSellPrice = useMemo(() => {
    let bestSell = 0;
    for (const p of prices) {
      if (p.city !== settings.sellingLocation) continue;
      if (p.item_id !== itemId && p.item_id !== altItemId) continue;

      if (settings.sellingLocation === 'Black Market') {
        if (p.buy_price_max > bestSell) bestSell = p.buy_price_max;
      } else {
        if (p.sell_price_min > 0 && (bestSell === 0 || p.sell_price_min < bestSell)) {
          bestSell = p.sell_price_min;
        }
      }
    }
    return bestSell;
  }, [prices, itemId, altItemId, settings.sellingLocation]);

  // Find top 3 most profitable cities to sell (computed first, used for outlier detection)
  const topCities = useMemo(() => {
    const taxRate = settings.hasPremium ? 0.065 : 0.105;
    const results: { city: string; price: number; profit: number }[] = [];

    for (const city of CITIES) {
      // Find sell_price_min for this item in this city
      let bestSell = 0;
      for (const p of prices) {
        if (p.city !== city.id) continue;
        if (p.item_id !== itemId && p.item_id !== altItemId) continue;

        if (city.id === 'Black Market') {
          if (p.buy_price_max > bestSell) bestSell = p.buy_price_max;
        } else {
          if (p.sell_price_min > 0 && (bestSell === 0 || p.sell_price_min < bestSell)) {
            bestSell = p.sell_price_min;
          }
        }
      }

      if (bestSell <= 0) continue;

      const profit = bestSell * (1 - taxRate) - result.investment;
      results.push({ city: city.name, price: bestSell, profit });
    }

    // Filter outliers: remove prices > 5x median
    if (results.length >= 2) {
      const sortedPrices = [...results].sort((a, b) => a.price - b.price);
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)].price;
      return results
        .filter(r => r.price <= median * 5)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 3);
    }

    return results.sort((a, b) => b.profit - a.profit).slice(0, 3);
  }, [prices, itemId, altItemId, result.investment, settings.hasPremium]);

  // Sell price: use selected city, but fallback to #1 best city if outlier (>3x best)
  const bestCityPrice = topCities.length > 0 ? topCities[0].price : 0;
  const sellPrice = (() => {
    if (!directSellPrice) return bestCityPrice || result.sellPrice;
    if (bestCityPrice > 0 && directSellPrice > bestCityPrice * 3) return bestCityPrice;
    return directSellPrice;
  })();
  const taxRate = settings.hasPremium ? 0.065 : 0.105;
  const tax = sellPrice * taxRate;
  const profit = sellPrice - tax - result.investment;
  const isProfit = profit > 0;
  const hasData = sellPrice > 0;

  const handleAdd = () => {
    onAddToPlan();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Item card */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <div className="flex items-center gap-3 mb-3">
          <ItemIcon itemId={result.itemId} size={56} quality={1} className="rounded-lg" />
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">
              Sell Price <span className="text-gold normal-case">@ {settings.sellingLocation}</span>
            </div>
            {hasData ? (
              <div className="text-2xl font-bold text-zinc-100">{formatSilver(sellPrice)}</div>
            ) : (
              <div className="text-lg font-bold text-yellow-500">No data</div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Investment</span>
            <span className="text-zinc-300">{formatSilver(result.investment)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Revenue</span>
            <span className="text-zinc-300">{formatSilver(sellPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span className="text-red-400">-{formatSilver(tax)}</span>
          </div>
          {result.usageFee > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Usage Fee</span>
              <span className="text-red-400">-{formatSilver(result.usageFee)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Top cities */}
      {topCities.length > 0 && (
        <div className="bg-surface rounded-xl border border-surface-lighter p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Best Cities to Sell</div>
          <div className="space-y-1.5">
            {topCities.map((c, i) => (
              <div key={c.city} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-gold' : 'text-zinc-500'}`}>
                    #{i + 1}
                  </span>
                  <span className={i === 0 ? 'text-zinc-200 font-medium' : 'text-zinc-400'}>
                    {c.city}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-300 mr-3">{formatSilver(c.price)}</span>
                  <span className={`font-medium ${c.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                    {c.profit > 0 ? '+' : ''}{formatSilver(c.profit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profit card */}
      <div className={`rounded-xl border p-4 ${
        isProfit
          ? 'bg-green-950/30 border-green-800/30'
          : 'bg-red-950/30 border-red-800/30'
      }`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-zinc-300">Net Profit</span>
          <span className={`text-2xl font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
            {isProfit ? '+' : ''}{formatSilver(profit)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500">Margin</span>
          <span className={`text-sm font-semibold ${isProfit ? 'text-profit' : 'text-loss'}`}>
            {isProfit ? '+' : ''}{formatPercent(sellPrice > 0 ? (profit / sellPrice) * 100 : 0)}
          </span>
        </div>
      </div>

      {/* Add to planner button */}
      <button
        onClick={handleAdd}
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
          added
            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
            : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
        }`}
      >
        {added ? '+ Added!' : '+ Add to Planner'}
      </button>
    </div>
  );
}
