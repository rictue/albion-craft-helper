import { useState, useCallback } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';

const PROFESSIONS = [
  { id: 'WARRIOR', name: 'Warrior', desc: 'Melee weapons + plate armor' },
  { id: 'MAGE', name: 'Mage', desc: 'Staves + cloth armor' },
  { id: 'HUNTER', name: 'Hunter', desc: 'Bows + leather armor' },
  { id: 'TOOLMAKER', name: 'Toolmaker', desc: 'Bags, capes, offhands, tools' },
];

// Journal fame capacity per tier (from wiki)
const JOURNAL_CAPACITY: Record<number, number> = {
  3: 9000,
  4: 45000,
  5: 135000,
  6: 405000,
  7: 1215000,
  8: 3645000,
};

interface JournalResult {
  profession: string;
  tier: number;
  emptyPrice: number;
  emptyCity: string;
  fullPrice: number;
  fullCity: string;
  fameCapacity: number;
  profit: number;
  silverPerFame: number;
}

export default function JournalsCalculator() {
  const [results, setResults] = useState<JournalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);

    const ids: string[] = [];
    for (const p of PROFESSIONS) {
      for (let t = 3; t <= 8; t++) {
        ids.push(`T${t}_JOURNAL_${p.id}_EMPTY`);
        ids.push(`T${t}_JOURNAL_${p.id}_FULL`);
      }
    }

    const prices = await fetchPrices(ids);

    // Cheapest empty (buy) + highest full (sell)
    const cheapestEmpty = new Map<string, { price: number; city: string }>();
    const bestFull = new Map<string, { price: number; city: string }>();
    for (const pr of prices) {
      if (pr.sell_price_min <= 0 || pr.city === 'Black Market') continue;
      if (pr.item_id.includes('_EMPTY')) {
        const cur = cheapestEmpty.get(pr.item_id);
        if (!cur || pr.sell_price_min < cur.price) {
          cheapestEmpty.set(pr.item_id, { price: pr.sell_price_min, city: pr.city });
        }
      } else if (pr.item_id.includes('_FULL')) {
        const cur = bestFull.get(pr.item_id);
        if (!cur || pr.sell_price_min > cur.price) {
          bestFull.set(pr.item_id, { price: pr.sell_price_min, city: pr.city });
        }
      }
    }

    const out: JournalResult[] = [];
    for (const p of PROFESSIONS) {
      for (let t = 3; t <= 8; t++) {
        const emptyKey = `T${t}_JOURNAL_${p.id}_EMPTY`;
        const fullKey = `T${t}_JOURNAL_${p.id}_FULL`;
        const empty = cheapestEmpty.get(emptyKey);
        const full = bestFull.get(fullKey);
        if (!empty || !full) continue;

        const capacity = JOURNAL_CAPACITY[t];
        const profit = full.price - empty.price;
        out.push({
          profession: p.name,
          tier: t,
          emptyPrice: empty.price,
          emptyCity: empty.city,
          fullPrice: full.price,
          fullCity: full.city,
          fameCapacity: capacity,
          profit,
          silverPerFame: profit / capacity,
        });
      }
    }

    out.sort((a, b) => b.silverPerFame - a.silverPerFame);
    setResults(out);
    setScannedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-xl border border-emerald-500/20 px-4 py-3">
        <div className="text-zinc-100 font-bold text-base">Journals Calculator</div>
        <div className="text-xs text-zinc-500">
          Buy empty journals, fill them with crafting fame, sell full. Shows silver earned per fame point — your fame's extra value when routed through journals.
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">4 professions × T3-T8 = 24 journal types</div>
        <button onClick={scan} disabled={loading} className="px-6 py-2 rounded-lg text-sm font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 disabled:opacity-50">
          {loading ? 'Scanning...' : '🔍 Scan Journals'}
        </button>
      </div>

      {scannedAt && (
        <div className="text-[10px] text-zinc-600 text-right">
          Found {results.length} profitable journals · Scanned at {scannedAt}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-3 w-10">#</th>
                  <th className="text-left px-3 py-3 w-10"></th>
                  <th className="text-left px-3 py-3">Profession</th>
                  <th className="text-center px-3 py-3">Tier</th>
                  <th className="text-right px-3 py-3">Empty Buy</th>
                  <th className="text-left px-3 py-3">From</th>
                  <th className="text-right px-3 py-3">Full Sell</th>
                  <th className="text-left px-3 py-3">At</th>
                  <th className="text-right px-3 py-3">Capacity</th>
                  <th className="text-right px-3 py-3">Profit / Journal</th>
                  <th className="text-right px-3 py-3">Silver / Fame</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.profession}-${r.tier}`} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2.5 text-zinc-600 font-semibold">{i + 1}</td>
                    <td className="px-3 py-2.5"><ItemIcon itemId={`T${r.tier}_JOURNAL_${PROFESSIONS.find(p => p.name === r.profession)?.id}_EMPTY`} size={28} /></td>
                    <td className="px-3 py-2.5 text-zinc-200 font-medium">{r.profession}</td>
                    <td className="px-3 py-2.5 text-center text-gold font-bold">T{r.tier}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{formatSilver(r.emptyPrice)}</td>
                    <td className="px-3 py-2.5 text-green-400 text-[10px]">{r.emptyCity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{formatSilver(r.fullPrice)}</td>
                    <td className="px-3 py-2.5 text-red-400 text-[10px]">{r.fullCity}</td>
                    <td className="px-3 py-2.5 text-right text-cyan-400 tabular-nums">{r.fameCapacity.toLocaleString()}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${r.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.profit > 0 ? '+' : ''}{formatSilver(r.profit)}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${r.silverPerFame > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.silverPerFame.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">How it works</div>
        <div className="text-xs text-zinc-400 space-y-1">
          <div>• <strong className="text-emerald-400">Silver/Fame</strong> — how much extra silver you earn per fame point by filling journals</div>
          <div>• Craft items → fame goes into equipped journal → when full, sell it for more than you paid for empty</div>
          <div>• Best for: high-volume crafters who generate lots of fame anyway</div>
          <div>• <strong className="text-amber-400">Tip</strong>: Use journals 1 tier BELOW your craft tier (T5 journal for T6 craft) — better fame/silver ratio usually</div>
        </div>
      </div>

      {!loading && !scannedAt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">📖</div>
          <h2 className="text-lg text-zinc-300 mb-2">Journals Calculator</h2>
          <p className="text-sm text-zinc-500">Scan to find the most profitable journal to fill for your crafting fame.</p>
        </div>
      )}
    </div>
  );
}
