import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { ALL_ITEMS } from '../../data/items';
import { resolveItemId } from '../../utils/itemIdParser';
import { formatSilver } from '../../utils/formatters';
import { fetchPriceHistory } from '../../services/priceHistory';
import type { HistorySeries } from '../../services/priceHistory';
import ItemIcon from '../common/ItemIcon';
import type { Tier, Enchantment } from '../../types';

const CITIES = ['Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Caerleon', 'Black Market'];
const COLORS: Record<string, string> = {
  'Bridgewatch':    '#f59e0b',
  'Fort Sterling':  '#e5e7eb',
  'Lymhurst':       '#22c55e',
  'Martlock':       '#3b82f6',
  'Thetford':       '#a855f7',
  'Caerleon':       '#ef4444',
  'Black Market':   '#6b7280',
};

const PAD_L = 60, PAD_R = 20, PAD_T = 20, PAD_B = 40;
const W = 900, H = 340;

export default function PriceHistory() {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<Tier>(4);
  const [enchant, setEnchant] = useState<Enchantment>(0);
  const [days, setDays] = useState(30);
  const [selectedItem, setSelectedItem] = useState<{ baseId: string; name: string } | null>(null);
  const [series, setSeries] = useState<HistorySeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabledCities, setEnabledCities] = useState<Set<string>>(new Set(CITIES));

  const fuse = useMemo(() => new Fuse(ALL_ITEMS, { keys: ['name', 'baseId'], threshold: 0.3 }), []);
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8).map(r => r.item);
  }, [query, fuse]);

  const loadHistory = useCallback(async (baseId: string) => {
    setLoading(true);
    const itemId = resolveItemId(baseId, tier, enchant);
    const data = await fetchPriceHistory(itemId, CITIES, days);
    setSeries(data);
    setLoading(false);
  }, [tier, enchant, days]);

  const handleSelect = (item: { baseId: string; name: string }) => {
    setSelectedItem(item);
    setQuery(item.name);
    loadHistory(item.baseId);
  };

  const reloadCurrent = () => {
    if (selectedItem) loadHistory(selectedItem.baseId);
  };

  const visibleSeries = series.filter(s => enabledCities.has(s.city));
  const allPoints = visibleSeries.flatMap(s => s.data);
  const minPrice = allPoints.length ? Math.min(...allPoints.map(p => p.avg_price)) : 0;
  const maxPrice = allPoints.length ? Math.max(...allPoints.map(p => p.avg_price)) : 1;
  const minTime = allPoints.length ? Math.min(...allPoints.map(p => new Date(p.timestamp).getTime())) : 0;
  const maxTime = allPoints.length ? Math.max(...allPoints.map(p => new Date(p.timestamp).getTime())) : 1;

  const xScale = (t: number) => PAD_L + ((t - minTime) / (maxTime - minTime || 1)) * (W - PAD_L - PAD_R);
  const yScale = (p: number) => H - PAD_B - ((p - minPrice) / (maxPrice - minPrice || 1)) * (H - PAD_T - PAD_B);

  const toggleCity = (city: string) => {
    setEnabledCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city); else next.add(city);
      return next;
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent rounded-xl border border-blue-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-0.5">Price History</div>
        <div className="text-xs text-zinc-400">30-day average price trends across all royal cities and Black Market. Useful for spotting patterns before buying or selling.</div>
      </div>

      {/* Search */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search item (e.g. 'bag', 'broadsword', 'plate armor')"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedItem(null); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {suggestions.length > 0 && !selectedItem && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-10 max-h-72 overflow-y-auto">
                {suggestions.map(item => (
                  <button
                    key={item.baseId}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 text-left"
                  >
                    <ItemIcon itemId={resolveItemId(item.baseId, tier, enchant)} size={26} />
                    <span className="text-sm text-zinc-200">{item.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-auto">{item.baseId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase text-zinc-500 mr-1">Tier</span>
            {[4, 5, 6, 7, 8].map(t => (
              <button key={t} onClick={() => { setTier(t as Tier); if (selectedItem) loadHistory(selectedItem.baseId); }}
                className={`w-8 h-8 rounded text-xs font-bold ${tier === t ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase text-zinc-500 mr-1">Ench</span>
            {[0, 1, 2, 3, 4].map(e => (
              <button key={e} onClick={() => { setEnchant(e as Enchantment); if (selectedItem) loadHistory(selectedItem.baseId); }}
                className={`w-8 h-8 rounded text-xs font-bold ${enchant === e ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase text-zinc-500 mr-1">Days</span>
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => { setDays(d); if (selectedItem) loadHistory(selectedItem.baseId); }}
                className={`px-2 h-8 rounded text-xs font-bold ${days === d ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'}`}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={reloadCurrent} disabled={!selectedItem || loading} className="px-4 h-8 rounded text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 disabled:opacity-50">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Chart */}
      {selectedItem && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ItemIcon itemId={resolveItemId(selectedItem.baseId, tier, enchant)} size={36} />
              <div>
                <div className="text-sm font-bold text-zinc-200">{selectedItem.name}</div>
                <div className="text-[10px] text-zinc-500">T{tier}{enchant > 0 && `.${enchant}`} · {days}-day history</div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="h-[340px] flex items-center justify-center text-zinc-500 text-sm">Loading price history...</div>
          )}

          {!loading && visibleSeries.length === 0 && (
            <div className="h-[340px] flex items-center justify-center text-zinc-500 text-sm">No history data available for this item.</div>
          )}

          {!loading && visibleSeries.length > 0 && (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                {/* Y-axis grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                  const y = H - PAD_B - frac * (H - PAD_T - PAD_B);
                  const price = minPrice + frac * (maxPrice - minPrice);
                  return (
                    <g key={frac}>
                      <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#27272a" strokeDasharray="2 4" />
                      <text x={PAD_L - 6} y={y + 4} textAnchor="end" fill="#71717a" fontSize="10">{formatSilver(price)}</text>
                    </g>
                  );
                })}
                {/* X-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                  const x = PAD_L + frac * (W - PAD_L - PAD_R);
                  const t = minTime + frac * (maxTime - minTime);
                  const date = new Date(t);
                  return (
                    <text key={frac} x={x} y={H - PAD_B + 18} textAnchor="middle" fill="#71717a" fontSize="10">
                      {date.getMonth() + 1}/{date.getDate()}
                    </text>
                  );
                })}
                {/* Lines per city */}
                {visibleSeries.map(s => {
                  if (s.data.length < 2) return null;
                  const points = s.data.map(p => `${xScale(new Date(p.timestamp).getTime())},${yScale(p.avg_price)}`).join(' ');
                  return (
                    <polyline
                      key={s.city}
                      fill="none"
                      stroke={COLORS[s.city] || '#888'}
                      strokeWidth="2"
                      points={points}
                    />
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 mt-3">
                {CITIES.map(city => {
                  const hasData = series.find(s => s.city === city)?.data.length;
                  const enabled = enabledCities.has(city);
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      disabled={!hasData}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-all ${
                        enabled && hasData ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                      } ${!hasData ? 'opacity-40' : 'cursor-pointer'}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[city] }} />
                      {city}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {!selectedItem && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">&#128200;</div>
          <h2 className="text-lg text-zinc-300 mb-2">Price History</h2>
          <p className="text-sm text-zinc-500">Search for any item to see its 30-day average price chart across all cities.</p>
        </div>
      )}
    </div>
  );
}
