import { useState, useCallback, useMemo } from 'react';
import { fetchPrices } from '../../services/api';
import { ALL_ITEMS } from '../../data/items';
import { resolveItemId } from '../../utils/itemIdParser';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import type { MarketPrice, Tier, Enchantment } from '../../types';

interface FlipRow {
  itemId: string;
  itemName: string;
  buyCity: string;
  buyPrice: number;
  sellCity: string;
  sellPrice: number;
  netRevenue: number;
  profit: number;
  marginPct: number;
  profitPer1M: number;
}

const PREMIUM_TAX = 0.065;
const NON_PREMIUM_TAX = 0.105;

export default function MarketFlipper() {
  const [tier, setTier] = useState<Tier>(6);
  const [enchant, setEnchant] = useState<Enchantment>(1);
  const [minProfit, setMinProfit] = useState(10000);
  const [minMargin, setMinMargin] = useState(15);
  const [premium, setPremium] = useState(true);
  const [sellMode, setSellMode] = useState<'market' | 'discord'>('market');
  const [rows, setRows] = useState<FlipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'per1m'>('profit');

  const scan = useCallback(async () => {
    setLoading(true);
    setRows([]);

    const ids = ALL_ITEMS.map(i => resolveItemId(i.baseId, tier, enchant));
    const prices: MarketPrice[] = await fetchPrices(ids);

    // Group by item
    const byItem = new Map<string, MarketPrice[]>();
    for (const p of prices) {
      if (p.sell_price_min <= 0) continue;
      if (p.city === 'Black Market') continue;
      if (!byItem.has(p.item_id)) byItem.set(p.item_id, []);
      byItem.get(p.item_id)!.push(p);
    }

    const taxRate = sellMode === 'discord' ? 0 : (premium ? PREMIUM_TAX : NON_PREMIUM_TAX);
    const sellMultiplier = sellMode === 'discord' ? 0.95 : (1 - taxRate);

    const out: FlipRow[] = [];
    for (const [itemId, list] of byItem.entries()) {
      if (list.length < 2) continue;
      const item = ALL_ITEMS.find(i => resolveItemId(i.baseId, tier, enchant) === itemId);
      if (!item) continue;

      // Outlier filter (>2x median)
      const sorted = [...list].sort((a, b) => a.sell_price_min - b.sell_price_min);
      const median = sorted[Math.floor(sorted.length / 2)].sell_price_min;
      const filtered = list.filter(p => p.sell_price_min <= median * 2);
      if (filtered.length < 2) continue;

      // Cheapest buy + highest sell
      let cheapest = filtered[0];
      let highest = filtered[0];
      for (const p of filtered) {
        if (p.sell_price_min < cheapest.sell_price_min) cheapest = p;
        if (p.sell_price_min > highest.sell_price_min) highest = p;
      }
      if (cheapest.city === highest.city) continue;

      const buyPrice = cheapest.sell_price_min;
      const sellPrice = highest.sell_price_min;
      const netRevenue = sellPrice * sellMultiplier;
      const profit = Math.round(netRevenue - buyPrice);
      const marginPct = (profit / buyPrice) * 100;

      if (profit < minProfit) continue;
      if (marginPct < minMargin) continue;

      out.push({
        itemId,
        itemName: item.name,
        buyCity: cheapest.city,
        buyPrice,
        sellCity: highest.city,
        sellPrice,
        netRevenue,
        profit,
        marginPct,
        profitPer1M: (profit / buyPrice) * 1_000_000,
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setRows(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [tier, enchant, minProfit, minMargin, premium, sellMode]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortBy === 'profit') copy.sort((a, b) => b.profit - a.profit);
    else if (sortBy === 'margin') copy.sort((a, b) => b.marginPct - a.marginPct);
    else copy.sort((a, b) => b.profitPer1M - a.profitPer1M);
    return copy;
  }, [rows, sortBy]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent rounded-xl border border-purple-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">Market Flipper</div>
        <div className="text-xs text-zinc-500">Buy low in one city, sell high in another. Outlier-filtered, tax-adjusted.</div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Tier</label>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8].map(t => (
                <button key={t} onClick={() => setTier(t as Tier)} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${tier === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}>
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Enchant</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(e => (
                <button key={e} onClick={() => setEnchant(e as Enchantment)} className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${enchant === e ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}>
                  .{e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Min Profit</label>
            <input type="number" min={0} value={minProfit} onChange={(e) => setMinProfit(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Min Margin %</label>
            <input type="number" min={0} value={minMargin} onChange={(e) => setMinMargin(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Sell Mode</label>
            <div className="grid grid-cols-2 gap-1 h-10">
              <button onClick={() => setSellMode('market')} className={`rounded-lg text-[11px] font-semibold transition-all ${sellMode === 'market' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Market
              </button>
              <button onClick={() => setSellMode('discord')} className={`rounded-lg text-[11px] font-semibold transition-all ${sellMode === 'discord' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Discord
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Premium</label>
            <label className="flex items-center justify-center gap-1.5 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg h-10 hover:bg-zinc-800/80">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-purple-500" />
              <span className="text-xs text-zinc-200">{premium ? '6.5% tax' : '10.5% tax'}</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={scan} disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 disabled:opacity-50 transition-colors">
            {loading ? 'Scanning...' : '🔍 Scan All Items'}
          </button>
          {scannedAt && <span className="text-[10px] text-zinc-600">Found {rows.length} opportunities · Scanned at {scannedAt}</span>}
        </div>
      </div>

      {/* Sort options */}
      {rows.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex items-center gap-2">
          <span className="text-[10px] uppercase text-zinc-500 font-semibold mr-2">Sort:</span>
          <button onClick={() => setSortBy('profit')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sortBy === 'profit' ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            Profit
          </button>
          <button onClick={() => setSortBy('margin')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sortBy === 'margin' ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            Margin %
          </button>
          <button onClick={() => setSortBy('per1m')} className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sortBy === 'per1m' ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            Per 1M invested
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
                  <th className="text-left px-3 py-3">Buy From</th>
                  <th className="text-right px-3 py-3">Buy Price</th>
                  <th className="text-left px-3 py-3">Sell At</th>
                  <th className="text-right px-3 py-3">Sell Price</th>
                  <th className="text-right px-3 py-3">Net Revenue</th>
                  <th className="text-right px-3 py-3">Profit</th>
                  <th className="text-right px-3 py-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, i) => (
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
                    <td className="px-3 py-2.5 text-green-400 font-semibold">{r.buyCity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{formatSilver(r.buyPrice)}</td>
                    <td className="px-3 py-2.5 text-red-400 font-semibold">{r.sellCity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{formatSilver(r.sellPrice)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{formatSilver(r.netRevenue)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-green-400">+{formatSilver(r.profit)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-400">{formatPercent(r.marginPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">💱</div>
          <h2 className="text-lg text-zinc-300 mb-2">Market Flipper</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">Scans all craftable items across cities to find the biggest <strong className="text-purple-400">buy low, sell high</strong> opportunities. Set your minimum profit/margin and click scan.</p>
        </div>
      )}

      {!loading && scannedAt && sortedRows.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No flip opportunities match your filters. Try lowering min profit or margin.
        </div>
      )}
    </div>
  );
}
