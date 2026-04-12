import { useState, useCallback, useMemo } from 'react';
import { fetchPrices } from '../../services/api';
import { ALL_ITEMS } from '../../data/items';
import { resolveItemId } from '../../utils/itemIdParser';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { getMountGroups, getItemWeight, getMountCapacity } from '../../utils/transport';
import { ageHoursOf, formatAge } from '../../utils/dataAge';
import ItemIcon from '../common/ItemIcon';
import type { MarketPrice, Tier, Enchantment } from '../../types';

interface RunRow {
  itemId: string;
  itemName: string;
  category: string;
  buyPrice: number;
  buyAgeHours: number;
  bmBuyOrder: number;
  bmAgeHours: number;
  netRevenue: number;
  profit: number;
  marginPct: number;
  unitWeight: number;
}

// Premium instant-sell tax on Black Market buy orders
const PREMIUM_TAX = 0.04;
const NON_PREMIUM_TAX = 0.08;

// Max acceptable data age in hours
const DEFAULT_MAX_AGE_HOURS = 6;

const SOURCE_CITIES = ['Lymhurst', 'Bridgewatch', 'Fort Sterling', 'Martlock', 'Thetford'] as const;

// Alias to the shared timezone-aware helper. The old local version parsed
// AODP dates as local time, silently adding the user's timezone offset to
// every age.
const ageHours = ageHoursOf;

