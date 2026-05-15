/**
 * Market Browser — flat AODP price table per selected city.
 *
 * Pick a category + tier(s) + enchant(s) and we expand every base item in
 * that category into full item IDs (T{tier}_{baseId}[@enchant]), fetch
 * live prices for the chosen city, and render a sortable table.
 *
 * Each row shows the best ask (lowest sell_price_min), best bid
 * (highest buy_price_max), and the freshest AODP timestamp across both
 * sides — colored green/yellow/orange/red by age via ageColor().
 */

import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Select, SectionDivider, EmptyState, WarningBox } from '../ui';
import { IconScales } from '../shell/navIcons';
import { ITEM_CATEGORIES } from '../../data/items';
import { CITIES } from '../../data/cities';
import { resolveItemId } from '../../utils/itemIdParser';
import { fetchPrices, getServer } from '../../services/api';
import type { AlbionServer } from '../../services/api';
import { ageHoursOf, formatAge, ageColor } from '../../utils/dataAge';
import { formatSilver } from '../../utils/formatters';
import { useAppStore } from '../../store/appStore';
import type { MarketPrice, Tier, Enchantment } from '../../types';
import ItemIcon from '../common/ItemIcon';

const TIERS: Tier[] = [4, 5, 6, 7, 8];
const ENCHANTS: Enchantment[] = [0, 1, 2, 3, 4];

interface Row {
  itemId: string;
  baseId: string;
  name: string;
  tier: Tier;
  enchant: Enchantment;
  sellMin: number;
  buyMax: number;
  ageHours: number;
  spreadPct: number;
}

/** Roll up AODP rows by item ID for the target city. AODP returns one row
 *  per (item, city, quality) combo — we collapse across qualities to the
 *  best ask, best bid, and freshest timestamp on either side. */
function rollup(prices: MarketPrice[], city: string): Map<string, { sellMin: number; buyMax: number; ageHours: number }> {
  const out = new Map<string, { sellMin: number; buyMax: number; ageHours: number }>();
  for (const p of prices) {
    if (p.city !== city) continue;
    const prev = out.get(p.item_id) ?? { sellMin: Infinity, buyMax: 0, ageHours: Infinity };

    if (p.sell_price_min > 0 && p.sell_price_min < prev.sellMin) {
      prev.sellMin = p.sell_price_min;
    }
    if (p.buy_price_max > prev.buyMax) {
      prev.buyMax = p.buy_price_max;
    }

    // Pick the freshest of the two sides; an item is "fresh" if either
    // its ask or bid was updated recently.
    const sellAge = ageHoursOf(p.sell_price_min_date);
    const buyAge  = ageHoursOf(p.buy_price_max_date);
    const freshest = Math.min(sellAge, buyAge);
    if (freshest < prev.ageHours) prev.ageHours = freshest;

    out.set(p.item_id, prev);
  }
  // Replace lingering Infinity sentinel with 0 so consumers don't have to.
  for (const [k, v] of out) {
    if (!Number.isFinite(v.sellMin)) v.sellMin = 0;
  }
  return out;
}

type SortKey = 'tier' | 'sellMin' | 'buyMax' | 'ageHours' | 'spreadPct';

