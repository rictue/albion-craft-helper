import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

/**
 * Mount Breeding Calculator
 *
 * Buy baby mount → feed → grows into grown mount → butcher/sell.
 * Calculates profit per mount with offspring rate, feed cost, and market prices.
 */

const ANIMALS = [
  { tier: 3, name: 'Riding Horse',        babyId: 'T3_FARM_HORSE_BABY',        grownId: 'T3_FARM_HORSE_GROWN',        mountId: 'T3_MOUNT_MULE',          feed: 'Bean',    feedTier: 3, growDays: 2, baseOffspring: 0.80 },
  { tier: 4, name: 'Riding Ox',           babyId: 'T4_FARM_OX_BABY',           grownId: 'T4_FARM_OX_GROWN',           mountId: 'T4_MOUNT_OX',            feed: 'Wheat',   feedTier: 4, growDays: 3, baseOffspring: 0.80 },
  { tier: 5, name: 'Transport Ox',        babyId: 'T5_FARM_OX_BABY',           grownId: 'T5_FARM_OX_GROWN',           mountId: 'T5_MOUNT_OX',            feed: 'Turnip',  feedTier: 5, growDays: 4, baseOffspring: 0.85 },
  { tier: 6, name: 'Swiftclaw',           babyId: 'T6_FARM_DIREWOLF_BABY',     grownId: 'T6_FARM_DIREWOLF_GROWN',     mountId: 'T6_MOUNT_DIREWOLF',      feed: 'Cabbage', feedTier: 6, growDays: 5, baseOffspring: 0.85 },
  { tier: 7, name: 'Heretic Direwolf',    babyId: 'T7_FARM_DIREWOLF_BABY',     grownId: 'T7_FARM_DIREWOLF_GROWN',     mountId: 'T7_MOUNT_DIREWOLF',      feed: 'Potato',  feedTier: 7, growDays: 6, baseOffspring: 0.90 },
  { tier: 8, name: 'Armored Horse',       babyId: 'T8_FARM_HORSE_BABY',        grownId: 'T8_FARM_HORSE_GROWN',        mountId: 'T8_MOUNT_HORSE',         feed: 'Corn',    feedTier: 8, growDays: 6, baseOffspring: 0.93 },
];

const PREMIUM_TAX = 0.065;
const FEED_AMOUNT = 9; // Favorite food feed amount per animal

interface MountResult {
  tier: number;
  name: string;
  babyId: string;
  mountId: string;
  babyPrice: number;
  babyCity: string;
  mountPrice: number;
  mountCity: string;
  feedCost: number;
  offspringRate: number;
  netBabyCost: number;
  revenue: number;
  profit: number;
  profitPerDay: number;
  growDays: number;
  marginPct: number;
  missingData: boolean;
}