export default function BMRunner() {
  const [tier, setTier] = useState<Tier>(6);
  const [enchant, setEnchant] = useState<Enchantment>(1);
  const [sourceCity, setSourceCity] = useState<typeof SOURCE_CITIES[number]>('Lymhurst');
  const [minProfit, setMinProfit] = useState(5000);
  const [minMargin, setMinMargin] = useState(15);
  const [premium, setPremium] = useState(true);
  const [maxAgeHours, setMaxAgeHours] = useState(DEFAULT_MAX_AGE_HOURS);
  const [mount, setMount] = useState('t8ox');
  const [rows, setRows] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'perKg'>('profit');
  const [skippedStale, setSkippedStale] = useState(0);

  const scan = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setSkippedStale(0);

    const ids = ALL_ITEMS.map(i => resolveItemId(i.baseId, tier, enchant));
    const prices: MarketPrice[] = await fetchPrices(
      ids,
      [sourceCity, 'Black Market'],
      false,
      true
    );

    // Index by item
    const buyMap = new Map<string, MarketPrice>();
    const bmMap = new Map<string, MarketPrice>();
    let stale = 0;

    for (const p of prices) {
      if (p.city === sourceCity) {
        if (p.sell_price_min <= 0) continue;
        if (ageHours(p.sell_price_min_date) > maxAgeHours) { stale++; continue; }
        const cur = buyMap.get(p.item_id);
        if (!cur || p.sell_price_min < cur.sell_price_min) buyMap.set(p.item_id, p);
      } else if (p.city === 'Black Market') {
        if (p.buy_price_max <= 0) continue;
        if (ageHours(p.buy_price_max_date) > maxAgeHours) { stale++; continue; }
        const cur = bmMap.get(p.item_id);
        if (!cur || p.buy_price_max > cur.buy_price_max) bmMap.set(p.item_id, p);
      }
    }
    setSkippedStale(stale);

    const taxRate = premium ? PREMIUM_TAX : NON_PREMIUM_TAX;
    const sellMultiplier = 1 - taxRate;

    const out: RunRow[] = [];
    for (const [itemId, buy] of buyMap.entries()) {
      const bm = bmMap.get(itemId);
      if (!bm) continue;

      const item = ALL_ITEMS.find(i => resolveItemId(i.baseId, tier, enchant) === itemId);
      if (!item) continue;

      const buyPrice = buy.sell_price_min;
      const bmBuyOrder = bm.buy_price_max;
      const netRevenue = bmBuyOrder * sellMultiplier;
      const profit = Math.round(netRevenue - buyPrice);
      const marginPct = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;

      if (profit < minProfit) continue;
      if (marginPct < minMargin) continue;

      out.push({
        itemId,
        itemName: item.name,
        category: item.category,
        buyPrice,
        buyAgeHours: ageHours(buy.sell_price_min_date),
        bmBuyOrder,
        bmAgeHours: ageHours(bm.buy_price_max_date),
        netRevenue,
        profit,
        marginPct,
        unitWeight: getItemWeight(itemId),
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setRows(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [tier, enchant, sourceCity, minProfit, minMargin, premium, maxAgeHours]);

  const mountCap = useMemo(() => getMountCapacity(mount), [mount]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortBy === 'profit') copy.sort((a, b) => b.profit - a.profit);
    else if (sortBy === 'margin') copy.sort((a, b) => b.marginPct - a.marginPct);
    else copy.sort((a, b) => (b.profit / b.unitWeight) - (a.profit / a.unitWeight));
    return copy;
  }, [rows, sortBy]);

  // One-trip summary: take as many unique top items as fit in mount capacity
  const tripSummary = useMemo(() => {
    if (sortedRows.length === 0) return null;
    let weightLeft = mountCap;
    let tripProfit = 0;
    let itemsCarried = 0;
    const carried: { name: string; qty: number; profit: number }[] = [];
    // Try to fit 100 of each top item until capacity runs out (a realistic one-trip assumption)
    for (const r of sortedRows) {
      if (weightLeft <= 0) break;
      const maxByWeight = Math.floor(weightLeft / r.unitWeight);
      const qty = Math.min(100, maxByWeight);
      if (qty <= 0) continue;
      weightLeft -= qty * r.unitWeight;
      tripProfit += qty * r.profit;
      itemsCarried += qty;
      carried.push({ name: r.itemName, qty, profit: qty * r.profit });
      if (carried.length >= 5) break;
    }
    return { tripProfit, itemsCarried, carried, weightUsed: mountCap - weightLeft };
  }, [sortedRows, mountCap]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500/10 via-purple-500/5 to-transparent rounded-xl border border-red-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base flex items-center gap-2">
          <span>⚠️</span>
          <span>Black Market Runner</span>
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          Buy gear in a royal city, transport to Caerleon, sell instantly to Black Market buy orders.
        </div>
      </div>

      {/* Risk banner */}
      <div className="bg-red-500/5 rounded-xl border border-red-500/20 px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
          <span className="text-base">💀</span>
        </div>
        <div className="text-xs text-zinc-400 flex-1">
          <div className="text-red-300 font-semibold mb-1">PvP warning</div>
          <div className="space-y-0.5">
            <div>• Red zones: full loot on death. Only carry what you can afford to lose.</div>
            <div>• Use Trickster Cape / Rat Tincture / speed food. Avoid groups with scouts.</div>
            <div>• BM uses <strong className="text-red-400">buy orders</strong> — you sell instantly to the highest existing order.</div>
            <div>• Tax on instant-sell: {premium ? '4%' : '8%'} {premium ? '(premium)' : '(no premium)'}.</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Source City</label>
            <select
              value={sourceCity}
              onChange={(e) => setSourceCity(e.target.value as typeof sourceCity)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              {SOURCE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Your Mount</label>
            <select
              value={mount}
              onChange={(e) => setMount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              {getMountGroups().map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.mounts.map(m => <option key={m.id} value={m.id}>{m.name} ({m.capacity.toLocaleString()} kg)</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Tier</label>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8].map(t => (
                <button
                  key={t}
                  onClick={() => setTier(t as Tier)}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${tier === t ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Enchant</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(e => (
                <button
                  key={e}
                  onClick={() => setEnchant(e as Enchantment)}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${enchant === e ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}
                >
                  .{e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Min Profit / Unit</label>
            <input
              type="number" min={0} value={minProfit}
              onChange={(e) => setMinProfit(parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Min Margin %</label>
            <input
              type="number" min={0} value={minMargin}
              onChange={(e) => setMinMargin(parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Max Data Age (hrs)</label>
            <input
              type="number" min={0.5} step={0.5} value={maxAgeHours}
              onChange={(e) => setMaxAgeHours(parseFloat(e.target.value) || 6)}
              className="w-full bg-zinc-800 border border-amber-500/30 rounded-lg px-3 py-2.5 text-sm text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Premium</label>
            <label className="flex items-center justify-center gap-1.5 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg h-10 hover:bg-zinc-800/80">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-red-500" />
              <span className="text-xs text-zinc-200">{premium ? '4% tax' : '8% tax'}</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={scan}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Scanning...' : `🎯 Scan ${sourceCity} → BM`}
          </button>
          {scannedAt && (
            <>
              <span className="text-[11px] text-zinc-400">
                <span className="text-green-400 font-semibold">{rows.length}</span> runnable items · Scanned at {scannedAt}
              </span>
              {skippedStale > 0 && (
                <span className="text-[11px] text-amber-400/80 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  {skippedStale} stale listings dropped
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Trip summary */}
      {tripSummary && tripSummary.tripProfit > 0 && (
        <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent rounded-xl border border-green-500/20 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10px] uppercase text-green-400/80 font-semibold tracking-wider">Estimated one-trip profit</div>
              <div className="text-2xl font-bold text-green-400 tabular-nums">+{formatSilver(tripSummary.tripProfit)}</div>
              <div className="text-[11px] text-zinc-500">
                {tripSummary.itemsCarried} items · {tripSummary.weightUsed.toFixed(0)} / {mountCap.toLocaleString()} kg used
              </div>
            </div>
            <div className="text-[10px] text-zinc-500 max-w-xs">
              Assumes 100 of each top item until mount is full. Not a guarantee — BM buy orders may fill before you arrive.
            </div>
          </div>
        </div>
      )}

      {/* BM order depth warning */}
      {rows.length > 0 && (
        <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 px-4 py-2.5 flex items-start gap-2">
          <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠</span>
          <div className="text-[11px] text-zinc-400">
            <strong className="text-amber-300">BM buy orders have LIMITED quantity!</strong>
            {' '}The price shown is the highest buy order — but there might only be 3-10 items at that price, not hundreds.
            {' '}<strong className="text-zinc-300">Before buying 100 items to transport, check the BM order book in-game</strong> (Caerleon AH → item → Buy Orders tab → see quantity per price).
            {' '}AODP does not provide order depth data.
          </div>
        </div>
      )}

      {/* Sort options */}
      {rows.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex items-center gap-2">
          <span className="text-[10px] uppercase text-zinc-500 font-semibold mr-2">Sort:</span>
          <button onClick={() => setSortBy('profit')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sortBy === 'profit' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            Profit
          </button>
          <button onClick={() => setSortBy('margin')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sortBy === 'margin' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            Margin %
          </button>
          <button onClick={() => setSortBy('perKg')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sortBy === 'perKg' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            Profit / kg
          </button>
        </div>
      )}

      {/* Results table */}
      {sortedRows.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-3 w-10">#</th>
                  <th className="text-left px-3 py-3 w-[68px]"></th>
                  <th className="text-left px-3 py-3">Item</th>
                  <th className="text-right px-3 py-3">Buy @ {sourceCity}</th>
                  <th className="text-right px-3 py-3">BM buy order</th>
                  <th className="text-right px-3 py-3">Profit</th>
                  <th className="text-right px-3 py-3">Margin</th>
                  <th className="text-right px-3 py-3">Weight</th>
                  <th className="text-right px-3 py-3">Profit/kg</th>
                  <th className="text-right px-3 py-3">Max per trip</th>
                  <th className="text-right px-3 py-3">Age</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, i) => {
                  const maxPerTrip = Math.floor(mountCap / r.unitWeight);
                  const profitPerKg = r.profit / r.unitWeight;
                  const maxAge = Math.max(r.buyAgeHours, r.bmAgeHours);
                  return (
                    <tr key={r.itemId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-3 py-3 text-zinc-600 font-semibold">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="w-14 h-14 flex items-center justify-center">
                          <ItemIcon itemId={r.itemId} size={56} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-zinc-200 font-medium">{r.itemName}</div>
                        <div className="text-[10px] text-gold font-bold">T{tier}{enchant > 0 && `.${enchant}`}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-red-400">-{formatSilver(r.buyPrice)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-green-400">+{formatSilver(r.bmBuyOrder)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-green-400">+{formatSilver(r.profit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-green-400">{formatPercent(r.marginPct)}</td>
                      <td className="px-3 py-3 text-right text-[11px] text-zinc-300 tabular-nums">{r.unitWeight} kg</td>
                      <td className="px-3 py-3 text-right tabular-nums text-lime-400">{formatSilver(profitPerKg)}</td>
                      <td className="px-3 py-3 text-right text-[11px] text-zinc-300 tabular-nums">{maxPerTrip}</td>
                      <td className="px-3 py-3 text-right">
                        {(() => {
                          const txt = formatAge(maxAge);
                          const color = maxAge < 1 ? 'text-green-400' : maxAge < 3 ? 'text-lime-400' : maxAge < 6 ? 'text-amber-400' : 'text-red-400';
                          return <span className={`text-[10px] font-semibold ${color}`}>{txt}</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">🎯</div>
          <h2 className="text-lg text-zinc-300 mb-2">Black Market Runner</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Pick your source city and mount, then scan to find gear that's cheaper in {sourceCity} than the Black Market will instantly pay.
          </p>
        </div>
      )}

      {!loading && scannedAt && sortedRows.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No runnable items found for these filters. Try a different tier/enchant or lower the min profit.
        </div>
      )}
    </div>
  );
}