export default function MarketBrowser() {
  const defaultCity = useAppStore(s => s.settings.craftingCity);
  const [server] = useState<AlbionServer>(() => getServer());
  const [city, setCity] = useState<string>(defaultCity ?? 'Martlock');
  const [categoryId, setCategoryId] = useState<string>(ITEM_CATEGORIES[0]?.id ?? 'sword');
  const [tiers, setTiers] = useState<Set<Tier>>(() => new Set<Tier>([4, 5, 6, 7, 8]));
  const [enchants, setEnchants] = useState<Set<Enchantment>>(() => new Set<Enchantment>([0]));
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  // Bump this to force a refresh that bypasses the 30s in-memory cache.
  const [refreshTick, setRefreshTick] = useState(0);

  const category = ITEM_CATEGORIES.find(c => c.id === categoryId) ?? ITEM_CATEGORIES[0];

  // Build every item ID to ask AODP about: cross-product of base items in
  // the picked category × selected tiers × selected enchants.
  const itemIds = useMemo(() => {
    const ids: string[] = [];
    for (const base of category.items) {
      for (const t of tiers) {
        for (const e of enchants) {
          ids.push(resolveItemId(base.baseId, t, e));
        }
      }
    }
    return ids;
  }, [category, tiers, enchants]);

  useEffect(() => {
    if (itemIds.length === 0) {
      setPrices([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrices(itemIds, [city], true, refreshTick > 0)
      .then(data => {
        if (cancelled) return;
        setPrices(data);
        setLastFetched(Date.now());
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemIds, city, refreshTick]);

  const rows = useMemo<Row[]>(() => {
    const map = rollup(prices, city);
    const out: Row[] = [];
    for (const base of category.items) {
      for (const t of tiers) {
        for (const e of enchants) {
          const itemId = resolveItemId(base.baseId, t, e);
          const entry = map.get(itemId);
          const sellMin = entry?.sellMin ?? 0;
          const buyMax  = entry?.buyMax  ?? 0;
          const ageHours = entry?.ageHours ?? Infinity;
          const spreadPct = sellMin > 0 && buyMax > 0
            ? ((sellMin - buyMax) / sellMin) * 100
            : 0;
          out.push({
            itemId,
            baseId: base.baseId,
            name: base.name,
            tier: t,
            enchant: e,
            sellMin,
            buyMax,
            ageHours,
            spreadPct,
          });
        }
      }
    }
    return out;
  }, [prices, city, category, tiers, enchants]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'tier') {
        const dTier = a.tier - b.tier;
        if (dTier !== 0) return dTier * dir;
        const dEnch = a.enchant - b.enchant;
        if (dEnch !== 0) return dEnch * dir;
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortKey === 'sellMin')   return (a.sellMin - b.sellMin) * dir;
      if (sortKey === 'buyMax')    return (a.buyMax - b.buyMax) * dir;
      if (sortKey === 'spreadPct') return (a.spreadPct - b.spreadPct) * dir;
      if (sortKey === 'ageHours') {
        // Infinity (no data) always lands at the bottom regardless of dir.
        const aN = Number.isFinite(a.ageHours) ? a.ageHours : 999999;
        const bN = Number.isFinite(b.ageHours) ? b.ageHours : 999999;
        return (aN - bN) * dir;
      }
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const withData = sorted.filter(r => r.sellMin > 0 || r.buyMax > 0);
  const noData   = sorted.length - withData.length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'tier' || key === 'ageHours' ? 'asc' : 'desc');
    }
  };

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    if (next.size === 0) return; // keep at least one filter active
    setter(next);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Market · Live AODP"
        title="Market Browser"
        description="Browse every craftable item in Albion at live AODP prices for the city you pick. Color of the age cell tells you how stale the listing is."
        icon={IconScales}
      />

      {/* Controls */}
      <section className="medieval-panel p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="City"
            value={city}
            onChange={setCity}
            options={CITIES.map(c => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Item category"
            value={categoryId}
            onChange={setCategoryId}
            options={ITEM_CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-1.5 font-medium">Tier</div>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map(t => {
              const active = tiers.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(tiers, t, setTiers)}
                  className={`px-3 py-1 rounded border text-xs font-bold transition-colors ${
                    active
                      ? 'bg-gold/20 border-gold/50 text-gold-light'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  T{t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-1.5 font-medium">Enchantment</div>
          <div className="flex flex-wrap gap-1.5">
            {ENCHANTS.map(e => {
              const active = enchants.has(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggle(enchants, e, setEnchants)}
                  className={`px-3 py-1 rounded border text-xs font-bold transition-colors ${
                    active
                      ? 'bg-gold/20 border-gold/50 text-gold-light'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  .{e}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <div className="text-[11px] text-zinc-500">
            Server <span className="text-zinc-300 font-bold uppercase">{server}</span>
            {' · '}
            {itemIds.length} item variants
            {lastFetched && (
              <>
                {' · last fetch '}
                <span className={ageColor(ageHoursOf(new Date(lastFetched).toISOString()))}>
                  {formatAge((Date.now() - lastFetched) / 3_600_000)} ago
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick(n => n + 1)}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-gold/20 hover:bg-gold/30 disabled:opacity-50 text-gold border border-gold/30 text-xs font-bold uppercase tracking-wider"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </section>

      {error && (
        <WarningBox tone="warning" title="AODP fetch failed">
          {error}. The data project is community-run and occasionally times out — try again in a few seconds.
        </WarningBox>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-wider px-1">
        <span>Age color:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> &lt;1h fresh</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400  inline-block" /> &lt;3h ok</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500  inline-block" /> &lt;8h stale</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500     inline-block" /> 8h+ very stale</span>
      </div>

      {/* Results */}
      <section className="medieval-panel overflow-hidden">
        <SectionDivider
          label={`${category.name} in ${city}`}
          hint={withData.length > 0
            ? `${withData.length} priced · ${noData} no data`
            : loading
              ? 'Fetching…'
              : 'No price data — try Refresh or pick another city'}
        />

        {sorted.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No items match the current filters" description="Pick at least one tier and one enchant." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="text-left  px-3 py-2 font-bold">Item</th>
                  <SortableTh active={sortKey === 'tier'}      dir={sortDir} onClick={() => handleSort('tier')}      align="left"  >Tier · Ench</SortableTh>
                  <SortableTh active={sortKey === 'sellMin'}   dir={sortDir} onClick={() => handleSort('sellMin')}   align="right">Sell order (min)</SortableTh>
                  <SortableTh active={sortKey === 'buyMax'}    dir={sortDir} onClick={() => handleSort('buyMax')}    align="right">Buy order (max)</SortableTh>
                  <SortableTh active={sortKey === 'spreadPct'} dir={sortDir} onClick={() => handleSort('spreadPct')} align="right">Spread</SortableTh>
                  <SortableTh active={sortKey === 'ageHours'}  dir={sortDir} onClick={() => handleSort('ageHours')}  align="right">Age</SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const hasAny = r.sellMin > 0 || r.buyMax > 0;
                  return (
                    <tr key={r.itemId} className={`border-t border-zinc-800 ${hasAny ? '' : 'opacity-40'}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ItemIcon itemId={r.itemId} size={36} quality={1} className="rounded" />
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-200 truncate">{r.name}</div>
                            <div className="text-[10px] text-zinc-600 font-mono truncate">{r.itemId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold tabular-nums">
                          T{r.tier}{r.enchant > 0 ? `.${r.enchant}` : ''}
                        </span>
                      </td>
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
                      <td className={`px-3 py-2 text-right tabular-nums text-xs font-bold ${ageColor(r.ageHours)}`}>
                        {formatAge(r.ageHours)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[10px] text-zinc-600 leading-relaxed px-1">
        Prices fetched from the Albion Online Data Project (community-uploaded). Stale slices are normal for niche items —
        cross-check the in-game market window before a big trade. Sell order = lowest ask you can BUY from. Buy order =
        highest bid you can sell INTO instantly.
      </p>
    </div>
  );
}

function SortableTh({
  active, dir, onClick, align, children,
}: {
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  align: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <th className={`px-3 py-2 font-bold cursor-pointer select-none text-${align}`} onClick={onClick}>
      <span className={active ? 'text-gold' : ''}>
        {children}
        {active && <span className="ml-1">{dir === 'asc' ? '▲' : '▼'}</span>}
      </span>
    </th>
  );
}
