import { useState, useMemo } from 'react';
import { formatSilver, formatPercent } from '../../utils/formatters';

/**
 * Done Crafts History
 *
 * Manually log completed refining/crafting sessions:
 *   - What you crafted (tier, enchant, amount)
 *   - Upfront cost
 *   - Final sell revenue
 *   - Actual profit
 *
 * See which crafts performed well vs projected, stats per category.
 */

type CraftType = 'refining' | 'crafting' | 'butcher' | 'cooking' | 'farming' | 'flipping' | 'other';

interface CraftEntry {
  id: string;
  ts: number;
  type: CraftType;
  name: string; // e.g. "T6.1 Bloodoak Planks"
  cost: number;
  revenue: number;
  notes?: string;
}

const LS_KEY = 'albion-craft-history-v1';

function loadHistory(): CraftEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveHistory(entries: CraftEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

export default function CraftHistory() {
  const [entries, setEntries] = useState<CraftEntry[]>(loadHistory());
  const [filterType, setFilterType] = useState<CraftType | 'all'>('all');

  // New entry form
  const [newType, setNewType] = useState<CraftType>('refining');
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState<number | ''>('');
  const [newRevenue, setNewRevenue] = useState<number | ''>('');
  const [newNotes, setNewNotes] = useState('');

  const addEntry = () => {
    if (!newName || newCost === '' || newRevenue === '') return;
    const entry: CraftEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      ts: Date.now(),
      type: newType,
      name: newName,
      cost: typeof newCost === 'number' ? newCost : parseInt(newCost) || 0,
      revenue: typeof newRevenue === 'number' ? newRevenue : parseInt(newRevenue) || 0,
      notes: newNotes || undefined,
    };
    const next = [entry, ...entries];
    setEntries(next);
    saveHistory(next);
    setNewName('');
    setNewCost('');
    setNewRevenue('');
    setNewNotes('');
  };

  const removeEntry = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveHistory(next);
  };

  const filtered = useMemo(() => {
    return filterType === 'all' ? entries : entries.filter(e => e.type === filterType);
  }, [entries, filterType]);

  // Stats
  const stats = useMemo(() => {
    const byType: Record<string, { count: number; totalCost: number; totalRevenue: number; totalProfit: number }> = {};
    let grandCost = 0, grandRev = 0;
    for (const e of entries) {
      if (!byType[e.type]) byType[e.type] = { count: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0 };
      byType[e.type].count += 1;
      byType[e.type].totalCost += e.cost;
      byType[e.type].totalRevenue += e.revenue;
      byType[e.type].totalProfit += e.revenue - e.cost;
      grandCost += e.cost;
      grandRev += e.revenue;
    }
    return { byType, grandCost, grandRevenue: grandRev, grandProfit: grandRev - grandCost };
  }, [entries]);

  const typeLabels: Record<CraftType, { label: string; color: string }> = {
    refining: { label: 'Refining', color: 'text-cyan-400' },
    crafting: { label: 'Crafting', color: 'text-gold' },
    butcher: { label: 'Butcher', color: 'text-red-400' },
    cooking: { label: 'Cooking', color: 'text-orange-400' },
    farming: { label: 'Farming', color: 'text-lime-400' },
    flipping: { label: 'Flipping', color: 'text-purple-400' },
    other: { label: 'Other', color: 'text-zinc-400' },
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent rounded-xl border border-amber-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">📓 Done Crafts History</div>
        <div className="text-xs text-zinc-500 mt-1">
          Log completed sessions and see which craft types actually make you money. All stored locally in your browser.
        </div>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Sessions</div>
          <div className="text-xl font-black text-zinc-100 mt-1">{entries.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Invested</div>
          <div className="text-xl font-black text-red-400 mt-1 tabular-nums">{formatSilver(stats.grandCost)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Revenue</div>
          <div className="text-xl font-black text-green-400 mt-1 tabular-nums">{formatSilver(stats.grandRevenue)}</div>
        </div>
        <div className="bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Net Profit</div>
          <div className={`text-xl font-black mt-1 tabular-nums ${stats.grandProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.grandProfit >= 0 ? '+' : ''}{formatSilver(stats.grandProfit)}
          </div>
          {stats.grandCost > 0 && (
            <div className="text-[10px] text-zinc-600 mt-0.5">{formatPercent((stats.grandProfit / stats.grandCost) * 100)} ROI</div>
          )}
        </div>
      </div>

      {/* Stats per type */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">Stats by Type</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.byType).map(([type, s]) => {
              const label = typeLabels[type as CraftType];
              return (
                <div key={type} className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                  <div className={`text-[10px] uppercase font-semibold ${label?.color ?? 'text-zinc-400'}`}>{label?.label ?? type}</div>
                  <div className="text-[10px] text-zinc-600">{s.count} sessions</div>
                  <div className={`text-sm font-bold mt-1 tabular-nums ${s.totalProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.totalProfit >= 0 ? '+' : ''}{formatSilver(s.totalProfit)}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {s.totalCost > 0 ? formatPercent((s.totalProfit / s.totalCost) * 100) + ' ROI' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add entry form */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">Log a Session</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as CraftType)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Name</label>
            <input type="text" placeholder="T6.1 Bloodoak Planks" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Cost</label>
            <input type="number" min={0} value={newCost} onChange={(e) => setNewCost(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 block mb-1">Revenue</label>
            <input type="number" min={0} value={newRevenue} onChange={(e) => setNewRevenue(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <div className="flex items-end">
            <button onClick={addEntry} disabled={!newName || newCost === '' || newRevenue === ''} className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-30">
              + Save
            </button>
          </div>
        </div>
        <input type="text" placeholder="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full mt-3 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase text-zinc-500 font-semibold">Filter:</span>
        <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded text-[11px] font-semibold ${filterType === 'all' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
          All ({entries.length})
        </button>
        {Object.entries(typeLabels).map(([k, v]) => {
          const count = entries.filter(e => e.type === k).length;
          if (count === 0) return null;
          return (
            <button key={k} onClick={() => setFilterType(k as CraftType)} className={`px-3 py-1 rounded text-[11px] font-semibold ${filterType === k ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
              {v.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Entries */}
      {filtered.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Date</th>
                <th className="text-left px-3 py-2.5">Type</th>
                <th className="text-left px-3 py-2.5">Name</th>
                <th className="text-right px-3 py-2.5">Cost</th>
                <th className="text-right px-3 py-2.5">Revenue</th>
                <th className="text-right px-3 py-2.5">Profit</th>
                <th className="text-right px-3 py-2.5">ROI</th>
                <th className="text-right px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const profit = e.revenue - e.cost;
                const roi = e.cost > 0 ? (profit / e.cost) * 100 : 0;
                const tLabel = typeLabels[e.type];
                return (
                  <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2 text-zinc-500 text-[10px]">{new Date(e.ts).toLocaleDateString()}</td>
                    <td className="px-3 py-2"><span className={`text-[10px] font-semibold ${tLabel?.color}`}>{tLabel?.label}</span></td>
                    <td className="px-3 py-2">
                      <div className="text-zinc-200">{e.name}</div>
                      {e.notes && <div className="text-[10px] text-zinc-600">{e.notes}</div>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-400">-{formatSilver(e.cost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-400">+{formatSilver(e.revenue)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}{formatSilver(profit)}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(roi)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeEntry(e.id)} className="text-red-400/60 hover:text-red-400 text-xs">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-30">📓</div>
          <p className="text-sm text-zinc-500">Log your completed craft sessions above to build a profit history.</p>
        </div>
      )}
    </div>
  );
}
