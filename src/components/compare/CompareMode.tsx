import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { RESOURCE_TYPES, CITY_REFINE_BONUS } from '../../data/refining';
import { lpbToReturnRate } from '../../utils/returnRate';
import { formatSilver, formatPercent } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

/**
 * Compare Mode — see T4.0-T8.3 refining profit side by side in one table.
 * Perfect for quickly answering "which tier/enchant is best right now?"
 */

const BASE_LPB = 18;
const CITY_LPB = 40;
const FOCUS_LPB = 59;
const TAX_RATE = 0.065;

interface CompareRow {
  tier: number;
  enchant: number;
  refinedName: string;
  refinedId: string;
  rawId: string;
  rawPrice: number;
  prevPrice: number;
  sellPrice: number;
  sellCity: string;
  rr: number;
  outputMult: number;
  profitPerCycle: number;
  marginPct: number;
  missingData: boolean;
}

export default function CompareMode() {
  const [resource, setResource] = useState('wood');
  const [city, setCity] = useState('Fort Sterling');
  const [useFocus, setUseFocus] = useState(false);
  const [sellMode, setSellMode] = useState<'market' | 'discord'>('market');
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setRows([]);

    const rt = RESOURCE_TYPES.find(r => r.id === resource);
    if (!rt) { setLoading(false); return; }

    // Gather all item IDs for this resource type (all tiers × all enchants)
    const ids = new Set<string>();
    for (const recipe of rt.recipes) {
      ids.add(recipe.rawId);
      ids.add(recipe.refinedId);
      if (recipe.prevRefinedId) ids.add(recipe.prevRefinedId);
    }

    const data = await fetchPrices([...ids], undefined, false, true);

    // Build lookups
    const cheapest = new Map<string, { price: number; city: string }>();
    const byCity = new Map<string, Array<{ city: string; price: number }>>();
    for (const p of data) {
      if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
      const cur = cheapest.get(p.item_id);
      if (!cur || p.sell_price_min < cur.price) cheapest.set(p.item_id, { price: p.sell_price_min, city: p.city });
      if (!byCity.has(p.item_id)) byCity.set(p.item_id, []);
      byCity.get(p.item_id)!.push({ city: p.city, price: p.sell_price_min });
    }

    // Compute RR based on config
    const bonusList = CITY_REFINE_BONUS[city] || [];
    const bonusActive = bonusList.includes(resource);
    let lpb = BASE_LPB;
    if (bonusActive) lpb += CITY_LPB;
    if (useFocus) lpb += FOCUS_LPB;
    const rr = lpbToReturnRate(lpb);
    const outputMult = 1 / (1 - rr);

    const sellMult = sellMode === 'discord' ? 0.95 : (1 - TAX_RATE);

    const out: CompareRow[] = [];
    for (const recipe of rt.recipes) {
      const raw = cheapest.get(recipe.rawId);
      const prev = recipe.prevRefinedId ? cheapest.get(recipe.prevRefinedId) : null;

      // Best sell with outlier filter
      const refList = byCity.get(recipe.refinedId) || [];
      if (refList.length === 0 || !raw) {
        out.push({
          tier: recipe.tier,
          enchant: recipe.enchant,
          refinedName: recipe.refinedName,
          refinedId: recipe.refinedId,
          rawId: recipe.rawId,
          rawPrice: 0, prevPrice: 0, sellPrice: 0, sellCity: '',
          rr, outputMult,
          profitPerCycle: 0, marginPct: 0,
          missingData: true,
        });
        continue;
      }
      const sorted = [...refList].sort((a, b) => a.price - b.price);
      const median = sorted[Math.floor(sorted.length / 2)].price;
      const filtered = refList.filter(e => e.price <= median * 2);
      if (filtered.length === 0) continue;
      filtered.sort((a, b) => b.price - a.price);
      const bestSell = filtered[0];

      // Per cycle: raw × rawPerCraft + prev × prevPerCraft → 1 refined
      // With reinvest: 1 cycle of upfront materials gives (1 + extras) outputs
      const costPerCycle = raw.price * recipe.rawPerCraft + (prev?.price ?? 0) * recipe.prevPerCraft;
      const revenuePerCycle = bestSell.price * outputMult * sellMult;
      const profitPerCycle = revenuePerCycle - costPerCycle;
      const marginPct = costPerCycle > 0 ? (profitPerCycle / costPerCycle) * 100 : 0;

      out.push({
        tier: recipe.tier,
        enchant: recipe.enchant,
        refinedName: recipe.refinedName,
        refinedId: recipe.refinedId,
        rawId: recipe.rawId,
        rawPrice: raw.price,
        prevPrice: prev?.price ?? 0,
        sellPrice: bestSell.price,
        sellCity: bestSell.city,
        rr, outputMult,
        profitPerCycle, marginPct,
        missingData: false,
      });
    }

    out.sort((a, b) => b.profitPerCycle - a.profitPerCycle);
    setRows(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [resource, city, useFocus, sellMode]);

  const enchantColor = (e: number) => {
    if (e === 0) return 'text-zinc-300';
    if (e === 1) return 'text-green-400';
    if (e === 2) return 'text-blue-400';
    return 'text-purple-400';
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent rounded-xl border border-cyan-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">⚖️ Compare Mode</div>
        <div className="text-xs text-zinc-500 mt-1">
          Side-by-side profit comparison across all tiers + enchants for the same resource. Quickly answer "which tier is best?"
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Resource</label>
            <select value={resource} onChange={(e) => setResource(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
              {RESOURCE_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Refine City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
              {['Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 w-full">
              <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} className="accent-cyan-500" />
              <span className="text-sm text-zinc-200">Use Focus</span>
            </label>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block mb-2">Sell Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setSellMode('market')} className={`h-10 rounded text-[11px] font-semibold ${sellMode === 'market' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Market
              </button>
              <button onClick={() => setSellMode('discord')} className={`h-10 rounded text-[11px] font-semibold ${sellMode === 'discord' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'}`}>
                Discord
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={scan} disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 disabled:opacity-50">
            {loading ? 'Scanning...' : '🔍 Compare All Tiers'}
          </button>
          {scannedAt && <span className="text-[10px] text-zinc-600">Scanned at {scannedAt}</span>}
        </div>
      </div>

      {/* Results table */}
      {rows.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-3">#</th>
                  <th className="text-left px-3 py-3 w-[56px]"></th>
                  <th className="text-left px-3 py-3">Item</th>
                  <th className="text-right px-3 py-3">Raw</th>
                  <th className="text-right px-3 py-3">Prev</th>
                  <th className="text-right px-3 py-3">Sell</th>
                  <th className="text-left px-3 py-3">@</th>
                  <th className="text-right px-3 py-3">Profit/cycle</th>
                  <th className="text-right px-3 py-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.tier}-${r.enchant}`} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${r.missingData ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5 text-zinc-600 font-semibold">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="w-12 h-12 flex items-center justify-center">
                        <ItemIcon itemId={r.refinedId} size={48} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className={`font-medium ${enchantColor(r.enchant)}`}>{r.refinedName}</div>
                      <div className="text-[10px] text-gold font-bold">T{r.tier}{r.enchant > 0 && `.${r.enchant}`}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{r.rawPrice > 0 ? formatSilver(r.rawPrice) : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{r.prevPrice > 0 ? formatSilver(r.prevPrice) : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{r.sellPrice > 0 ? formatSilver(r.sellPrice) : '—'}</td>
                    <td className="px-3 py-2.5 text-[10px] text-green-400">{r.sellCity}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${r.profitPerCycle > 0 ? 'text-green-400' : r.missingData ? 'text-zinc-600' : 'text-red-400'}`}>
                      {r.missingData ? 'no data' : `${r.profitPerCycle > 0 ? '+' : ''}${formatSilver(r.profitPerCycle)}`}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold ${r.profitPerCycle > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.missingData ? '—' : formatPercent(r.marginPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-30">⚖️</div>
          <p className="text-sm text-zinc-500">Pick a resource and click compare to see profit ranked across all tiers + enchants.</p>
        </div>
      )}
    </div>
  );
}
