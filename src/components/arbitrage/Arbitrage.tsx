import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { ALL_ITEMS } from '../../data/items';
import { resolveItemId } from '../../utils/itemIdParser';
import { formatSilver, formatPercent } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';
import type { MarketPrice, Tier, Enchantment } from '../../types';

interface ArbRow {
  itemId: string;
  itemName: string;
  buyCity: string;
  buyPrice: number;
  sellCity: string;
  sellPrice: number;
  profit: number;
  marginPct: number;
}

// Approximate 6.5% market tax on sell
const TAX = 0.065;

export default function Arbitrage() {
  const [tier, setTier] = useState<Tier>(4);
  const [enchant, setEnchant] = useState<Enchantment>(0);
  const [minProfit, setMinProfit] = useState(1000);
  const [rows, setRows] = useState<ArbRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setRows([]);

    const ids = ALL_ITEMS.map(i => resolveItemId(i.baseId, tier, enchant));
    const prices: MarketPrice[] = await fetchPrices(ids);

    // Group by item
    const byItem = new Map<string, MarketPrice[]>();
    for (const p of prices) {
      if (p.sell_price_min <= 0) continue;
      if (p.city === 'Black Market') continue; // BM has its own dynamic
      if (!byItem.has(p.item_id)) byItem.set(p.item_id, []);
      byItem.get(p.item_id)!.push(p);
    }

    const out: ArbRow[] = [];
    for (const [itemId, list] of byItem.entries()) {
      if (list.length < 2) continue;
      const nameMatch = ALL_ITEMS.find(i => resolveItemId(i.baseId, tier, enchant) === itemId);
      if (!nameMatch) continue;

      // Filter outliers (>2x median) before picking extremes
      const sortedByPrice = [...list].sort((a, b) => a.sell_price_min - b.sell_price_min);
      const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].sell_price_min;
      const filtered = list.filter(p => p.sell_price_min <= median * 2);
      if (filtered.length < 2) continue;

      // Cheapest buy and highest sell across cities
      let cheapest = filtered[0];
      let highest = filtered[0];
      for (const p of filtered) {
        if (p.sell_price_min < cheapest.sell_price_min) cheapest = p;
        if (p.sell_price_min > highest.sell_price_min) highest = p;
      }

      if (cheapest.city === highest.city) continue;

      const buyCost = cheapest.sell_price_min;
      const sellAfterTax = highest.sell_price_min * (1 - TAX);
      const profit = Math.round(sellAfterTax - buyCost);
      if (profit < minProfit) continue;

      out.push({
        itemId,
        itemName: nameMatch.name,
        buyCity: cheapest.city,
        buyPrice: buyCost,
        sellCity: highest.city,
        sellPrice: highest.sell_price_min,
        profit,
        marginPct: (profit / buyCost) * 100,
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setRows(out.slice(0, 100));
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [tier, enchant, minProfit]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent rounded-xl border border-purple-500/20 px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div className="text-xs text-zinc-400">
          <div className="text-zinc-200 font-semibold mb-0.5">Arbitrage Scanner</div>
          Finds items with the biggest price gap between cities. Profit shown is after 6.5% premium tax. Outlier listings (over 2x median) filtered out.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Tier</label>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8].map(t => (
                <button key={t} onClick={() => setTier(t as Tier)} className={`w-10 h-9 rounded text-xs font-bold ${tier === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Enchant</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(e => (
                <button key={e} onClick={() => setEnchant(e as Enchantment)} className={`w-10 h-9 rounded text-xs font-bold ${enchant === e ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">Min Profit</label>
            <input
              type="number"
              value={minProfit}
              onChange={(e) => setMinProfit(parseInt(e.target.value) || 0)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-28 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <button
            onClick={scan}
            disabled={loading}
            className="ml-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Scanning...' : 'Scan All Items'}
          </button>
        </div>
      </div>

      {scannedAt && <div className="text-[10px] text-zinc-600 text-right px-1">{rows.length} results · Scanned at {scannedAt}</div>}

      {rows.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5">#</th>
                  <th className="text-left px-3 py-2.5 w-10"></th>
                  <th className="text-left px-3 py-2.5">Item</th>
                  <th className="text-left px-3 py-2.5">Buy At</th>
                  <th className="text-right px-3 py-2.5">Buy Price</th>
                  <th className="text-left px-3 py-2.5">Sell At</th>
                  <th className="text-right px-3 py-2.5">Sell Price</th>
                  <th className="text-right px-3 py-2.5">Profit</th>
                  <th className="text-right px-3 py-2.5">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.itemId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2 text-zinc-600">{i + 1}</td>
                    <td className="px-3 py-2"><ItemIcon itemId={r.itemId} size={24} /></td>
                    <td className="px-3 py-2 text-zinc-200">{r.itemName}</td>
                    <td className="px-3 py-2 text-green-400">{r.buyCity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.buyPrice)}</td>
                    <td className="px-3 py-2 text-red-400">{r.sellCity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(r.sellPrice)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-green-400">+{formatSilver(r.profit)}</td>
                    <td className="px-3 py-2 text-right text-green-400">{formatPercent(r.marginPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#128200;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Arbitrage Scanner</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">Scans every craftable item across all royal cities and finds the biggest <strong className="text-purple-400">buy low, sell high</strong> spreads.</p>
        </div>
      )}

      {!loading && scannedAt && rows.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          No arbitrage opportunities above {formatSilver(minProfit)} profit. Try lowering the threshold.
        </div>
      )}

      {!CITIES.length && null}
    </div>
  );
}
