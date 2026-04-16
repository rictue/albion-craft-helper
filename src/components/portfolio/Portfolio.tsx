import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import Fuse from 'fuse.js';
import { ALL_ITEMS } from '../../data/items';
import { resolveItemId } from '../../utils/itemIdParser';
import type { Tier, Enchantment } from '../../types';

/**
 * Portfolio Tracker
 *
 * Manually track what you own (cash + items), see total net worth,
 * P&L over time, and snapshot history.
 *
 * Stored in localStorage so it survives page reloads.
 */

interface PortfolioItem {
  id: string; // unique: baseId + tier + enchant
  baseId: string;
  name: string;
  tier: Tier;
  enchant: Enchantment;
  qty: number;
  notes?: string;
}

interface Snapshot {
  ts: number;
  cash: number;
  itemsValue: number;
  totalNetWorth: number;
}

const LS_KEY = 'albion-portfolio-v1';
const LS_SNAPSHOTS_KEY = 'albion-portfolio-snapshots-v1';

function loadPortfolio(): { cash: number; items: PortfolioItem[] } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt JSON or localStorage unavailable — fall through to empty default.
  }
  return { cash: 0, items: [] };
}
function savePortfolio(cash: number, items: PortfolioItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ cash, items }));
}
function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(LS_SNAPSHOTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt JSON or localStorage unavailable — start fresh.
  }
  return [];
}
function saveSnapshots(snaps: Snapshot[]) {
  localStorage.setItem(LS_SNAPSHOTS_KEY, JSON.stringify(snaps));
}

