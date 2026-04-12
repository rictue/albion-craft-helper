import { useState, useEffect } from 'react';
import { fetchPrices } from '../../services/api';
import { formatSilver } from '../../utils/formatters';
import ItemIcon from '../common/ItemIcon';
import type { ItemDefinition, Tier, Enchantment } from '../../types';

// Base crafting fame per craft (wiki approximation)
const FAME_PER_TIER: Record<number, number> = {
  2: 2.4, 3: 12, 4: 60, 5: 180, 6: 540, 7: 1620, 8: 4860,
};
const ENCHANT_MULT: Record<number, number> = { 0: 1, 1: 2, 2: 4, 3: 8, 4: 16 };
const JOURNAL_CAPACITY: Record<number, number> = {
  2: 1800, 3: 9000, 4: 45000, 5: 135000, 6: 405000, 7: 1215000, 8: 3645000,
};

// Subcategory → profession mapping
const WARRIOR = new Set(['sword', 'axe', 'mace', 'hammer', 'crossbow', 'knuckles', 'plate_helmet', 'plate_armor', 'plate_shoes']);
const HUNTER  = new Set(['bow', 'spear', 'quarterstaff', 'dagger', 'leather_helmet', 'leather_armor', 'leather_shoes']);
const MAGE    = new Set(['firestaff', 'holystaff', 'froststaff', 'naturestaff', 'arcanestaff', 'cursestaff', 'cloth_helmet', 'cloth_armor', 'cloth_shoes']);
const TOOLMAKER = new Set(['bag', 'cape', 'shieldtype', 'booktype', 'torchtype', 'tool']);

function getProfession(subcategory: string): { id: string; name: string } | null {
  if (WARRIOR.has(subcategory)) return { id: 'WARRIOR', name: 'Warrior' };
  if (HUNTER.has(subcategory))  return { id: 'HUNTER',  name: 'Hunter' };
  if (MAGE.has(subcategory))    return { id: 'MAGE',    name: 'Mage' };
  if (TOOLMAKER.has(subcategory)) return { id: 'TOOLMAKER', name: 'Toolmaker' };
  return null;
}

interface Props {
  selectedItem: ItemDefinition;
  tier: Tier;
  enchantment: Enchantment;
  quantity: number;
  hasPremium: boolean;
  /** Called whenever the computed journal net-gain changes so the parent can
   *  fold it into the combined profit figure. */
  onNetChange?: (net: number) => void;
}

export default function JournalBoostCard({ selectedItem, tier, enchantment, quantity, hasPremium, onNetChange }: Props) {
  const [emptyPrice, setEmptyPrice] = useState<number | null>(null);
  const [fullPrice, setFullPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const profession = getProfession(selectedItem.subcategory);

  useEffect(() => {
    if (!profession) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const emptyId = `T${tier}_JOURNAL_${profession.id}_EMPTY`;
      const fullId  = `T${tier}_JOURNAL_${profession.id}_FULL`;
      const prices = await fetchPrices([emptyId, fullId]);
      if (cancelled) return;
      let e = Infinity, f = 0;
      for (const p of prices) {
        if (p.sell_price_min <= 0 || p.city === 'Black Market') continue;
        if (p.item_id === emptyId && p.sell_price_min < e) e = p.sell_price_min;
        if (p.item_id === fullId && p.sell_price_min > f) f = p.sell_price_min;
      }
      setEmptyPrice(e === Infinity ? 0 : e);
      setFullPrice(f);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profession, tier]);

  if (!profession) return null;

  const baseFame = FAME_PER_TIER[tier] ?? 0;
  const famePerCraft = baseFame * ENCHANT_MULT[enchantment] * (hasPremium ? 1.5 : 1);
  const totalFame = famePerCraft * quantity;
  const capacity = JOURNAL_CAPACITY[tier] ?? 0;
  const journalsNeeded = capacity > 0 ? Math.ceil(totalFame / capacity) : 0;
  const journalsFullyFilled = capacity > 0 ? Math.floor(totalFame / capacity) : 0;
  const partialFameLeft = capacity > 0 ? totalFame - journalsFullyFilled * capacity : 0;
  const fillPercent = capacity > 0 && journalsNeeded > 0
    ? Math.min(100, (totalFame / (journalsNeeded * capacity)) * 100)
    : 0;

  const buyCost = (emptyPrice || 0) * journalsNeeded;
  const fullSellTotal = (fullPrice || 0) * journalsFullyFilled;
  const netGain = fullSellTotal - buyCost;

  // Bubble the net gain up to the parent so ProfitSummary can show a combined
  // (craft + journal) total profit figure.
  useEffect(() => {
    onNetChange?.(netGain);
  }, [netGain, onNetChange]);

  const emptyId = `T${tier}_JOURNAL_${profession.id}_EMPTY`;
  const fullId  = `T${tier}_JOURNAL_${profession.id}_FULL`;

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-lighter flex items-center justify-between">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Journal Boost</h3>
          <div className="text-[10px] text-zinc-600">Fill {profession.name} T{tier} journals with your crafting fame</div>
        </div>
        {loading && <span className="text-[10px] text-zinc-600">Loading prices...</span>}
      </div>

      <div className="p-4 space-y-3">
        {/* Fame earned */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5">
            <div className="text-[9px] uppercase text-zinc-600">Fame / craft</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">{Math.round(famePerCraft).toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5">
            <div className="text-[9px] uppercase text-zinc-600">Total fame ({quantity}×)</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">{Math.round(totalFame).toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5">
            <div className="text-[9px] uppercase text-zinc-600">Journal capacity</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">{capacity.toLocaleString()}</div>
          </div>
        </div>

        {/* Fill progress */}
        {capacity > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
              <span>
                <strong className="text-zinc-300">{journalsFullyFilled}</strong> fully filled
                {partialFameLeft > 0 && (
                  <span className="text-zinc-600"> · +{Math.round(partialFameLeft).toLocaleString()} leftover ({((partialFameLeft / capacity) * 100).toFixed(0)}%)</span>
                )}
              </span>
              <span>Buy <strong className="text-emerald-400">{journalsNeeded}</strong> empty</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${fillPercent}%` }} />
            </div>
          </div>
        )}

        {/* Price breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <ItemIcon itemId={emptyId} size={22} />
              <div className="text-[10px] uppercase text-zinc-600">Empty x{journalsNeeded}</div>
            </div>
            <div className="text-xs text-zinc-400">
              {emptyPrice ? formatSilver(emptyPrice) : '—'} each
            </div>
            <div className="text-sm font-bold text-red-400 tabular-nums">-{formatSilver(buyCost)}</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <ItemIcon itemId={fullId} size={22} />
              <div className="text-[10px] uppercase text-zinc-600">Full x{journalsFullyFilled}</div>
            </div>
            <div className="text-xs text-zinc-400">
              {fullPrice ? formatSilver(fullPrice) : '—'} each
            </div>
            <div className="text-sm font-bold text-green-400 tabular-nums">+{formatSilver(fullSellTotal)}</div>
          </div>
        </div>

        {/* Net gain */}
        <div className={`rounded-lg border px-4 py-2.5 flex items-center justify-between ${netGain > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-zinc-900/60 border-zinc-800'}`}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Net extra silver from journals</div>
            <div className="text-[10px] text-zinc-600">Fills that can actually be sold (partials stay with you)</div>
          </div>
          <div className={`text-lg font-bold tabular-nums ${netGain > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
            {netGain > 0 ? '+' : ''}{formatSilver(netGain)}
          </div>
        </div>
      </div>
    </div>
  );
}
