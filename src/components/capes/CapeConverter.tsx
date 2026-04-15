import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import { ageHoursOf, formatAge, ageColor } from '../../utils/dataAge';
import ItemIcon from '../common/ItemIcon';
import type { Tier, Enchantment, MarketPrice } from '../../types';

/**
 * Faction Cape Converter — buy a plain Cape + faction Crests + faction
 * Hearts from the market, talk to the faction NPC, get a faction cape.
 * All inputs are market-priced items so the full cost is purely silver.
 *
 * Only mob-faction capes are included. Royal-city faction capes
 * (Thetford, Lymhurst, Bridgewatch, Martlock, Fort Sterling, Caerleon)
 * need faction-mission standing and are NOT convertible from the market,
 * so they're excluded here.
 */

const BASE_CAPE_ID = 'CAPE'; // T{n}_CAPE@{e}

// Mob factions that convert plain capes using CREST + HEART tradeables.
const FACTIONS = [
  { key: 'KEEPER',  name: 'Keeper Cape',   capeId: 'CAPEITEM_KEEPER',   crestId: 'FACTIONTOKEN_KEEPER_CREST',   heartId: 'FACTIONTOKEN_KEEPER_HEART',   color: 'text-lime-400',    bg: 'bg-lime-500/5 border-lime-500/20' },
  { key: 'MORGANA', name: 'Morgana Cape',  capeId: 'CAPEITEM_MORGANA',  crestId: 'FACTIONTOKEN_MORGANA_CREST',  heartId: 'FACTIONTOKEN_MORGANA_HEART',  color: 'text-red-400',     bg: 'bg-red-500/5 border-red-500/20' },
  { key: 'UNDEAD',  name: 'Undead Cape',   capeId: 'CAPEITEM_UNDEAD',   crestId: 'FACTIONTOKEN_UNDEAD_CREST',   heartId: 'FACTIONTOKEN_UNDEAD_HEART',   color: 'text-purple-400',  bg: 'bg-purple-500/5 border-purple-500/20' },
  { key: 'HELL',    name: 'Demon Cape',    capeId: 'CAPEITEM_HELL',     crestId: 'FACTIONTOKEN_HELL_CREST',     heartId: 'FACTIONTOKEN_HELL_HEART',     color: 'text-orange-400',  bg: 'bg-orange-500/5 border-orange-500/20' },
  { key: 'HERETIC', name: 'Heretic Cape',  capeId: 'CAPEITEM_HERETIC',  crestId: 'FACTIONTOKEN_HERETIC_CREST',  heartId: 'FACTIONTOKEN_HERETIC_HEART',  color: 'text-amber-400',   bg: 'bg-amber-500/5 border-amber-500/20' },
  { key: 'AVALON',  name: 'Stalker Cape',  capeId: 'CAPEITEM_AVALON',   crestId: 'FACTIONTOKEN_AVALON_CREST',   heartId: 'FACTIONTOKEN_AVALON_HEART',   color: 'text-cyan-400',    bg: 'bg-cyan-500/5 border-cyan-500/20' },
];

// Conversion recipe per tier (plain cape + N crests + M hearts + silver fee)
// Adjust these if the actual in-game numbers differ.
const RECIPE: Record<number, { crests: number; hearts: number; silver: number }> = {
  4: { crests: 2,   hearts: 0,  silver: 0 },
  5: { crests: 4,   hearts: 1,  silver: 0 },
  6: { crests: 8,   hearts: 2,  silver: 0 },
  7: { crests: 16,  hearts: 4,  silver: 0 },
  8: { crests: 32,  hearts: 8,  silver: 0 },
};

const PREMIUM_TAX = 0.065;
const NON_PREMIUM_TAX = 0.105;

interface ConversionRow {
  factionKey: string;
  factionName: string;
  factionColor: string;
  factionBg: string;
  factionItemId: string;
  baseCapeItemId: string;
  crestItemId: string;
  heartItemId: string;
  tier: number;
  enchant: number;
  baseCapeCost: number;
  baseCapeAge: number;
  crestPrice: number;
  crestAge: number;
  crestQty: number;
  heartPrice: number;
  heartAge: number;
  heartQty: number;
  silverFee: number;
  totalCost: number;
  factionSellPrice: number;
  factionSellAge: number;
  factionSellCity: string;
  taxed: number;
  profit: number;
  roi: number;
}

