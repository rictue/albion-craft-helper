import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';
import type { MarketPrice, Tier } from '../../types';

interface ButcherItem {
  name: string;
  baseId: string;
  type: 'raw' | 'meat';
}

const BUTCHER_ITEMS: ButcherItem[] = [
  { name: 'Raw Chicken', baseId: 'FARM_CHICKEN_ALIVE', type: 'raw' },
  { name: 'Chicken Meat', baseId: 'MEAT_LEVEL1', type: 'meat' },
  { name: 'Raw Goat', baseId: 'FARM_GOAT_GROWN', type: 'raw' },
  { name: 'Goat Meat', baseId: 'MEAT_LEVEL2', type: 'meat' },
  { name: 'Raw Goose', baseId: 'FARM_GOOSE_GROWN', type: 'raw' },
  { name: 'Goose Meat', baseId: 'MEAT_LEVEL3', type: 'meat' },
  { name: 'Raw Pig', baseId: 'FARM_PIG_GROWN', type: 'raw' },
  { name: 'Pork', baseId: 'MEAT_LEVEL4', type: 'meat' },
  { name: 'Raw Sheep', baseId: 'FARM_SHEEP_GROWN', type: 'raw' },
  { name: 'Mutton', baseId: 'MEAT_LEVEL5', type: 'meat' },
  { name: 'Raw Ox', baseId: 'FARM_OX_GROWN', type: 'raw' },
  { name: 'Beef', baseId: 'MEAT_LEVEL6', type: 'meat' },
  { name: 'Raw Horse', baseId: 'FARM_HORSE_GROWN', type: 'raw' },
  { name: 'Horse Meat', baseId: 'MEAT_LEVEL7', type: 'meat' },
];

export default function Butcher() {
  const [tier, setTier] = useState<Tier>(4);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    const ids = BUTCHER_ITEMS.map(r => `T${tier}_${r.baseId}`);
    const data = await fetchPrices(ids);
    setPrices(data);
    setLoading(false);
  }, [tier]);

  const displayCities = CITIES.filter(c => c.id !== 'Black Market' && c.id !== 'Caerleon');

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Butcher / Animal Products</h2>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-zinc-500">Tier:</span>
            {[2, 3, 4, 5, 6, 7, 8].map(t => (
              <button key={t} onClick={() => setTier(t as Tier)} className={`w-8 h-8 rounded text-xs font-bold ${tier === t ? 'bg-gold/20 text-gold' : 'bg-zinc-800 text-zinc-500'}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={loadPrices} disabled={loading} className="px-6 py-2 rounded-lg text-sm font-semibold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 disabled:opacity-50">
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
                <th className="text-left px-3 py-2.5">Type</th>
                {displayCities.map(c => (
                  <th key={c.id} className="text-right px-3 py-2.5">{c.name.substring(0, 6)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUTCHER_ITEMS.map(item => {
                const itemId = `T${tier}_${item.baseId}`;
                const getPrice = (city: string) => {
                  const p = prices.find(x => x.item_id === itemId && x.city === city);
                  return p?.sell_price_min || 0;
                };
                return (
                  <tr key={item.baseId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2"><ItemIcon itemId={itemId} size={24} /></td>
                    <td className="px-3 py-2 text-zinc-300">{item.name}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${item.type === 'raw' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>
                        {item.type}
                      </span>
                    </td>
                    {displayCities.map(c => {
                      const price = getPrice(c.id);
                      return (
                        <td key={c.id} className="px-3 py-2 text-right text-zinc-400">
                          {price > 0 ? formatSilver(price) : '-'}
                        </td>
                      );
                    })}
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
