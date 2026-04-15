import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import { ageHoursOf, formatAge, ageColor } from '../../utils/dataAge';
import ItemIcon from '../common/ItemIcon';
import type { Tier, Enchantment, MarketPrice } from '../../types';

/**
 * Faction Cape Converter — buy a plain crafted Cape, take it to a faction
 * NPC, pay silver + faction points, get a faction cape back. Compare the
 * profit across all faction capes for each tier/enchant.
 *
 * Faction points aren't purchasable, so they're treated as 'free' (earned
 * by faction missions). Only silver cost is factored into profit.
 */

const BASE_CAPE_ID = 'CAPE'; // T{n}_CAPE@{e}

// Faction cape item IDs. The ao-bin-dumps use these internal names.
const FACTION_CAPES = [
  // Royal city faction warfare capes
  { id: 'CAPEITEM_FW_CAERLEON',     name: 'Caerleon Cape',      city: 'Caerleon' },
  { id: 'CAPEITEM_FW_THETFORD',     name: 'Thetford Cape',      city: 'Thetford' },
  { id: 'CAPEITEM_FW_LYMHURST',     name: 'Lymhurst Cape',      city: 'Lymhurst' },
  { id: 'CAPEITEM_FW_BRIDGEWATCH',  name: 'Bridgewatch Cape',   city: 'Bridgewatch' },
  { id: 'CAPEITEM_FW_MARTLOCK',     name: 'Martlock Cape',      city: 'Martlock' },
  { id: 'CAPEITEM_FW_FORTSTERLING', name: 'Fort Sterling Cape', city: 'Fort Sterling' },
  // Mob faction capes (Keeper / Morgana / Undead / Hell / Heretic / Avalon)
  { id: 'CAPEITEM_KEEPER',   name: 'Keeper Cape',   city: 'Keeper Faction' },
  { id: 'CAPEITEM_MORGANA',  name: 'Morgana Cape',  city: 'Morgana Faction' },
  { id: 'CAPEITEM_UNDEAD',   name: 'Undead Cape',   city: 'Undead Faction' },
  { id: 'CAPEITEM_HELL',     name: 'Demon Cape',    city: 'Demon Faction' },
  { id: 'CAPEITEM_HERETIC',  name: 'Heretic Cape',  city: 'Heretic Faction' },
  { id: 'CAPEITEM_AVALON',   name: 'Stalker Cape',  city: 'Avalon Faction' },
];

// Silver cost to convert a plain cape to a faction cape. Scales ~4x per tier.
// Values are approximations — adjust if real in-game values differ.
const CONVERSION_SILVER_COST: Record<number, number> = {
  4: 1_200,
  5: 4_800,
  6: 19_200,
  7: 76_800,
  8: 307_200,
};

// Faction points required (shown for reference, not subtracted from profit
// since they are earned, not bought).
const FACTION_POINTS_COST: Record<number, number> = {
  4: 25, 5: 50, 6: 100, 7: 200, 8: 400,
};

// Premium account sales tax
const PREMIUM_TAX = 0.065;
const NON_PREMIUM_TAX = 0.105;

interface ConversionRow {
  factionName: string;
  factionCity: string;
  factionItemId: string;
  baseCapeItemId: string;
  tier: number;
  enchant: number;
  baseCost: number;
  baseAgeHours: number;
  factionPrice: number;
  factionAgeHours: number;
  factionSellCity: string;
  silverCost: number;
  focusCost: number;
  taxed: number;
  profit: number;
  roi: number;
}

function tierId(baseId: string, tier: number, enchant: number): string {
  return enchant > 0 ? `T${tier}_${baseId}@${enchant}` : `T${tier}_${baseId}`;
}

