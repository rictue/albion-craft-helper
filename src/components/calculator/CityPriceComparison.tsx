import { useMemo } from 'react';
import type { MarketPrice } from '../../types';
import { formatSilver } from '../../utils/formatters';
import { CITIES } from '../../data/cities';

interface Props {
  prices: MarketPrice[];
  itemId: string;
  mainVariantId?: string;
}

export default function CityPriceComparison({ prices, itemId, mainVariantId }: Props) {
  const cityPrices = useMemo(() => {
    const result: { city: string; sell: number; buy: number }[] = [];

    for (const city of CITIES) {
      let bestSell = 0;
      let bestBuy = 0;

      for (const p of prices) {
        if (p.city !== city.id) continue;
        if (p.item_id !== itemId && p.item_id !== mainVariantId) continue;

        if (p.sell_price_min > 0 && (bestSell === 0 || p.sell_price_min < bestSell)) {
          bestSell = p.sell_price_min;
        }
        if (p.buy_price_max > 0 && p.buy_price_max > bestBuy) {
          bestBuy = p.buy_price_max;
        }
      }

      if (bestSell > 0 || bestBuy > 0) {
        result.push({ city: city.name, sell: bestSell, buy: bestBuy });
      }
    }

    return result.sort((a, b) => {
      const aPrice = a.sell || a.buy;
      const bPrice = b.sell || b.buy;
      return bPrice - aPrice;
    });
  }, [prices, itemId, mainVariantId]);

  if (cityPrices.length === 0) return null;

  const maxPrice = Math.max(...cityPrices.map(c => c.sell || c.buy));

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">City Prices</h3>
      <div className="space-y-1.5">
        {cityPrices.map((cp) => {
          const price = cp.sell || cp.buy;
          const barWidth = maxPrice > 0 ? (price / maxPrice) * 100 : 0;
          const isBuy = cp.sell === 0;

          return (
            <div key={cp.city} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0 truncate">{cp.city}</span>
              <div className="flex-1 h-5 bg-surface-light rounded overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all ${isBuy ? 'bg-blue-600/40' : 'bg-gold/30'}`}
                  style={{ width: `${barWidth}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs text-slate-200 font-medium">
                  {formatSilver(price)}
                  {isBuy && <span className="text-blue-400 ml-1 text-[10px]">(buy)</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