export default function Portfolio() {
  const initial = loadPortfolio();
  const [cash, setCash] = useState(initial.cash);
  const [items, setItems] = useState<PortfolioItem[]>(initial.items);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(loadSnapshots());
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Add item flow
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBase, setSelectedBase] = useState<{ baseId: string; name: string } | null>(null);
  const [newTier, setNewTier] = useState<Tier>(6);
  const [newEnchant, setNewEnchant] = useState<Enchantment>(0);
  const [newQty, setNewQty] = useState(1);

  // Persist changes
  useEffect(() => { savePortfolio(cash, items); }, [cash, items]);

  // Fetch market prices for all items in portfolio
  const refreshPrices = useCallback(async () => {
    if (items.length === 0) return;
    setLoading(true);
    const ids = [...new Set(items.map(i => resolveItemId(i.baseId, i.tier, i.enchant)))];
    const data = await fetchPrices(ids, undefined, false, true);

    // Best sell price (outlier-filtered)
    const prices: Record<string, number> = {};
    const byItem = new Map<string, number[]>();
    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      if (!byItem.has(p.item_id)) byItem.set(p.item_id, []);
      byItem.get(p.item_id)!.push(p.sell_price_min);
    }
    for (const [id, list] of byItem.entries()) {
      const sorted = [...list].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const filtered = list.filter(x => x <= median * 2);
      if (filtered.length > 0) prices[id] = Math.max(...filtered);
    }
    setMarketPrices(prices);
    setLoading(false);
  }, [items]);

  // Search items (fuzzy)
  const fuse = useMemo(() => new Fuse(ALL_ITEMS, { keys: ['name', 'baseId'], threshold: 0.3 }), []);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return fuse.search(searchQuery).slice(0, 6).map(r => r.item);
  }, [searchQuery, fuse]);

  // Total value computation
  const itemsValue = useMemo(() => {
    let total = 0;
    for (const it of items) {
      const id = resolveItemId(it.baseId, it.tier, it.enchant);
      const price = marketPrices[id] ?? 0;
      total += price * it.qty;
    }
    return total;
  }, [items, marketPrices]);

  const totalNetWorth = cash + itemsValue;

  // Compare with last snapshot
  const lastSnapshot = snapshots[snapshots.length - 1];
  const netWorthChange = lastSnapshot ? totalNetWorth - lastSnapshot.totalNetWorth : 0;

  const addItem = () => {
    if (!selectedBase) return;
    const id = `${selectedBase.baseId}-${newTier}-${newEnchant}`;
    const existing = items.find(i => i.id === id);
    if (existing) {
      setItems(items.map(i => i.id === id ? { ...i, qty: i.qty + newQty } : i));
    } else {
      setItems([...items, {
        id,
        baseId: selectedBase.baseId,
        name: selectedBase.name,
        tier: newTier,
        enchant: newEnchant,
        qty: newQty,
      }]);
    }
    setSearchQuery('');
    setSelectedBase(null);
    setNewQty(1);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems(items.map(i => i.id === id ? { ...i, qty } : i));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const takeSnapshot = () => {
    const snap: Snapshot = {
      ts: Date.now(),
      cash,
      itemsValue,
      totalNetWorth,
    };
    const next = [...snapshots, snap].slice(-30); // Keep last 30
    setSnapshots(next);
    saveSnapshots(next);
  };

  const deleteSnapshot = (ts: number) => {
    const next = snapshots.filter(s => s.ts !== ts);
    setSnapshots(next);
    saveSnapshots(next);
  };

  useEffect(() => {
    // Auto-refresh prices on mount (if any items)
    if (items.length > 0) refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold/10 via-amber-500/5 to-transparent rounded-xl border border-gold/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">💼 Portfolio Tracker</div>
        <div className="text-xs text-zinc-500 mt-1">
          Track your cash + items, see live net worth, snapshot history. All stored locally in your browser.
        </div>
      </div>

      {/* Net worth summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Cash</div>
          <input
            type="number"
            min={0}
            value={cash}
            onChange={(e) => setCash(parseInt(e.target.value) || 0)}
            className="w-full bg-transparent text-xl font-black text-zinc-100 mt-1 tabular-nums focus:outline-none"
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Items Value</div>
          <div className="text-xl font-black text-cyan-400 mt-1 tabular-nums">{formatSilver(itemsValue)}</div>
          <div className="text-[10px] text-zinc-600 mt-0.5">{items.length} unique items · {items.reduce((s, i) => s + i.qty, 0)} total</div>
        </div>
        <div className="bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Net Worth</div>
          <div className="text-xl font-black text-gold mt-1 tabular-nums">{formatSilver(totalNetWorth)}</div>
          {lastSnapshot && (
            <div className={`text-[10px] mt-0.5 ${netWorthChange > 0 ? 'text-green-400' : netWorthChange < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
              {netWorthChange > 0 ? '▲ +' : netWorthChange < 0 ? '▼ ' : ''}{formatSilver(netWorthChange)} since last snapshot
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={refreshPrices} disabled={loading || items.length === 0} className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 disabled:opacity-50">
          {loading ? 'Refreshing...' : '↻ Refresh Prices'}
        </button>
        <button onClick={takeSnapshot} className="px-4 py-2 rounded-lg text-xs font-bold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30">
          📸 Take Snapshot
        </button>
        <span className="text-[10px] text-zinc-600 ml-auto">1B goal: {formatPct(totalNetWorth / 1_000_000_000 * 100)}</span>
      </div>

      {/* Add item */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">Add Item</div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Search Item</label>
            <input
              type="text"
              placeholder="e.g. bloodoak planks, battleaxe"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedBase(null); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            {searchResults.length > 0 && !selectedBase && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                {searchResults.map(item => (
                  <button
                    key={item.baseId}
                    onClick={() => { setSelectedBase({ baseId: item.baseId, name: item.name }); setSearchQuery(item.name); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 text-left"
                  >
                    <ItemIcon itemId={resolveItemId(item.baseId, newTier, newEnchant)} size={24} />
                    <span className="text-sm text-zinc-200">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Tier</label>
            <select value={newTier} onChange={(e) => setNewTier(parseInt(e.target.value) as Tier)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
              {[2, 3, 4, 5, 6, 7, 8].map(t => <option key={t} value={t}>T{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Enchant</label>
            <select value={newEnchant} onChange={(e) => setNewEnchant(parseInt(e.target.value) as Enchantment)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
              {[0, 1, 2, 3, 4].map(e => <option key={e} value={e}>.{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Qty</label>
            <input type="number" min={1} value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 1)} className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <button onClick={addItem} disabled={!selectedBase} className="px-6 py-2 rounded-lg text-xs font-bold bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 disabled:opacity-30">
            + Add
          </button>
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Your Items</div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 w-10"></th>
                <th className="text-left px-3 py-2.5">Item</th>
                <th className="text-right px-3 py-2.5">Qty</th>
                <th className="text-right px-3 py-2.5">Unit Price</th>
                <th className="text-right px-3 py-2.5">Total Value</th>
                <th className="text-right px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const id = resolveItemId(it.baseId, it.tier, it.enchant);
                const price = marketPrices[id] ?? 0;
                const total = price * it.qty;
                return (
                  <tr key={it.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2"><ItemIcon itemId={id} size={32} /></td>
                    <td className="px-3 py-2">
                      <div className="text-zinc-200 font-medium">{it.name}</div>
                      <div className="text-[10px] text-gold font-bold">T{it.tier}{it.enchant > 0 && `.${it.enchant}`}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min={0} value={it.qty} onChange={(e) => updateQty(it.id, parseInt(e.target.value) || 0)} className="w-20 text-right bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200" />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{price > 0 ? formatSilver(price) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-cyan-400">{formatSilver(total)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeItem(it.id)} className="text-red-400/60 hover:text-red-400 text-xs">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Snapshots */}
      {snapshots.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Snapshot History ({snapshots.length})</div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Date</th>
                <th className="text-right px-3 py-2.5">Cash</th>
                <th className="text-right px-3 py-2.5">Items</th>
                <th className="text-right px-3 py-2.5">Net Worth</th>
                <th className="text-right px-3 py-2.5">Δ vs Previous</th>
                <th className="text-right px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {[...snapshots].reverse().map((s, i, arr) => {
                const prev = arr[i + 1];
                const delta = prev ? s.totalNetWorth - prev.totalNetWorth : 0;
                const date = new Date(s.ts);
                return (
                  <tr key={s.ts} className="border-b border-zinc-800/50">
                    <td className="px-3 py-2 text-zinc-400">{date.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatSilver(s.cash)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-cyan-400">{formatSilver(s.itemsValue)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gold font-bold">{formatSilver(s.totalNetWorth)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                      {prev ? (delta >= 0 ? '+' : '') + formatSilver(delta) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => deleteSnapshot(s.ts)} className="text-red-400/60 hover:text-red-400 text-xs">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && snapshots.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-30">💼</div>
          <p className="text-sm text-zinc-500">Add your cash and items to start tracking net worth.</p>
        </div>
      )}
    </div>
  );
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}
