import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import { ageHoursOf, formatAge, ageColor } from '../../utils/dataAge';
import { useAppStore } from '../../store/appStore';
import ItemIcon from '../common/ItemIcon';
import type { Tier, Enchantment, MarketPrice } from '../../types';

/**
 * Faction Cape Converter — buy a plain Cape + faction Crests + faction
 * Faction Crest (the _BP blueprint) from the market, talk to the faction
 * NPC, get a faction cape back.
 * All inputs are market-priced items so the full cost is purely silver.
 *
 * Covers both royal-city faction capes (Lymhurst, Thetford, Bridgewatch,
 * Martlock, Fort Sterling, Caerleon, Brecilien) AND mob-faction capes
 * (Keeper, Morgana, Undead, Demon, Heretic, Stalker) — all convertible
 * via market-bought Crests (the _BP blueprint item).
 */

const BASE_CAPE_ID = 'CAPE'; // T{n}_CAPE@{e}

// Every faction that converts plain capes using market-tradeable Crests.
// Real item IDs verified against ao-bin-dumps/formatted/items.txt.
// Crest = blueprint variant of the cape, with the '_BP' suffix. No
// separate 'heart' item — the old 'heart' concept was a misconception;
// conversion recipe is just: 1 plain cape + 1 crest = 1 faction cape.
// (Note the Demon cape uses CAPEITEM_DEMON, not CAPEITEM_HELL.)
const FACTIONS = [
  // Royal FW factions — most popular in PvP per AFM meta data
  { key: 'LYMHURST',     name: 'Lymhurst Cape',     capeId: 'CAPEITEM_FW_LYMHURST',     crestId: 'CAPEITEM_FW_LYMHURST_BP',     color: 'text-green-400',   bg: 'bg-green-500/5 border-green-500/20' },
  { key: 'SMUGGLER',     name: 'Smuggler Cape',     capeId: 'CAPEITEM_SMUGGLER',        crestId: 'CAPEITEM_SMUGGLER_BP',        color: 'text-orange-300',  bg: 'bg-orange-500/5 border-orange-500/20' },
  { key: 'CAERLEON',     name: 'Caerleon Cape',     capeId: 'CAPEITEM_FW_CAERLEON',     crestId: 'CAPEITEM_FW_CAERLEON_BP',     color: 'text-rose-400',    bg: 'bg-rose-500/5 border-rose-500/20' },
  { key: 'THETFORD',     name: 'Thetford Cape',     capeId: 'CAPEITEM_FW_THETFORD',     crestId: 'CAPEITEM_FW_THETFORD_BP',     color: 'text-violet-400',  bg: 'bg-violet-500/5 border-violet-500/20' },
  { key: 'MARTLOCK',     name: 'Martlock Cape',     capeId: 'CAPEITEM_FW_MARTLOCK',     crestId: 'CAPEITEM_FW_MARTLOCK_BP',     color: 'text-sky-400',     bg: 'bg-sky-500/5 border-sky-500/20' },
  { key: 'FORTSTERLING', name: 'Fort Sterling Cape',capeId: 'CAPEITEM_FW_FORTSTERLING', crestId: 'CAPEITEM_FW_FORTSTERLING_BP', color: 'text-zinc-300',    bg: 'bg-zinc-500/5 border-zinc-500/20' },
  { key: 'BRIDGEWATCH',  name: 'Bridgewatch Cape',  capeId: 'CAPEITEM_FW_BRIDGEWATCH',  crestId: 'CAPEITEM_FW_BRIDGEWATCH_BP',  color: 'text-yellow-400',  bg: 'bg-yellow-500/5 border-yellow-500/20' },
  { key: 'BRECILIEN',    name: 'Brecilien Cape',    capeId: 'CAPEITEM_FW_BRECILIEN',    crestId: 'CAPEITEM_FW_BRECILIEN_BP',    color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/5 border-fuchsia-500/20' },
  // Mob factions
  { key: 'AVALON',       name: 'Avalonian Cape',    capeId: 'CAPEITEM_AVALON',          crestId: 'CAPEITEM_AVALON_BP',          color: 'text-cyan-400',    bg: 'bg-cyan-500/5 border-cyan-500/20' },
  { key: 'KEEPER',       name: 'Keeper Cape',       capeId: 'CAPEITEM_KEEPER',          crestId: 'CAPEITEM_KEEPER_BP',          color: 'text-lime-400',    bg: 'bg-lime-500/5 border-lime-500/20' },
  { key: 'MORGANA',      name: 'Morgana Cape',      capeId: 'CAPEITEM_MORGANA',         crestId: 'CAPEITEM_MORGANA_BP',         color: 'text-red-400',     bg: 'bg-red-500/5 border-red-500/20' },
  { key: 'UNDEAD',       name: 'Undead Cape',       capeId: 'CAPEITEM_UNDEAD',          crestId: 'CAPEITEM_UNDEAD_BP',          color: 'text-purple-400',  bg: 'bg-purple-500/5 border-purple-500/20' },
  { key: 'DEMON',        name: 'Demon Cape',        capeId: 'CAPEITEM_DEMON',           crestId: 'CAPEITEM_DEMON_BP',           color: 'text-red-500',     bg: 'bg-red-600/5 border-red-600/20' },
  { key: 'HERETIC',      name: 'Heretic Cape',      capeId: 'CAPEITEM_HERETIC',         crestId: 'CAPEITEM_HERETIC_BP',         color: 'text-amber-400',   bg: 'bg-amber-500/5 border-amber-500/20' },
];

// Conversion recipe per tier: 1 plain cape + N crests + silver fee.
// Crests are market-tradeable (the '_BP' variant of the cape item).
const RECIPE: Record<number, { crests: number; silver: number }> = {
  4: { crests: 1, silver: 0 },
  5: { crests: 1, silver: 0 },
  6: { crests: 1, silver: 0 },
  7: { crests: 1, silver: 0 },
  8: { crests: 1, silver: 0 },
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
  tier: number;
  enchant: number;
  baseCapeCost: number;
  baseCapeAge: number;
  crestPrice: number;
  crestAge: number;
  crestQty: number;
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

// Custom-price key format — matches the RecipeDisplay override scheme.
const customKey = (itemId: string) => `${itemId}:custom`;

export default function CapeConverter() {
  const { customPrices, setCustomPrice, removeCustomPrice } = useAppStore();
  const [tier, setTier] = useState<Tier>(6);
  const [enchant, setEnchant] = useState<Enchantment>(1);
  const [premium, setPremium] = useState(true);
  const [rows, setRows] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [hideNegative, setHideNegative] = useState(true);
  // Inline edit state — which item id is being edited and the draft text
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');

  const getOverride = (itemId: string): number | null => {
    const v = customPrices[customKey(itemId)];
    return v && v > 0 ? v : null;
  };

  const commitEdit = (itemId: string) => {
    const n = parseFloat(draft);
    if (Number.isFinite(n) && n > 0) setCustomPrice(customKey(itemId), n);
    else removeCustomPrice(customKey(itemId));
    setEditingId(null);
    setDraft('');
  };

  const scan = useCallback(async () => {
    setLoading(true);
    setRows([]);

    // Collect every item ID we need: plain cape + each faction's cape +
    // its crest (the _BP blueprint item). Crests are market-tradeable.
    const ids: string[] = [tierId(BASE_CAPE_ID, tier, enchant)];
    for (const f of FACTIONS) {
      ids.push(tierId(f.capeId, tier, enchant));
      ids.push(`T${tier}_${f.crestId}`);
    }

    const prices: MarketPrice[] = await fetchPrices(ids);

    // Helper: apply a user custom-price override to a {price,date} pair.
    // If the user typed a price for this item, it wins over the market.
    const withOverride = (itemId: string, market: { price: number; date: string | undefined }) => {
      const ov = customPrices[customKey(itemId)];
      if (ov && ov > 0) return { price: ov, date: undefined };
      return market;
    };

    const baseCapeItemId = tierId(BASE_CAPE_ID, tier, enchant);
    const base = withOverride(baseCapeItemId, cheapestNonBM(prices, baseCapeItemId));
    const recipe = RECIPE[tier];

    const taxRate = premium ? PREMIUM_TAX : NON_PREMIUM_TAX;

    const out: ConversionRow[] = [];
    for (const f of FACTIONS) {
      const factionItemId = tierId(f.capeId, tier, enchant);
      const crestItemId = `T${tier}_${f.crestId}`;

      const crest = withOverride(crestItemId, cheapestNonBM(prices, crestItemId));

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
        tier, enchant,
        baseCapeCost: base.price,
        baseCapeAge: ageHoursOf(base.date),
        crestPrice: crest.price,
        crestAge: ageHoursOf(crest.date),
        crestQty: recipe.crests,
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
  }, [tier, enchant, premium, customPrices]);

  const displayed = hideNegative ? rows.filter(r => r.profit > 0) : rows;
  const profitCount = rows.filter(r => r.profit > 0).length;
  const recipe = RECIPE[tier];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent rounded-xl border border-indigo-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-1">Faction Cape Converter</div>
        <div className="text-xs text-zinc-400 space-y-0.5">
          <div>Buy a <strong className="text-indigo-300">plain Cape</strong> + a <strong className="text-indigo-300">faction Crest</strong> (the _BP blueprint item) from the market, talk to the faction NPC, get a faction cape.</div>
          <div>All inputs are market-priced. Covers every faction: royal cities (Lymhurst, Caerleon, Thetford, Martlock, Fort Sterling, Bridgewatch, Brecilien) AND mob factions (Keeper, Morgana, Undead, Demon, Heretic, Stalker).</div>
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
            <span>T{tier} recipe: 1× plain cape + <span className="text-indigo-300 font-semibold">{recipe.crests}× crest</span>{recipe.silver > 0 && <> + <span className="text-indigo-300 font-semibold">{formatSilver(recipe.silver)}</span> silver</>}</span>
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

              {/* Body — inputs. Every unit price is click-to-edit so the
                  user can type their own buy-order fill price when market
                  data is stale or thin. */}
              <div className="px-4 py-3 space-y-1.5 text-xs">
                {([
                  { label: '1× Plain Cape', itemId: r.baseCapeItemId, qty: 1, unitPrice: r.baseCapeCost, age: r.baseCapeAge },
                  { label: `${r.crestQty}× Crest`, itemId: r.crestItemId, qty: r.crestQty, unitPrice: r.crestPrice, age: r.crestAge },
                ]).map(row => {
                  const isEditing = editingId === row.itemId;
                  const hasOverride = getOverride(row.itemId) != null;
                  return (
                    <div key={row.itemId} className={`flex items-center justify-between ${hasOverride ? 'ring-1 ring-gold/40 rounded px-1 -mx-1' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <ItemIcon itemId={row.itemId} size={16} />
                        <span className="text-zinc-500">
                          {row.label}{' '}
                          {isEditing ? (
                            <input
                              type="number" min={0} autoFocus
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitEdit(row.itemId);
                                if (e.key === 'Escape') { setEditingId(null); setDraft(''); }
                              }}
                              onBlur={() => commitEdit(row.itemId)}
                              className="w-20 bg-zinc-900 border border-gold/40 rounded px-1.5 py-0.5 text-[11px] text-gold text-right focus:outline-none"
                              placeholder="price/ea"
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingId(row.itemId); setDraft(hasOverride ? String(getOverride(row.itemId)) : (row.unitPrice > 0 ? String(row.unitPrice) : '')); }}
                              className={`text-zinc-600 hover:text-gold ${hasOverride ? 'text-gold' : ''}`}
                              title="Click to type your own price for this item"
                            >
                              @{formatSilver(row.unitPrice)}{hasOverride && ' ✎'}{!hasOverride && ' ✎'}
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 tabular-nums">-{formatSilver(row.unitPrice * row.qty)}</span>
                        <span className={`text-[9px] tabular-nums ${ageColor(row.age)}`}>{formatAge(row.age)}</span>
                      </div>
                    </div>
                  );
                })}
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
