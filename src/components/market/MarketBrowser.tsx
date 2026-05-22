/**
 * Market Browser — in-game-style single-item lookup.
 *
 * Flow mirrors the Albion market window:
 *   1. Type an item name (typeahead against ALL_ITEMS)
 *   2. Pick a tier (T4–T8) and enchant (.0–.4)
 *   3. Live AODP prices for that exact variant render across every
 *      royal city + Black Market, with sell/buy ages colored by
 *      freshness (green/yellow/orange/red).
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_ITEMS } from '../../data/items';
import { CITIES } from '../../data/cities';
import { resolveItemId } from '../../utils/itemIdParser';
import { fetchPrices } from '../../services/api';
import type { Tier, Enchantment, MarketPrice, ItemDefinition } from '../../types';
import { ageHoursOf, ageColor, formatAge, formatAgeVerbose, confidenceFromAge, describeConfidence } from '../../utils/dataAge';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import { PageHeader, EmptyState, WarningBox } from '../ui';
import { IconScales } from '../shell/navIcons';
import { usePageMeta } from '../../hooks/usePageMeta';

const TIERS: Tier[] = [4, 5, 6, 7, 8];
const ENCHANTS: Enchantment[] = [0, 1, 2, 3, 4];

interface CityRow {
  city: string;
  sellMin: number;
  buyMax: number;
  spreadPct: number;
  sellAgeH: number;
  buyAgeH: number;
}

/** Collapse AODP rows for a single item ID across qualities, per city.
 *  We take the lowest sell ask and the highest buy bid — the qualities
 *  that produced those prices set the age for each side. */
function rollupByCity(prices: MarketPrice[], itemId: string): CityRow[] {
  return CITIES.map(c => {
    let sellMin = Infinity;
    let buyMax = 0;
    let sellAgeH = Infinity;
    let buyAgeH = Infinity;

    for (const p of prices) {
      if (p.item_id !== itemId || p.city !== c.id) continue;

      if (p.sell_price_min > 0 && p.sell_price_min < sellMin) {
        sellMin = p.sell_price_min;
        sellAgeH = ageHoursOf(p.sell_price_min_date);
      }
      if (p.buy_price_max > buyMax) {
        buyMax = p.buy_price_max;
        buyAgeH = ageHoursOf(p.buy_price_max_date);
      }
    }

    const sellMinFinal = Number.isFinite(sellMin) ? sellMin : 0;
    const spreadPct = sellMinFinal > 0 && buyMax > 0
      ? ((sellMinFinal - buyMax) / sellMinFinal) * 100
      : 0;

    return {
      city: c.id,
      sellMin: sellMinFinal,
      buyMax,
      spreadPct,
      sellAgeH,
      buyAgeH,
    };
  });
}

