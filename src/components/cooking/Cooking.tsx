import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import { CITIES } from '../../data/cities';
import ItemIcon from '../common/ItemIcon';
import type { MarketPrice, Tier } from '../../types';

interface CookingRecipe {
  name: string;
  baseId: string;
  category: string;
}

const COOKING_RECIPES: CookingRecipe[] = [
  { name: 'Carrot Soup', baseId: 'MEAL_SOUP', category: 'Soup' },
  { name: 'Goat Stew', baseId: 'MEAL_STEW', category: 'Stew' },
  { name: 'Goose Omelette', baseId: 'MEAL_OMELETTE', category: 'Omelette' },
  { name: 'Bean Salad', baseId: 'MEAL_SALAD', category: 'Salad' },
  { name: 'Wheat Sandwich', baseId: 'MEAL_SANDWICH', category: 'Sandwich' },
  { name: 'Pork Pie', baseId: 'MEAL_PIE', category: 'Pie' },
  { name: 'Beef Stew', baseId: 'MEAL_ROAST', category: 'Roast' },
  { name: 'Cabbage Soup', baseId: 'MEAL_SOUP_VEGETABLE', category: 'Soup' },
  { name: 'Beef Sandwich', baseId: 'MEAL_SANDWICH_FISH', category: 'Sandwich' },
];

export default function Cooking() {
  const [tier, setTier] = useState<Tier>(4);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    const ids = COOKING_RECIPES.map(r => `T${tier}_${r.baseId}`);
    const data = await fetchPrices(ids);
    setPrices(data);
    setLoading(false);
  }, [tier]);

  const displayCities = CITIES.filter(c => c.id !== 'Black Market' && c.id !== 'Caerleon');

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Cooking Recipes</h2>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-zinc-500">Tier:</span>
            {[3, 4, 5, 6, 7, 8].map(t => (
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
                <th className="text-left px-3 py-2.5">Meal</th>
                {displayCities.map(c => (
                  <th key={c.id} className="text-right px-3 py-2.5">{c.name.substring(0, 6)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COOKING_RECIPES.map(recipe => {
                const itemId = `T${tier}_${recipe.baseId}`;
                const getPrice = (city: string) => {
                  const p = prices.find(x => x.item_id === itemId && x.city === city);
                  return p?.sell_price_min || 0;
                };
                return (
                  <tr key={recipe.baseId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2"><ItemIcon itemId={itemId} size={24} /></td>
                    <td className="px-3 py-2 text-zinc-300">{recipe.name}</td>
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