export default function MountBreeding() {
  const [focus, setFocus] = useState(false);
  const [results, setResults] = useState<MountResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const a of ANIMALS) {
      ids.push(a.babyId, a.grownId, a.mountId);
    }

    const data = await fetchPrices(ids, undefined, false, true);

    const cheapestBuy = new Map<string, { price: number; city: string }>();
    const byCity = new Map<string, Array<{ city: string; price: number }>>();
    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const cur = cheapestBuy.get(p.item_id);
      if (!cur || p.sell_price_min < cur.price) cheapestBuy.set(p.item_id, { price: p.sell_price_min, city: p.city });
      if (!byCity.has(p.item_id)) byCity.set(p.item_id, []);
      byCity.get(p.item_id)!.push({ city: p.city, price: p.sell_price_min });
    }

    const offspringBoost = focus ? 0.30 : 0;

    const out: MountResult[] = [];
    for (const a of ANIMALS) {
      const baby = cheapestBuy.get(a.babyId);
      const mountList = byCity.get(a.mountId) || [];

      if (!baby || mountList.length === 0) {
        out.push({
          tier: a.tier, name: a.name, babyId: a.babyId, mountId: a.mountId,
          babyPrice: baby?.price ?? 0, babyCity: baby?.city ?? '',
          mountPrice: 0, mountCity: '',
          feedCost: 0, offspringRate: 0, netBabyCost: 0,
          revenue: 0, profit: 0, profitPerDay: 0,
          growDays: a.growDays, marginPct: 0,
          missingData: true,
        });
        continue;
      }

      // Outlier-filtered best sell for mount
      const sorted = [...mountList].sort((x, y) => x.price - y.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      const filtered = mountList.filter(m => m.price <= median * 2);
      if (filtered.length === 0) continue;
      filtered.sort((x, y) => y.price - x.price);
      const bestMount = filtered[0];

      const offspringRate = Math.min(1.0, a.baseOffspring + offspringBoost);

      // Approximate feed cost: 9 crops × guessed crop price. Crops rare on AH so we use hardcoded estimates
      const feedPrices: Record<number, number> = { 3: 50, 4: 140, 5: 400, 6: 1200, 7: 3500, 8: 10000 };
      const feedCost = FEED_AMOUNT * (feedPrices[a.feedTier] ?? 100);

      const netBabyCost = baby.price * (1 - offspringRate);
      const grossRevenue = bestMount.price;
      const netRevenue = grossRevenue * (1 - PREMIUM_TAX);
      const profit = netRevenue - netBabyCost - feedCost;
      const profitPerDay = profit / Math.max(1, a.growDays);
      const totalCost = netBabyCost + feedCost;
      const marginPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      out.push({
        tier: a.tier,
        name: a.name,
        babyId: a.babyId,
        mountId: a.mountId,
        babyPrice: baby.price,
        babyCity: baby.city,
        mountPrice: bestMount.price,
        mountCity: bestMount.city,
        feedCost,
        offspringRate,
        netBabyCost,
        revenue: netRevenue,
        profit,
        profitPerDay,
        growDays: a.growDays,
        marginPct,
        missingData: false,
      });
    }

    out.sort((a, b) => b.profitPerDay - a.profitPerDay);
    setResults(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [focus]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-xl border border-amber-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">🐎 Mount Breeding Calculator</div>
        <div className="text-xs text-zinc-500 mt-1">
          Buy baby mount → feed it crops → grows → sell adult mount. Profit includes offspring rate and feed cost.
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5">
          <input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} className="accent-amber-500" />
          <span className="text-sm text-zinc-200">Use Focus (Nurture +30% offspring)</span>
        </label>
        <button onClick={scan} disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-50">
          {loading ? 'Scanning...' : '🔍 Scan Mounts'}
        </button>
        {scannedAt && <span className="text-[10px] text-zinc-600">Scanned at {scannedAt}</span>}
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-3 w-10"></th>
                <th className="text-left px-3 py-3">Mount</th>
                <th className="text-right px-3 py-3">Baby Buy</th>
                <th className="text-right px-3 py-3">Mount Sell</th>
                <th className="text-right px-3 py-3">Feed Cost</th>
                <th className="text-right px-3 py-3">Offspring</th>
                <th className="text-right px-3 py-3">Grow Time</th>
                <th className="text-right px-3 py-3">Profit/Mount</th>
                <th className="text-right px-3 py-3">Profit/Day</th>
                <th className="text-right px-3 py-3">Margin</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.tier} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${r.missingData ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2.5"><ItemIcon itemId={r.mountId} size={36} /></td>
                  <td className="px-3 py-2.5">
                    <div className="text-zinc-200 font-medium">{r.name}</div>
                    <div className="text-[10px] text-gold font-bold">T{r.tier}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">
                    {r.babyPrice > 0 ? formatSilver(r.babyPrice) : '—'}
                    <div className="text-[9px] text-zinc-600">{r.babyCity.substring(0, 6)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">
                    {r.mountPrice > 0 ? formatSilver(r.mountPrice) : '—'}
                    <div className="text-[9px] text-zinc-600">{r.mountCity.substring(0, 6)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">-{formatSilver(r.feedCost)}</td>
                  <td className="px-3 py-2.5 text-right text-lime-400">{formatPercent(r.offspringRate * 100)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-400">{r.growDays}d</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${r.profit > 0 ? 'text-green-400' : r.missingData ? 'text-zinc-600' : 'text-red-400'}`}>
                    {r.missingData ? 'no data' : (r.profit >= 0 ? '+' : '') + formatSilver(r.profit)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${r.profitPerDay > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.missingData ? '—' : (r.profitPerDay >= 0 ? '+' : '') + formatSilver(r.profitPerDay)}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.missingData ? '—' : formatPercent(r.marginPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Notes</div>
        <div className="text-xs text-zinc-400 space-y-1">
          <div>• <strong className="text-amber-400">Feed cost estimate</strong>: 9 favorite crops × hardcoded price (crops rarely on AH)</div>
          <div>• <strong className="text-amber-400">Offspring rate</strong>: chance to get baby back when grown. Focus/nurture adds +30%</div>
          <div>• <strong className="text-amber-400">Grow time</strong>: real hours in-game, halved with Premium</div>
          <div>• <strong className="text-amber-400">Mount item IDs</strong> approximated — some mounts may be missing from Albion's current game data</div>
        </div>
      </div>

      {!loading && results.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-30">🐎</div>
          <p className="text-sm text-zinc-500">Click scan to see mount breeding profit per tier.</p>
        </div>
      )}
    </div>
  );
}
