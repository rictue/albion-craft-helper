import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { ALL_ITEMS } from '../../data/items';
import { fetchPrices } from '../../services/api';
import { resolveItemId } from '../../utils/itemIdParser';
import { formatSilver } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';
import type { MarketPrice, Tier, Enchantment } from '../../types';

export default function PricesBrowser() {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<Tier>(4);
  const [enchant, setEnchant] = useState<Enchantment>(0);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);

  const fuse = useMemo(() => new Fuse(ALL_ITEMS, { keys: ['name', 'baseId'], threshold: 0.3 }), []);
  const results = useMemo(() => {
    if (!query.trim()) return ALL_ITEMS.slice(0, 30);
    return fuse.search(query).slice(0, 30).map(r => r.item);
  }, [query, fuse]);

  const loadPrices = useCallback(async (items: typeof ALL_ITEMS) => {
    setLoading(true);
    const ids = items.map(i => resolveItemId(i.baseId, tier, enchant));
    const data = await fetchPrices(ids);
    setPrices(data);
    setLoading(false);
  }, [tier, enchant]);

  const displayCities = CITIES.filter(c => c.id !== 'Black Market' && c.id !== 'Caerleon');

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">Tier:</span>
            {[4, 5, 6, 7, 8].map(t => (
              <button key={t} onClick={() => setTier(t as Tier)} className={`w-8 h-8 rounded text-xs font-bold ${tier === t ? 'bg-gold/20 text-gold' : 'bg-zinc-800 text-zinc-500'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">Ench:</span>
            {[0, 1, 2, 3, 4].map(e => (
              <button key={e} onClick={() => setEnchant(e as Enchantment)} className={`w-8 h-8 rounded text-xs font-bold ${enchant === e ? 'bg-gold/20 text-gold' : 'bg-zinc-800 text-zinc-500'}`}>
                {e}
              </button>
            ))}
          </div>
          <button onClick={() => loadPrices(results)} disabled={loading} className="px-6 py-2 rounded-lg text-sm font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 disabled:opacity-50">
            {loading ? 'Loading...' : 'Load Prices'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 w-10"></th>
                <th className="text-left px-3 py-2.5">Item</th>
                {displayCities.map(c => (
                  <th key={c.id} className="text-right px-3 py-2.5">{c.name.substring(0, 6)}</th>
                ))}
                <th className="text-right px-3 py-2.5">BM Buy</th>
              </tr>
            </thead>
            <tbody>
              {results.map(item => {
                const itemId = resolveItemId(item.baseId, tier, enchant);
                const getPrice = (city: string) => {
                  const p = prices.find(x => x.item_id === itemId && x.city === city);
                  return p?.sell_price_min || 0;
                };
                const getBmBuy = () => {
                  const p = prices.find(x => x.item_id === itemId && x.city === 'Black Market');
                  return p?.buy_price_max || 0;
                };
                return (
                  <tr key={item.baseId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2"><ItemIcon itemId={itemId} size={24} /></td>
                    <td className="px-3 py-2 text-zinc-300">{item.name}</td>
                    {displayCities.map(c => {
                      const price = getPrice(c.id);
                      return (
                        <td key={c.id} className="px-3 py-2 text-right text-zinc-400">
                          {price > 0 ? formatSilver(price) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right text-blue-400">{getBmBuy() > 0 ? formatSilver(getBmBuy()) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
