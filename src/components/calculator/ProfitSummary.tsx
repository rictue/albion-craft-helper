import { useState, useMemo, useEffect } from 'react';
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
  /** Extra silver earned from selling filled journals, reported by
   *  JournalBoostCard. Added to the combined total figure. */
  journalNet?: number;
}

interface CityPrice {
  city: string;
  price: number;
  profit: number;
  isBuy: boolean;
  /** true when we actually found market data for this city */
  hasData: boolean;
  /** true when this is the city the user is currently crafting in */
  isCraftCity: boolean;
  /** Age of the underlying price record in hours. Infinity when unknown. */
  ageHours: number;
  /** True if this entry was flagged as an outlier (>2x median of others). */
  isOutlier: boolean;
}

function ageHoursOf(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  const t = new Date(dateStr).getTime();
  if (!t || t <= 0) return Infinity;
  const h = (Date.now() - t) / 3_600_000;
  return h < 0 ? Infinity : h;
}

function formatAge(h: number): string {
  if (!Number.isFinite(h)) return '—';
  if (h < 1 / 60) return 'just now';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${Math.round(h / 24)}d`;
}

function ageColor(h: number): string {
  // Tighter thresholds than the first version. Albion market can swing
  // 20-30% inside a couple of hours, so anything past 1h is already
  // "watch out", not "fresh". Using distinct hue families (emerald → yellow
  // → orange → red) so the eye can actually tell levels apart at 10px text.
  if (!Number.isFinite(h)) return 'text-zinc-600';
  if (h < 1)  return 'text-emerald-400';   // fresh
  if (h < 3)  return 'text-yellow-400';    // warming
  if (h < 8)  return 'text-orange-500';    // stale
  return 'text-red-500';                   // dead
}

export default function ProfitSummary({ result, onAddToPlan, prices, itemId, altItemId, journalNet = 0 }: Props) {
  const [added, setAdded] = useState(false);
  // When the user clicks a city row in the Sell Prices list, the top
  // Investment/Best Profit card is pinned to that city. null = auto (use
  // the best real-data city).
  const [pinnedCityName, setPinnedCityName] = useState<string | null>(null);
  // Reset the pin whenever the item/tier/enchant changes so we don't carry
  // an irrelevant pick across items.
  useEffect(() => { setPinnedCityName(null); }, [itemId]);

  const { settings } = useAppStore();
  const qty = settings.quantity || 1;
  const taxRate = settings.hasPremium ? 0.065 : 0.105;

  // All city prices for this item. Unlike the old version which dropped
  // cities that had no listings, this one always emits a row for every
  // royal city plus the Black Market, captures the age of each price so
  // the user can see why a high number is really a stale listing, and
  // sorts so the currently-selected crafting city is pinned at #1.
  const cityPrices = useMemo(() => {
    const results: CityPrice[] = [];

    for (const city of CITIES) {
      if (city.id === 'Caerleon') continue; // Caerleon AH is no-op for crafts
      let bestSell = 0;
      let bestDate: string | undefined;
      let isBuy = false;

      for (const p of prices) {
        if (p.city !== city.id) continue;
        if (p.item_id !== itemId && p.item_id !== altItemId) continue;

        if (city.id === 'Black Market') {
          if (p.buy_price_max > bestSell) {
            bestSell = p.buy_price_max;
            bestDate = p.buy_price_max_date;
            isBuy = true;
          }
        } else {
          if (p.sell_price_min > 0 && (bestSell === 0 || p.sell_price_min < bestSell)) {
            bestSell = p.sell_price_min;
            bestDate = p.sell_price_min_date;
            isBuy = false;
          }
        }
      }

      const hasData = bestSell > 0;
      const totalSell = bestSell * qty;
      const profit = hasData ? totalSell * (1 - taxRate) - result.investment : 0;
      results.push({
        city: city.name,
        price: bestSell,
        profit,
        isBuy,
        hasData,
        isCraftCity: city.id === settings.craftingCity,
        ageHours: ageHoursOf(bestDate),
        isOutlier: false,
      });
    }

    // Outlier detection on royal-city sell prices (2x median). We no longer
    // hide the outliers — the user explicitly wants to see why a city has
    // an absurd price so they can read the age and dismiss it themselves.
    // We only mark them with isOutlier = true so the row renders dimly.
    const royalWithData = results.filter(r => !r.isBuy && r.hasData);
    if (royalWithData.length >= 2) {
      const sorted = [...royalWithData].sort((a, b) => a.price - b.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      const cutoff = median * 2;
      for (const r of results) {
        if (!r.isBuy && r.hasData && r.price > cutoff) {
          r.isOutlier = true;
        }
      }
    }

    // Sort order — STABLE across tier/enchant changes so the user can cycle
    // tiers without rows jumping around:
    //   1. The currently-selected craft city ALWAYS first.
    //   2. Remaining data rows in the CITIES declaration order (stable).
    //   3. Outlier rows in the same stable order.
    //   4. No-data rows at the bottom, also stable.
    const cityOrder = new Map(CITIES.map((c, i) => [c.name, i]));
    return results.sort((a, b) => {
      if (a.isCraftCity !== b.isCraftCity) return a.isCraftCity ? -1 : 1;
      const rank = (r: CityPrice) => !r.hasData ? 2 : r.isOutlier ? 1 : 0;
      const ra = rank(a); const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (cityOrder.get(a.city) ?? 99) - (cityOrder.get(b.city) ?? 99);
    });
  }, [prices, itemId, altItemId, result.investment, taxRate, qty, settings.craftingCity]);

  // For the headline "Total Profit" card we want the best *actual* profit,
  // not the pinned craft city — otherwise the header would flash red when
  // the craft city has no data even though other cities are profitable.
  // Outliers are excluded from the headline so a 400k-on-one-stale-listing
  // row can't inflate the "best profit" number.
  const bestRealCity = useMemo(
    () => cityPrices
      .filter(c => c.hasData && !c.isOutlier)
      .sort((a, b) => b.profit - a.profit)[0],
    [cityPrices],
  );

  // Which city drives the top Investment / Best Profit card?
  //   1. If the user clicked a specific city row, use that (pin).
  //   2. Otherwise use the best real-data, non-outlier city.
  //   3. Otherwise fall back to whatever is first in the list so we never
  //      crash the render.
  const pinnedCity = pinnedCityName
    ? cityPrices.find(c => c.city === pinnedCityName)
    : undefined;
  const bestCity = pinnedCity ?? bestRealCity ?? cityPrices[0];
  const isPinned = !!pinnedCity;
  const bestProfit = bestCity?.profit || 0;
  const bestPrice = bestCity?.price || 0;
  const totalProfit = bestProfit + journalNet;
  const isProfit = totalProfit > 0;
  const hasJournal = Math.abs(journalNet) > 0.5; // ignore noise

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
        <div className={`rounded-lg p-3 ${isProfit ? 'bg-green-950/30 border border-green-600/20' : 'bg-red-950/30 border border-red-600/20'}`}>
          {hasJournal ? (
            // When there's journal income, show a breakdown: craft + journal = total
            <>
              <div className="flex justify-between items-baseline">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <span>{isPinned ? 'Selected City' : 'Total Profit'}</span>
                  {isPinned && (
                    <button
                      onClick={() => setPinnedCityName(null)}
                      className="text-gold/70 hover:text-gold normal-case text-[9px] tracking-normal"
                      title="Reset to best-profit city"
                    >
                      [auto]
                    </button>
                  )}
                </div>
                {bestCity && (
                  <div className="text-[10px] text-zinc-500">
                    Sell @ {bestCity.city} · {formatSilver(bestPrice)} ea
                  </div>
                )}
              </div>
              <div className={`text-2xl font-black tabular-nums mt-0.5 ${isProfit ? 'text-profit' : 'text-loss'}`}>
                {isProfit ? '+' : ''}{formatSilver(totalProfit)}
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800 space-y-0.5">
                <div className="flex justify-between items-baseline text-[11px]">
                  <span className="text-zinc-500">Craft profit</span>
                  <span className={`tabular-nums font-semibold ${bestProfit >= 0 ? 'text-zinc-300' : 'text-red-400/80'}`}>
                    {bestProfit >= 0 ? '+' : ''}{formatSilver(bestProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-[11px]">
                  <span className="text-emerald-500/80">Journal income</span>
                  <span className={`tabular-nums font-semibold ${journalNet >= 0 ? 'text-emerald-400' : 'text-red-400/80'}`}>
                    {journalNet >= 0 ? '+' : ''}{formatSilver(journalNet)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            // No journal data — classic single-line display
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  <span>{isPinned ? 'Selected Profit' : 'Best Profit'}</span>
                  {isPinned && (
                    <button
                      onClick={() => setPinnedCityName(null)}
                      className="text-gold/70 hover:text-gold text-[9px]"
                      title="Reset to best-profit city"
                    >
                      [auto]
                    </button>
                  )}
                </div>
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
          )}
        </div>
      </div>

      {/* All cities */}
      {cityPrices.length > 0 && (
        <div className="bg-bg-raised rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sell Prices by City</div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-wider">age</div>
          </div>
          <div className="space-y-1">
            {(() => {
              const maxPrice = Math.max(1, ...cityPrices.filter(c => c.hasData && !c.isOutlier).map(c => c.price));
              return cityPrices.map((cp, i) => {
                const barW = cp.hasData ? Math.max(4, (cp.price / maxPrice) * 100) : 0;
                const dimClass = !cp.hasData || cp.isOutlier ? 'opacity-50' : '';
                const isPinnedRow = cp.city === pinnedCityName;
                const ringClass = isPinnedRow
                  ? 'ring-2 ring-gold/80 rounded bg-gold/5'
                  : cp.isCraftCity
                    ? 'ring-1 ring-gold/40 rounded'
                    : '';
                return (
                  <div
                    key={cp.city}
                    onClick={() => {
                      if (!cp.hasData) return;
                      // Toggle: clicking the same city twice goes back to auto
                      setPinnedCityName(prev => (prev === cp.city ? null : cp.city));
                    }}
                    className={`flex items-center gap-2 p-0.5 ${ringClass} ${cp.hasData ? 'cursor-pointer hover:bg-zinc-800/40' : 'cursor-default'} transition-colors`}
                    title={
                      cp.isOutlier
                        ? 'Flagged as outlier: price > 2x median of the other royal cities. Click to pin anyway.'
                        : cp.hasData
                          ? isPinnedRow
                            ? 'Pinned — click again to return to auto (best profit city)'
                            : 'Click to pin the top card to this city'
                          : 'No market data for this city'
                    }
                  >
                    <span className={`text-[11px] font-bold w-3 ${isPinnedRow || cp.isCraftCity || i === 0 ? 'text-gold' : 'text-zinc-600'}`}>{i + 1}</span>
                    <span className={`text-xs w-20 shrink-0 flex items-center gap-1 ${cp.isCraftCity ? 'text-gold font-semibold' : 'text-zinc-400'}`}>
                      {cp.isCraftCity && <span className="text-[9px]">●</span>}
                      {cp.city}
                    </span>
                    <div className={`flex-1 h-6 bg-zinc-800/50 rounded relative overflow-hidden ${dimClass}`}>
                      {cp.hasData && (
                        <div
                          className={`h-full rounded ${cp.isOutlier ? 'bg-amber-900/40' : cp.profit > 0 ? 'bg-green-900/40' : 'bg-red-900/30'}`}
                          style={{ width: `${barW}%` }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-between px-2">
                        <span className="text-[11px] text-zinc-200 font-medium flex items-center gap-1">
                          {cp.hasData ? formatSilver(cp.price) : <span className="text-zinc-600">no data</span>}
                          {cp.isBuy && <span className="text-blue-400">(buy)</span>}
                          {cp.isOutlier && <span className="text-amber-400 text-[9px]" title="Flagged outlier — likely stale">⚠</span>}
                        </span>
                        <span className={`text-[11px] font-medium tabular-nums ${cp.hasData ? (cp.profit > 0 ? 'text-profit' : 'text-loss') : 'text-zinc-600'}`}>
                          {cp.hasData ? `${cp.profit > 0 ? '+' : ''}${formatSilver(cp.profit)}` : '—'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] tabular-nums w-10 text-right shrink-0 ${ageColor(cp.ageHours)}`}
                      title={cp.hasData ? `Price record from ${formatAge(cp.ageHours)} ago` : 'No data'}
                    >
                      {cp.hasData ? formatAge(cp.ageHours) : '—'}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="mt-2 text-[9px] text-zinc-600 flex items-center gap-3 flex-wrap">
            <span className="italic">tap row to pin ↑</span>
            <span><span className="text-gold">●</span> craft city</span>
            <span><span className="text-amber-400">⚠</span> outlier</span>
            <span>age: <span className="text-emerald-400">&lt;1h</span> / <span className="text-yellow-400">&lt;3h</span> / <span className="text-orange-500">&lt;8h</span> / <span className="text-red-500">stale</span></span>
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