export default function CapeConverter() {
  const [tier, setTier] = useState<Tier>(6);
  const [enchant, setEnchant] = useState<Enchantment>(1);
  const [premium, setPremium] = useState(true);
  const [rows, setRows] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [hideNegative, setHideNegative] = useState(true);

  const scan = useCallback(async () => {
    setLoading(true);
    setRows([]);

    const ids: string[] = [tierId(BASE_CAPE_ID, tier, enchant)];
    for (const fc of FACTION_CAPES) {
      ids.push(tierId(fc.id, tier, enchant));
    }

    const prices: MarketPrice[] = await fetchPrices(ids);

    // Cheapest base cape sell across royal cities (that's what you buy)
    let baseCost = Infinity;
    let baseDate: string | undefined;
    const baseCapeItemId = tierId(BASE_CAPE_ID, tier, enchant);
    for (const p of prices) {
      if (p.item_id !== baseCapeItemId) continue;
      if (p.city === 'Black Market') continue;
      if (p.sell_price_min > 0 && p.sell_price_min < baseCost) {
        baseCost = p.sell_price_min;
        baseDate = p.sell_price_min_date;
      }
    }
    if (baseCost === Infinity) baseCost = 0;

    const silver = CONVERSION_SILVER_COST[tier] ?? 0;
    const focus = FACTION_POINTS_COST[tier] ?? 0;
    const taxRate = premium ? PREMIUM_TAX : NON_PREMIUM_TAX;

    const out: ConversionRow[] = [];
    for (const fc of FACTION_CAPES) {
      const factionItemId = tierId(fc.id, tier, enchant);
      // Find highest sell price for this faction cape across royal cities
      // (outlier filter: 2x median). Exclude Black Market.
      const listings: { city: string; price: number; date: string }[] = [];
      for (const p of prices) {
        if (p.item_id !== factionItemId) continue;
        if (p.city === 'Black Market') continue;
        if (p.sell_price_min > 0) {
          listings.push({ city: p.city, price: p.sell_price_min, date: p.sell_price_min_date });
        }
      }
      if (listings.length === 0) continue;

      // Outlier filter
      let filtered = listings;
      if (listings.length >= 2) {
        const sorted = [...listings].sort((a, b) => a.price - b.price);
        const median = sorted[Math.floor(sorted.length / 2)].price;
        filtered = listings.filter(l => l.price <= median * 2);
      }
      filtered.sort((a, b) => b.price - a.price);
      const best = filtered[0];

      const taxed = best.price * (1 - taxRate);
      const profit = taxed - baseCost - silver;
      const totalCost = baseCost + silver;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      out.push({
        factionName: fc.name,
        factionCity: fc.city,
        factionItemId,
        baseCapeItemId,
        tier, enchant,
        baseCost,
        baseAgeHours: ageHoursOf(baseDate),
        factionPrice: best.price,
        factionAgeHours: ageHoursOf(best.date),
        factionSellCity: best.city,
        silverCost: silver,
        focusCost: focus,
        taxed,
        profit,
        roi,
      });
    }

    out.sort((a, b) => b.profit - a.profit);
    setRows(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [tier, enchant, premium]);

  const displayed = hideNegative ? rows.filter(r => r.profit > 0) : rows;
  const profitCount = rows.filter(r => r.profit > 0).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent rounded-xl border border-indigo-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-1">Faction Cape Converter</div>
        <div className="text-xs text-zinc-400 space-y-0.5">
          <div>Buy a <strong className="text-indigo-300">plain Cape</strong>, take it to a <strong className="text-indigo-300">faction NPC</strong>, pay silver + faction points, get a <strong className="text-indigo-300">faction cape</strong> back.</div>
          <div>Profit assumes faction points are 'free' (earned by missions). Only silver + sales tax are subtracted.</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Tier</label>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8].map(t => (
                <button
                  key={t}
                  onClick={() => setTier(t as Tier)}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${tier === t ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Enchant</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(e => (
                <button
                  key={e}
                  onClick={() => setEnchant(e as Enchantment)}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${enchant === e ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800/80'}`}
                >
                  .{e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={premium} onChange={e => setPremium(e.target.checked)} className="accent-indigo-500" />
              <span className="text-xs text-zinc-300">Premium ({premium ? '6.5%' : '10.5%'} tax)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={hideNegative} onChange={e => setHideNegative(e.target.checked)} className="accent-indigo-500" />
              <span className="text-xs text-zinc-300">Hide unprofitable</span>
            </label>
          </div>
          <button
            onClick={scan}
            disabled={loading}
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Scan Cape Conversions'}
          </button>
        </div>

        {scannedAt && (
          <div className="text-[11px] text-zinc-500 flex items-center gap-3">
            <span>Scanned at {scannedAt}</span>
            <span><span className="text-green-400 font-semibold">{profitCount}</span> / {rows.length} profitable</span>
            <span>Conversion: <span className="text-indigo-300">{formatSilver(CONVERSION_SILVER_COST[tier] ?? 0)}</span> silver + <span className="text-cyan-400">{FACTION_POINTS_COST[tier] ?? 0}</span> faction pts</span>
          </div>
        )}
      </div>

      {/* Result cards */}
      {displayed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((r) => (
            <div
              key={r.factionItemId}
              className={`rounded-xl border overflow-hidden ${r.profit > 0 ? 'border-zinc-800 bg-zinc-900' : 'border-red-900/30 bg-red-950/10 opacity-60'}`}
            >
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-zinc-800 bg-indigo-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ItemIcon itemId={r.factionItemId} size={28} />
                  <div>
                    <div className="text-sm font-bold text-indigo-300">{r.factionName}</div>
                    <div className="text-[10px] text-zinc-500">{r.factionCity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gold font-bold text-xs">T{r.tier}{r.enchant > 0 && `.${r.enchant}`}</span>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ItemIcon itemId={r.baseCapeItemId} size={16} />
                    <span className="text-zinc-500">Buy plain Cape</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 tabular-nums">-{formatSilver(r.baseCost)}</span>
                    <span className={`text-[9px] tabular-nums ${ageColor(r.baseAgeHours)}`}>{formatAge(r.baseAgeHours)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Conversion silver</span>
                  <span className="text-red-400 tabular-nums">-{formatSilver(r.silverCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Faction points</span>
                  <span className="text-cyan-400 tabular-nums">{r.focusCost}</span>
                </div>
                <div className="border-t border-zinc-800 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Sell @ {r.factionSellCity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 tabular-nums">+{formatSilver(r.factionPrice)}</span>
                    <span className={`text-[9px] tabular-nums ${ageColor(r.factionAgeHours)}`}>{formatAge(r.factionAgeHours)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">After tax</span>
                  <span className="text-zinc-400 tabular-nums">+{formatSilver(r.taxed)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-4 py-2.5 border-t ${r.profit > 0 ? 'border-green-900/30 bg-green-950/20' : 'border-red-900/30 bg-red-950/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-lg font-black tabular-nums ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </div>
                    <div className="text-[10px] text-zinc-500">per cape</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold tabular-nums ${r.roi > 0 ? 'text-indigo-400' : 'text-zinc-600'}`}>
                      {r.roi > 0 ? '+' : ''}{r.roi.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-zinc-500">ROI</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">{'\uD83E\uDDE5'}</div>
          <h2 className="text-lg text-zinc-300 mb-2">Faction Cape Converter</h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Pick a tier and enchant, then scan to see which faction cape conversion makes the most silver.
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && displayed.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-sm text-zinc-500">
          No profitable conversions for this tier/enchant. Try a different combination or untick 'Hide unprofitable'.
        </div>
      )}
    </div>
  );
}