export default function MarketBrowser() {
  usePageMeta({
    title: 'Market Browser',
    description: 'Live AODP market prices for every craftable Albion Online item across all six royal cities and the Black Market. Pick an item, tier and enchant — see sell orders, buy orders, spread and freshness side by side.',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemDefinition | null>(null);
  const [tier, setTier] = useState<Tier>(4);
  const [enchant, setEnchant] = useState<Enchantment>(0);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // URL state sync — supports shareable links like
  // /market?item=ARMOR_CLOTH_MORGANA&t=6&e=2. Mount reads URL → state once,
  // then state changes get pushed back as URL params.
  useEffect(() => {
    if (urlHydrated) return;
    const itemId = searchParams.get('item');
    const t = searchParams.get('t');
    const e = searchParams.get('e');
    if (itemId) {
      const found = ALL_ITEMS.find(i => i.baseId === itemId);
      if (found) {
        setSelectedItem(found);
        setQuery(found.name);
      }
    }
    if (t) {
      const parsedT = parseInt(t);
      if ([4, 5, 6, 7, 8].includes(parsedT)) setTier(parsedT as Tier);
    }
    if (e) {
      const parsedE = parseInt(e);
      if ([0, 1, 2, 3, 4].includes(parsedE)) setEnchant(parsedE as Enchantment);
    }
    setUrlHydrated(true);
  }, [urlHydrated, searchParams]);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams();
    if (selectedItem) params.set('item', selectedItem.baseId);
    if (tier !== 4) params.set('t', String(tier));
    if (enchant !== 0) params.set('e', String(enchant));
    setSearchParams(params, { replace: true });
  }, [urlHydrated, selectedItem, tier, enchant, setSearchParams]);

  // Close the suggestions dropdown when the user clicks anywhere outside
  // the search wrapper.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return ALL_ITEMS
      .filter(i => i.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query]);

  const itemId = selectedItem ? resolveItemId(selectedItem.baseId, tier, enchant) : null;

  useEffect(() => {
    if (!itemId) {
      setPrices([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrices([itemId], CITIES.map(c => c.id), true, refreshTick > 0)
      .then(data => {
        if (cancelled) return;
        setPrices(data);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'fetch failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [itemId, refreshTick]);

  const cityRows = useMemo(() => {
    if (!itemId) return [];
    return rollupByCity(prices, itemId);
  }, [prices, itemId]);

  const selectItem = (item: ItemDefinition) => {
    setSelectedItem(item);
    setQuery(item.name);
    setOpen(false);
  };

  const noData = cityRows.length > 0 && cityRows.every(r => r.sellMin === 0 && r.buyMax === 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Market · Live AODP"
        title="Market Browser"
        description="Type an item, pick tier and enchant, see every city's prices side-by-side — like the in-game market window."
        icon={IconScales}
      />

      <section className="medieval-panel p-4 space-y-4">
        {/* Search */}
        <div className="relative" ref={wrapperRef}>
          <label className="text-xs text-zinc-500 block mb-1.5 font-medium">Search item</label>
          <input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="e.g. Cultist Robe, Royal Sandals, Bloodletter…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40"
          />
          {open && matches.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg max-h-80 overflow-y-auto shadow-xl">
              {matches.map(item => (
                <button
                  key={item.baseId}
                  onClick={() => selectItem(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 text-left transition-colors"
                >
                  <ItemIcon itemId={`T4_${item.baseId}`} size={36} quality={1} className="rounded shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      {item.subcategory} · {item.baseId}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {open && query.trim().length > 0 && matches.length === 0 && (
            <div className="absolute z-30 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-xs text-zinc-500">
              No items match "{query}". Try a shorter name fragment.
            </div>
          )}
        </div>

        {/* Tier + Enchant chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1.5 font-medium">Tier</div>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map(t => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`px-3 py-1.5 rounded border text-xs font-bold transition-colors ${
                    tier === t
                      ? 'bg-gold/25 border-gold/60 text-gold-light'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1.5 font-medium">Enchantment</div>
            <div className="flex flex-wrap gap-1.5">
              {ENCHANTS.map(e => (
                <button
                  key={e}
                  onClick={() => setEnchant(e)}
                  className={`px-3 py-1.5 rounded border text-xs font-bold transition-colors ${
                    enchant === e
                      ? 'bg-gold/25 border-gold/60 text-gold-light'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  .{e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!selectedItem && (
        <EmptyState
          title="Pick an item to start"
          description="Type any item name in the box above. Tier and enchant pickers narrow it to the exact variant — e.g. Cultist Robe at T4 enchant 2 gives T4.2."
        />
      )}

      {selectedItem && itemId && (
        <section className="medieval-panel overflow-hidden">
          {/* Selected item header */}
          <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-4 min-w-0">
              <ItemIcon itemId={itemId} size={72} quality={1} className="rounded-lg shrink-0" />
              <div className="min-w-0">
                <div className="medieval-title-sm truncate">{selectedItem.name}</div>
                <div className="text-lg font-bold text-gold-light tabular-nums">
                  T{tier}{enchant > 0 ? `.${enchant}` : ''}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono mt-1 truncate">{itemId}</div>
              </div>
            </div>
            <button
              onClick={() => setRefreshTick(n => n + 1)}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-gold/20 hover:bg-gold/30 disabled:opacity-50 text-gold border border-gold/30 text-xs font-bold uppercase tracking-wider shrink-0"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {/* Price table or status */}
          {error ? (
            <div className="p-4">
              <WarningBox tone="warning" title="AODP fetch failed">
                {error}. Try Refresh in a few seconds — the data project is community-run and occasionally times out.
              </WarningBox>
            </div>
          ) : loading && prices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">Fetching live prices…</div>
          ) : noData ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No AODP data for this variant in any city. Niche tier/enchant combos often have zero listings —
              try a lower tier or enchant level.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="text-left  px-3 py-2 font-bold">City</th>
                    <th className="text-right px-3 py-2 font-bold">Sell order (min)</th>
                    <th className="text-right px-3 py-2 font-bold">Buy order (max)</th>
                    <th className="text-right px-3 py-2 font-bold">Spread</th>
                    <th className="text-right px-3 py-2 font-bold">Sell age</th>
                    <th className="text-right px-3 py-2 font-bold">Buy age</th>
                  </tr>
                </thead>
                <tbody>
                  {cityRows.map(r => {
                    const hasAny = r.sellMin > 0 || r.buyMax > 0;
                    return (
                      <tr key={r.city} className={`border-t border-zinc-800 ${hasAny ? '' : 'opacity-40'}`}>
                        <td className="px-3 py-2 font-medium text-zinc-200">{r.city}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.sellMin > 0 ? formatSilver(r.sellMin) : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.buyMax > 0 ? formatSilver(r.buyMax) : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                          {r.sellMin > 0 && r.buyMax > 0
                            ? <span className={r.spreadPct > 30 ? 'text-amber-300' : 'text-zinc-400'}>{r.spreadPct.toFixed(1)}%</span>
                            : <span className="text-zinc-700">—</span>}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums text-xs font-bold ${ageColor(r.sellAgeH)}`}
                          title={r.sellMin > 0
                            ? `Sell side ${formatAgeVerbose(r.sellAgeH)} — ${describeConfidence(confidenceFromAge(r.sellAgeH))}`
                            : 'No sell-side data'}
                        >
                          {formatAge(r.sellAgeH)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums text-xs font-bold ${ageColor(r.buyAgeH)}`}
                          title={r.buyMax > 0
                            ? `Buy side ${formatAgeVerbose(r.buyAgeH)} — ${describeConfidence(confidenceFromAge(r.buyAgeH))}`
                            : 'No buy-side data'}
                        >
                          {formatAge(r.buyAgeH)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-wider p-3 border-t border-zinc-800">
            <span>Age:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> &lt;1h</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400  inline-block" /> &lt;3h</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500  inline-block" /> &lt;8h</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500     inline-block" /> 8h+</span>
          </div>
        </section>
      )}

      <p className="text-[10px] text-zinc-600 leading-relaxed px-1">
        Sell order = lowest ask in that city (buy from). Buy order = highest bid (sell into for instant cash). Spread is
        how much you'd lose flipping in/out of a city in one move. Prices come from the Albion Online Data Project — niche
        items can be hours stale; cross-check the in-game window before any big trade.
      </p>
    </div>
  );
}
