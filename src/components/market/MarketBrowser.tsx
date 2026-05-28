/**
 * Market Browser — universal price checker.
 *
 * Searches the full Albion item catalog (weapons, armor, mounts, mount
 * skins, resources, consumables, journals, farmables, furniture, laborer
 * contracts) — not just the 221 craftable equipment items the calculators
 * use. The catalog (~3400 items) is lazy-loaded from /market-catalog.json
 * so it stays out of the main bundle.
 *
 * Flow: type a name → pick the exact item → (optional enchant for gear /
 * resources) → see live AODP prices across every royal city + Black
 * Market, with sell/buy ages colored by freshness.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CITIES } from '../../data/cities';
import { fetchPrices } from '../../services/api';
import type { MarketPrice } from '../../types';
import { ageHoursOf, ageColor, formatAge, formatAgeVerbose, confidenceFromAge, describeConfidence } from '../../utils/dataAge';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import { PageHeader, EmptyState, WarningBox } from '../ui';
import { IconScales } from '../shell/navIcons';
import { usePageMeta } from '../../hooks/usePageMeta';

interface CatalogItem {
  id: string;   // full, tier-prefixed item id (e.g. T6_MOUNT_HORSE)
  name: string;
  c: string;    // category label
  e: 0 | 1;     // 1 = supports enchant variants
}

const ENCHANTS = [0, 1, 2, 3, 4] as const;

interface CityRow {
  city: string;
  sellMin: number;
  buyMax: number;
  spreadPct: number;
  sellAgeH: number;
  buyAgeH: number;
}

function rollupByCity(prices: MarketPrice[], itemId: string): CityRow[] {
  return CITIES.map(c => {
    let sellMin = Infinity, buyMax = 0, sellAgeH = Infinity, buyAgeH = Infinity;
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
    const spreadPct = sellMinFinal > 0 && buyMax > 0 ? ((sellMinFinal - buyMax) / sellMinFinal) * 100 : 0;
    return { city: c.id, sellMin: sellMinFinal, buyMax, spreadPct, sellAgeH, buyAgeH };
  });
}

export default function MarketBrowser() {
  usePageMeta({
    title: 'Market Browser',
    description: 'Live AODP market prices for every Albion Online item — weapons, armor, mounts, resources, consumables, journals and more — across all six royal cities and the Black Market. Search any item and compare sell orders, buy orders, spread and data freshness.',
  });

  const [searchParams, setSearchParams] = useSearchParams();

  // Lazy-loaded catalog
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [enchant, setEnchant] = useState<number>(0);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch the catalog once.
  useEffect(() => {
    let cancelled = false;
    fetch('/market-catalog.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: CatalogItem[]) => { if (!cancelled) setCatalog(data); })
      .catch(() => { if (!cancelled) setCatalogError(true); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Categories present in the catalog, for the filter dropdown.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of catalog) set.add(it.c);
    return [...set].sort();
  }, [catalog]);

  // Close suggestions on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // URL hydrate (once, after catalog loads so we can resolve the id).
  useEffect(() => {
    if (urlHydrated || catalog.length === 0) return;
    const id = searchParams.get('item');
    const e = searchParams.get('e');
    if (id) {
      const found = catalog.find(c => c.id === id);
      if (found) { setSelectedItem(found); setQuery(found.name); }
    }
    if (e) {
      const pe = parseInt(e);
      if ([0, 1, 2, 3, 4].includes(pe)) setEnchant(pe);
    }
    setUrlHydrated(true);
  }, [urlHydrated, catalog, searchParams]);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams();
    if (selectedItem) params.set('item', selectedItem.id);
    if (enchant !== 0) params.set('e', String(enchant));
    setSearchParams(params, { replace: true });
  }, [urlHydrated, selectedItem, enchant, setSearchParams]);

  const matches = useMemo(() => {
    // Normalize _/@ to spaces and split into tokens (AND match). Crucially we
    // search the id too, not just the display name: players look up resources
    // by tier ("T6 leather"), but the localized name is "Hardened Leather" —
    // the tier only lives in the id (T6_LEATHER). Without this, every tier
    // search for resources/refined mats returns nothing.
    const tokens = query.trim().toLowerCase().replace(/[_@]/g, ' ').split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return catalog
      .filter(it => {
        if (categoryFilter !== 'all' && it.c !== categoryFilter) return false;
        const hay = `${it.name} ${it.id}`.toLowerCase().replace(/[_@]/g, ' ');
        return tokens.every(t => hay.includes(t));
      })
      .slice(0, 25);
  }, [query, catalog, categoryFilter]);

  // Final item id with optional enchant suffix.
  const itemId = useMemo(() => {
    if (!selectedItem) return null;
    return selectedItem.e === 1 && enchant > 0 ? `${selectedItem.id}@${enchant}` : selectedItem.id;
  }, [selectedItem, enchant]);

  useEffect(() => {
    if (!itemId) { setPrices([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrices([itemId], CITIES.map(c => c.id), true, refreshTick > 0)
      .then(data => { if (!cancelled) setPrices(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'fetch failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId, refreshTick]);

  const cityRows = useMemo(() => (itemId ? rollupByCity(prices, itemId) : []), [prices, itemId]);
  const noData = cityRows.length > 0 && cityRows.every(r => r.sellMin === 0 && r.buyMax === 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Market · Live AODP"
        title="Market Browser"
        description="Search any item in Albion — gear, mounts, resources, consumables, journals and more — and see live prices across every royal city and the Black Market, like the in-game market window."
        icon={IconScales}
      />

      <section className="medieval-panel p-4 space-y-4">
        {catalogError ? (
          <WarningBox tone="warning" title="Couldn't load the item catalog">
            The market catalog file failed to load. Refresh the page to try again.
          </WarningBox>
        ) : (
          <>
            {/* Category + search */}
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Category</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  disabled={catalogLoading}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  <option value="all">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="relative" ref={wrapperRef}>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">
                  Search item {catalogLoading ? '(loading catalog…)' : `(${catalog.length} items)`}
                </label>
                <input
                  type="search"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  disabled={catalogLoading}
                  placeholder="Riding Horse, Cultist Robe, T6 Leather, Beef Stew…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-50"
                />
                {open && matches.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg max-h-80 overflow-y-auto shadow-xl">
                    {matches.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedItem(item); setQuery(item.name); setOpen(false); if (item.e === 0) setEnchant(0); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 text-left transition-colors"
                      >
                        <ItemIcon itemId={item.id} size={32} quality={1} className="rounded shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{item.c} · <span className="font-mono">{item.id}</span></div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {open && query.trim().length > 0 && matches.length === 0 && !catalogLoading && (
                  <div className="absolute z-30 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-xs text-zinc-500">
                    No items match "{query}"{categoryFilter !== 'all' ? ` in ${categoryFilter}` : ''}.
                  </div>
                )}
              </div>
            </div>

            {/* Enchant toggle — only for enchantable categories */}
            {selectedItem?.e === 1 && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 block">Enchant</label>
                <div className="flex gap-1.5">
                  {ENCHANTS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEnchant(e)}
                      className={`px-3 py-1.5 rounded border text-xs font-bold ${
                        enchant === e ? 'bg-gold/25 border-gold/60 text-gold-light' : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      .{e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {!selectedItem && !catalogLoading && !catalogError && (
        <EmptyState
          title="Pick an item to start"
          description="Type any item name above — mounts, resources, gear, consumables, journals. Pick a category first to narrow the search."
        />
      )}

      {selectedItem && itemId && (
        <section className="medieval-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-4 min-w-0">
              <ItemIcon itemId={itemId} size={72} quality={1} className="rounded-lg shrink-0" />
              <div className="min-w-0">
                <div className="medieval-title-sm truncate">{selectedItem.name}</div>
                <div className="text-xs text-gold-light/80 uppercase tracking-wider">{selectedItem.c}</div>
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

          {error ? (
            <div className="p-4">
              <WarningBox tone="warning" title="AODP fetch failed">{error}. Try Refresh in a few seconds.</WarningBox>
            </div>
          ) : loading && prices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">Fetching live prices…</div>
          ) : noData ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No AODP data for this item in any city. Niche items (and most mount skins / furniture) often have zero uploaded listings.
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
                        <td className="px-3 py-2 text-right tabular-nums">{r.sellMin > 0 ? formatSilver(r.sellMin) : <span className="text-zinc-700">—</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.buyMax > 0 ? formatSilver(r.buyMax) : <span className="text-zinc-700">—</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                          {r.sellMin > 0 && r.buyMax > 0
                            ? <span className={r.spreadPct > 30 ? 'text-amber-300' : 'text-zinc-400'}>{r.spreadPct.toFixed(1)}%</span>
                            : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums text-xs font-bold ${ageColor(r.sellAgeH)}`}
                            title={r.sellMin > 0 ? `Sell side ${formatAgeVerbose(r.sellAgeH)} — ${describeConfidence(confidenceFromAge(r.sellAgeH))}` : 'No sell-side data'}>
                          {formatAge(r.sellAgeH)}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums text-xs font-bold ${ageColor(r.buyAgeH)}`}
                            title={r.buyMax > 0 ? `Buy side ${formatAgeVerbose(r.buyAgeH)} — ${describeConfidence(confidenceFromAge(r.buyAgeH))}` : 'No buy-side data'}>
                          {formatAge(r.buyAgeH)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
        Prices from the Albion Online Data Project (community-uploaded). Coverage is best for actively-traded gear and
        resources; many cosmetics, mount skins and furniture have little or no data. Cross-check the in-game window before
        a big trade.
      </p>
    </div>
  );
}
