import { useState, useMemo } from 'react';
import type { CraftingResult } from '../../utils/profitCalculator';
import type { MarketPrice } from '../../types';
import { formatSilver } from '../../utils/formatters';
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

interface CityPrice {
  city: string;
  price: number;
  profit: number;
  isBuy: boolean;
}

export default function ProfitSummary({ result, onAddToPlan, prices, itemId, altItemId }: Props) {
  const [added, setAdded] = useState(false);
  const { settings } = useAppStore();
  const qty = settings.quantity || 1;
  const taxRate = settings.hasPremium ? 0.065 : 0.105;

  // All city prices for this item
  const cityPrices = useMemo(() => {
    const results: CityPrice[] = [];

    for (const city of CITIES) {
      if (city.id === 'Caerleon') continue; // skip risky city
      let bestSell = 0;
      let isBuy = false;

      for (const p of prices) {
        if (p.city !== city.id) continue;
        if (p.item_id !== itemId && p.item_id !== altItemId) continue;

        if (city.id === 'Black Market') {
          if (p.buy_price_max > bestSell) { bestSell = p.buy_price_max; isBuy = true; }
        } else {
          if (p.sell_price_min > 0 && (bestSell === 0 || p.sell_price_min < bestSell)) {
            bestSell = p.sell_price_min; isBuy = false;
          }
        }
      }

      if (bestSell <= 0) continue;

      const totalSell = bestSell * qty;
      const profit = totalSell * (1 - taxRate) - result.investment;
      results.push({ city: city.name, price: bestSell, profit, isBuy });
    }

    // Filter outliers
    if (results.length >= 2) {
      const sorted = [...results].sort((a, b) => a.price - b.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      return results.filter(r => r.price <= median * 5).sort((a, b) => b.profit - a.profit);
    }

    return results.sort((a, b) => b.profit - a.profit);
  }, [prices, itemId, altItemId, result.investment, taxRate, qty]);

  const bestCity = cityPrices[0];
  const bestProfit = bestCity?.profit || 0;
  const bestPrice = bestCity?.price || 0;
  const isProfit = bestProfit > 0;

  const handleAdd = () => {
    onAddToPlan();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="space-y-3">
      {/* Item + best city */}
      <div className="bg-bg-raised rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <ItemIcon itemId={result.itemId} size={48} quality={1} className="rounded-lg" />
          <div className="flex-1">
            <div className="text-xs text-zinc-500">Investment</div>
            <div className="text-lg font-bold text-zinc-200">{formatSilver(result.investment)}</div>
          </div>
        </div>

        {/* Profit card */}
        <div className={`rounded-lg p-3 ${isProfit ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-zinc-500">Best Profit</div>
              <div className={`text-xl font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                {isProfit ? '+' : ''}{formatSilver(bestProfit)}
              </div>
            </div>
            {bestCity && (
              <div className="text-right">
                <div className="text-xs text-zinc-500">Sell at {bestCity.city}</div>
                <div className="text-sm text-zinc-300">{formatSilver(bestPrice)} ea</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All cities */}
      {cityPrices.length > 0 && (
        <div className="bg-bg-raised rounded-xl border border-border p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Sell Prices by City</div>
          <div className="space-y-1">
            {cityPrices.map((cp, i) => {
              const barMax = cityPrices[0]?.price || 1;
              const barW = Math.max(5, (cp.price / barMax) * 100);
              return (
                <div key={cp.city} className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold w-3 ${i === 0 ? 'text-gold' : 'text-zinc-600'}`}>{i + 1}</span>
                  <span className="text-xs text-zinc-400 w-20 shrink-0">{cp.city}</span>
                  <div className="flex-1 h-6 bg-zinc-800/50 rounded relative overflow-hidden">
                    <div
                      className={`h-full rounded ${cp.profit > 0 ? 'bg-green-900/40' : 'bg-red-900/30'}`}
                      style={{ width: `${barW}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2">
                      <span className="text-[11px] text-zinc-200 font-medium">
                        {formatSilver(cp.price)}
                        {cp.isBuy && <span className="text-blue-400 ml-1">(buy)</span>}
                      </span>
                      <span className={`text-[11px] font-medium ${cp.profit > 0 ? 'text-profit' : 'text-loss'}`}>
                        {cp.profit > 0 ? '+' : ''}{formatSilver(cp.profit)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add to planner */}
      <button
        onClick={handleAdd}
        className={`w-full rounded-lg py-2 text-sm font-medium transition-all ${
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
