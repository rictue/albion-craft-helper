import { useState } from 'react';
import { formatSilver } from '../../utils/formatters';

// Crafting fame per item at each tier (base T2=2.4 → T8=4860 approximation from wiki)
// These are the fame values you get per item crafted
const FAME_PER_TIER: Record<number, number> = {
  2: 2.4,
  3: 12,
  4: 60,
  5: 180,
  6: 540,
  7: 1620,
  8: 4860,
};

// Enchant multiplier for fame (from wiki)
const ENCHANT_MULT: Record<number, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
  4: 16,
};

// Premium account adds +50% crafting fame
const PREMIUM_MULT = 1.5;

interface Row {
  tier: number;
  enchant: number;
  baseFame: number;
  totalFame: number;
  craftsFor100k: number;
}

export default function CraftingFame() {
  const [premium, setPremium] = useState(true);
  const [enchant, setEnchant] = useState(0);

  const rows: Row[] = [2, 3, 4, 5, 6, 7, 8].map(tier => {
    const baseFame = FAME_PER_TIER[tier];
    const totalFame = baseFame * ENCHANT_MULT[enchant] * (premium ? PREMIUM_MULT : 1);
    const craftsFor100k = Math.ceil(100000 / totalFame);
    return { tier, enchant, baseFame, totalFame, craftsFor100k };
  });

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent rounded-xl border border-amber-500/20 px-4 py-3">
        <div className="text-zinc-200 font-semibold text-sm mb-0.5">Crafting Fame Calculator</div>
        <div className="text-xs text-zinc-400">Shows how much fame you earn per craft at each tier, and how many crafts you need to hit 100K fame. Enchant multiplies fame significantly.</div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="accent-amber-500" />
          <span className="text-sm text-zinc-200">Premium <span className="text-[10px] text-zinc-500">(+50% fame)</span></span>
        </label>
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase text-zinc-500 mr-1">Enchant</span>
          {[0, 1, 2, 3, 4].map(e => (
            <button key={e} onClick={() => setEnchant(e)}
              className={`w-9 h-8 rounded text-xs font-bold ${enchant === e ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>
              {e}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500 ml-auto">Enchant multiplier: <strong className="text-amber-400">×{ENCHANT_MULT[enchant]}</strong></span>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-right px-4 py-3">Base Fame</th>
              <th className="text-right px-4 py-3">With Bonuses</th>
              <th className="text-right px-4 py-3">Crafts for 100K</th>
              <th className="text-right px-4 py-3">Crafts for 1M</th>
              <th className="text-right px-4 py-3">Crafts for Journal Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              // Full journal fame capacities (approx from wiki)
              const journalMax: Record<number, number> = { 2: 1800, 3: 9000, 4: 45000, 5: 135000, 6: 405000, 7: 1215000, 8: 3645000 };
              const journalCrafts = Math.ceil(journalMax[r.tier] / r.totalFame);
              return (
                <tr key={r.tier} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-gold">T{r.tier}{enchant > 0 && `.${enchant}`}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500 tabular-nums">{r.baseFame.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-amber-400 tabular-nums font-bold">{Math.round(r.totalFame).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">{r.craftsFor100k.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">{Math.ceil(1000000 / r.totalFame).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-cyan-400 tabular-nums">{journalCrafts.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="text-xs text-zinc-400 space-y-1">
          <div><strong className="text-amber-400">Formula:</strong> Fame = base × enchant multiplier × (1.5 if premium)</div>
          <div><strong className="text-amber-400">Enchant:</strong> E0 ×1, E1 ×2, E2 ×4, E3 ×8, E4 ×16 fame per craft</div>
          <div><strong className="text-amber-400">Tip:</strong> Crafting E1-E2 items is usually the best fame/silver ratio because enchant material is relatively cheap at lower enchant levels.</div>
          <div><strong className="text-amber-400">Note:</strong> Fame values are base item fame. Complex items (2H weapons, armor) may award slightly more {formatSilver(0).replace('0', '').trim() ? '' : ''}— use as reference.</div>
        </div>
      </div>
    </div>
  );
}