function tierId(baseId: string, tier: number, enchant: number): string {
  return enchant > 0 ? `T${tier}_${baseId}@${enchant}` : `T${tier}_${baseId}`;
}

function cheapestNonBM(prices: MarketPrice[], itemId: string): { price: number; date: string | undefined } {
  let best = Infinity;
  let bestDate: string | undefined;
  for (const p of prices) {
    if (p.item_id !== itemId) continue;
    if (p.city === 'Black Market') continue;
    if (p.sell_price_min > 0 && p.sell_price_min < best) {
      best = p.sell_price_min;
      bestDate = p.sell_price_min_date;
    }
  }
  return { price: best === Infinity ? 0 : best, date: bestDate };
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

    // Collect every item ID we need: plain cape + each faction's cape + its
    // crest + its heart. Crests and hearts don't have enchant levels in
    // Albion (they're flat drops), so we fetch base tier IDs only.
    const ids: string[] = [tierId(BASE_CAPE_ID, tier, enchant)];
    for (const f of FACTIONS) {
      ids.push(tierId(f.capeId, tier, enchant));
      ids.push(`T${tier}_${f.crestId}`);
      ids.push(`T${tier}_${f.heartId}`);
    }

    const prices: MarketPrice[] = await fetchPrices(ids);

    const baseCapeItemId = tierId(BASE_CAPE_ID, tier, enchant);
    const base = cheapestNonBM(prices, baseCapeItemId);
    const recipe = RECIPE[tier];

    const taxRate = premium ? PREMIUM_TAX : NON_PREMIUM_TAX;

    const out: ConversionRow[] = [];
    for (const f of FACTIONS) {
      const factionItemId = tierId(f.capeId, tier, enchant);
      const crestItemId = `T${tier}_${f.crestId}`;
      const heartItemId = `T${tier}_${f.heartId}`;

      const crest = cheapestNonBM(prices, crestItemId);
      const heart = cheapestNonBM(prices, heartItemId);

      // Best sell listing for the faction cape (outlier filter 2x median)
      const listings: { city: string; price: number; date: string }[] = [];
      for (const p of prices) {
        if (p.item_id !== factionItemId) continue;
        if (p.city === 'Black Market') continue;
        if (p.sell_price_min > 0) {
          listings.push({ city: p.city, price: p.sell_price_min, date: p.sell_price_min_date });
        }
      }
      if (listings.length === 0) continue;
      let filtered = listings;
      if (listings.length >= 2) {
        const sorted = [...listings].sort((a, b) => a.price - b.price);
        const median = sorted[Math.floor(sorted.length / 2)].price;
        filtered = listings.filter(l => l.price <= median * 2);
      }
      filtered.sort((a, b) => b.price - a.price);
      const bestSell = filtered[0];

      const totalCost =
        base.price +
        crest.price * recipe.crests +
        heart.price * recipe.hearts +
        recipe.silver;
      const taxed = bestSell.price * (1 - taxRate);
      const profit = taxed - totalCost;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      out.push({
        factionKey: f.key,
        factionName: f.name,
        factionColor: f.color,
        factionBg: f.bg,
        factionItemId,
        baseCapeItemId,
        crestItemId,
        heartItemId,
        tier, enchant,
        baseCapeCost: base.price,
        baseCapeAge: ageHoursOf(base.date),
        crestPrice: crest.price,
        crestAge: ageHoursOf(crest.date),
        crestQty: recipe.crests,
        heartPrice: heart.price,
        heartAge: ageHoursOf(heart.date),
        heartQty: recipe.hearts,
        silverFee: recipe.silver,
        totalCost,
        factionSellPrice: bestSell.price,
        factionSellAge: ageHoursOf(bestSell.date),
        factionSellCity: bestSell.city,
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
  const recipe = RECIPE[tier];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent rounded-xl border border-indigo-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-1">Faction Cape Converter</div>
        <div className="text-xs text-zinc-400 space-y-0.5">
          <div>Buy a <strong className="text-indigo-300">plain Cape</strong> + <strong className="text-indigo-300">Crests</strong> + <strong className="text-indigo-300">Hearts</strong> from the market, talk to the faction NPC, get a faction cape.</div>
          <div>All inputs are market-priced, so total cost is purely silver. Only mob factions (Keeper / Morgana / Undead / Demon / Heretic / Stalker) are shown — royal FW capes need faction standing and aren't market-convertible.</div>
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
          <div className="text-[11px] text-zinc-500 flex items-center gap-3 flex-wrap">
            <span>Scanned at {scannedAt}</span>
            <span><span className="text-green-400 font-semibold">{profitCount}</span> / {rows.length} profitable</span>
            <span>T{tier} recipe: <span className="text-indigo-300 font-semibold">{recipe.crests}× crest</span>{recipe.hearts > 0 && <> + <span className="text-indigo-300 font-semibold">{recipe.hearts}× heart</span></>}{recipe.silver > 0 && <> + <span className="text-indigo-300 font-semibold">{formatSilver(recipe.silver)}</span> silver</>}</span>
          </div>
        )}
      </div>

      {/* Result cards */}
      {displayed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayed.map((r) => (
            <div
              key={r.factionKey}
              className={`rounded-xl border overflow-hidden ${r.profit > 0 ? 'border-zinc-800 bg-zinc-900' : 'border-red-900/30 bg-red-950/10 opacity-60'}`}
            >
              {/* Header */}
              <div className={`px-4 py-2.5 border-b border-zinc-800 ${r.factionBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <ItemIcon itemId={r.factionItemId} size={32} />
                  <div className={`text-sm font-bold ${r.factionColor}`}>{r.factionName}</div>
                </div>
                <span className="text-gold font-bold text-xs">T{r.tier}{r.enchant > 0 && `.${r.enchant}`}</span>
              </div>

              {/* Body — inputs */}
              <div className="px-4 py-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ItemIcon itemId={r.baseCapeItemId} size={16} />
                    <span className="text-zinc-500">1× Plain Cape</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 tabular-nums">-{formatSilver(r.baseCapeCost)}</span>
                    <span className={`text-[9px] tabular-nums ${ageColor(r.baseCapeAge)}`}>{formatAge(r.baseCapeAge)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ItemIcon itemId={r.crestItemId} size={16} />
                    <span className="text-zinc-500">{r.crestQty}× Crest <span className="text-zinc-600">@{formatSilver(r.crestPrice)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 tabular-nums">-{formatSilver(r.crestPrice * r.crestQty)}</span>
                    <span className={`text-[9px] tabular-nums ${ageColor(r.crestAge)}`}>{formatAge(r.crestAge)}</span>
                  </div>
                </div>
                {r.heartQty > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ItemIcon itemId={r.heartItemId} size={16} />
                      <span className="text-zinc-500">{r.heartQty}× Heart <span className="text-zinc-600">@{formatSilver(r.heartPrice)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 tabular-nums">-{formatSilver(r.heartPrice * r.heartQty)}</span>
                      <span className={`text-[9px] tabular-nums ${ageColor(r.heartAge)}`}>{formatAge(r.heartAge)}</span>
                    </div>
                  </div>
                )}
                {r.silverFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Silver fee</span>
                    <span className="text-red-400 tabular-nums">-{formatSilver(r.silverFee)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-800 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold">Total cost</span>
                  <span className="text-red-300 font-semibold tabular-nums">-{formatSilver(r.totalCost)}</span>
                </div>
                <div className="border-t border-zinc-800 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Sell @ {r.factionSellCity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 tabular-nums">+{formatSilver(r.factionSellPrice)}</span>
                    <span className={`text-[9px] tabular-nums ${ageColor(r.factionSellAge)}`}>{formatAge(r.factionSellAge)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">After {premium ? '6.5%' : '10.5%'} tax</span>
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
