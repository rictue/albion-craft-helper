import { useEffect, useState, useMemo } from 'react';
import { fetchPriceHistory, type HistorySeries } from '../../services/priceHistory';
import { formatSilver } from '../../utils/formatters';

interface Props {
  itemId: string;
  /** Optional alternate id (e.g. 2H_ ↔ MAIN_) to sum together. */
  altItemId?: string;
}

/**
 * Market Liquidity Card
 *
 * Pulls 7-day sales history from the Albion Online Data Project and shows
 * how much of the selected item is actually moving on the market. The
 * calculator can tell you a craft is profitable, but if nobody's buying
 * the item you'll sit on it for days — this card answers that.
 */
const LOCATIONS = [
  'Bridgewatch',
  'Martlock',
  'Fort Sterling',
  'Lymhurst',
  'Thetford',
  'Caerleon',
];

const DAYS = 7;

export default function LiquidityCard({ itemId, altItemId }: Props) {
  const [series, setSeries] = useState<HistorySeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const promises = [fetchPriceHistory(itemId, LOCATIONS, DAYS)];
        if (altItemId && altItemId !== itemId) {
          promises.push(fetchPriceHistory(altItemId, LOCATIONS, DAYS));
        }
        const results = await Promise.all(promises);
        if (!cancelled) setSeries(results.flat());
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [itemId, altItemId]);

  // Aggregate: total count sold in window, per-city breakdown, per-day totals
  const stats = useMemo(() => {
    if (series.length === 0) return null;
    let totalCount = 0;
    let totalRevenue = 0;
    const byCity = new Map<string, { count: number; revenue: number }>();
    const byDay = new Map<string, number>(); // day key → count

    for (const s of series) {
      for (const pt of s.data) {
        totalCount += pt.item_count;
        totalRevenue += pt.item_count * pt.avg_price;
        const cur = byCity.get(s.city) ?? { count: 0, revenue: 0 };
        cur.count += pt.item_count;
        cur.revenue += pt.item_count * pt.avg_price;
        byCity.set(s.city, cur);
        const dayKey = pt.timestamp.slice(0, 10); // YYYY-MM-DD
        byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + pt.item_count);
      }
    }

    const avgPrice = totalCount > 0 ? totalRevenue / totalCount : 0;
    const dailyAvg = totalCount / DAYS;

    // Sort cities by count desc
    const cities = [...byCity.entries()]
      .map(([city, v]) => ({ city, count: v.count }))
      .sort((a, b) => b.count - a.count);

    // Build a 7-day bar chart — fill missing days with 0
    const dayBars: { day: string; count: number }[] = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayBars.push({ day: key.slice(5), count: byDay.get(key) ?? 0 });
    }
    const maxBar = Math.max(1, ...dayBars.map(b => b.count));

    return { totalCount, dailyAvg, avgPrice, cities, dayBars, maxBar };
  }, [series]);

  // Liquidity health classification
  const { label, color, bgColor, borderColor } = useMemo(() => {
    const daily = stats?.dailyAvg ?? 0;
    if (daily >= 50) return { label: 'Hot market',  color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' };
    if (daily >= 15) return { label: 'Healthy',     color: 'text-green-400',   bgColor: 'bg-green-500/10',   borderColor: 'border-green-500/30' };
    if (daily >= 5)  return { label: 'Slow',        color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30' };
    if (daily > 0)   return { label: 'Thin',        color: 'text-orange-400',  bgColor: 'bg-orange-500/10',  borderColor: 'border-orange-500/30' };
    return             { label: 'Dead market', color: 'text-red-400',     bgColor: 'bg-red-500/10',     borderColor: 'border-red-500/30' };
  }, [stats]);

  if (!itemId) return null;

  return (
    <div className={`bg-surface rounded-xl border ${stats ? borderColor : 'border-surface-lighter'} overflow-hidden`}>
      <div className="px-4 py-3 border-b border-surface-lighter flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
          Market Liquidity
        </div>
        <div className="text-[9px] text-zinc-600">Last {DAYS} days</div>
      </div>

      {loading && (
        <div className="px-4 py-6 text-center">
          <div className="text-xs text-zinc-500 animate-pulse">Loading history...</div>
        </div>
      )}

      {error && !loading && (
        <div className="px-4 py-6 text-center text-xs text-zinc-500">
          Couldn't fetch history
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Headline numbers */}
          <div className={`px-4 py-3 ${bgColor} border-b border-surface-lighter`}>
            <div className="flex items-baseline justify-between">
              <div>
                <div className={`text-2xl font-black tabular-nums ${color}`}>
                  {stats.totalCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500">
                  sold · ~{stats.dailyAvg.toFixed(0)}/day
                </div>
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${color} ${bgColor} border ${borderColor}`}>
                {label}
              </div>
            </div>
          </div>

          {/* 7-day bar chart */}
          <div className="px-4 py-3 border-b border-surface-lighter">
            <div className="text-[9px] uppercase text-zinc-600 mb-2">Daily volume</div>
            <div className="flex items-end gap-1 h-12">
              {stats.dayBars.map(b => {
                const h = (b.count / stats.maxBar) * 100;
                return (
                  <div
                    key={b.day}
                    className="flex-1 flex flex-col items-center gap-0.5"
                    title={`${b.day}: ${b.count} sold`}
                  >
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className={`w-full rounded-t ${b.count > 0 ? color.replace('text-', 'bg-') : 'bg-zinc-800'}`}
                        style={{ height: b.count > 0 ? `${Math.max(4, h)}%` : '2px' }}
                      />
                    </div>
                    <div className="text-[8px] text-zinc-600 tabular-nums">{b.day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top buying cities */}
          {stats.cities.length > 0 && (
            <div className="px-4 py-3 space-y-1.5">
              <div className="text-[9px] uppercase text-zinc-600 mb-1">Top cities</div>
              {stats.cities.slice(0, 4).map(c => {
                const pct = stats.totalCount > 0 ? (c.count / stats.totalCount) * 100 : 0;
                return (
                  <div key={c.city} className="text-[11px]">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-zinc-300">{c.city}</span>
                      <span className="text-zinc-500 tabular-nums">{c.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <div
                        className={color.replace('text-', 'bg-')}
                        style={{ width: `${pct}%`, height: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {stats.avgPrice > 0 && (
            <div className="px-4 py-2 border-t border-surface-lighter text-[10px] text-zinc-500 flex justify-between">
              <span>Avg sale price</span>
              <span className="tabular-nums text-zinc-300">{formatSilver(stats.avgPrice)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
