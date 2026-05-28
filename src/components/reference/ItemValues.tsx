/**
 * Item Value & Enchantment reference. Item value drives nutrition (the
 * station fee math) and a few other systems. Values mirror the constants
 * in profitCalculator.ts so the table stays authoritative.
 */

import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconBook } from '../shell/navIcons';

// Mirror of RESOURCE_ITEM_VALUE in profitCalculator.ts.
const ITEM_VALUE: Record<number, number> = { 2: 4, 3: 8, 4: 16, 5: 32, 6: 64, 7: 128, 8: 256 };
// Mirror of ENCHANT_IV_MULT.
const ENCHANT_MULT: Record<number, number> = { 0: 1, 1: 2, 2: 4, 3: 8, 4: 16 };

const TIERS = [2, 3, 4, 5, 6, 7, 8];
const ENCHANTS = [0, 1, 2, 3, 4];

export default function ItemValues() {
  usePageMeta({
    title: 'Item Value & Enchant Reference',
    description: 'Albion Online item value table by tier and enchantment. Item value doubles every tier (T2=4 up to T8=256) and the enchant multiplier doubles per level (.0=×1 to .4=×16). Used for station fee / nutrition calculations.',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference · Values"
        title="Item Value & Enchantment"
        description="Item value is the base number Albion uses for station nutrition (fee) math and several other systems. It doubles each tier and again with every enchant level. This table shows the resolved value for every tier × enchant combination."
        icon={IconBook}
      />

      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">Resolved item value (tier × enchant)</h2>
          <p className="text-xs text-zinc-500 mt-0.5">value = base tier value × enchant multiplier</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Tier</th>
                <th className="text-right px-3 py-2 font-bold">Base (.0)</th>
                {ENCHANTS.slice(1).map(e => (
                  <th key={e} className="text-right px-3 py-2 font-bold">.{e} (×{ENCHANT_MULT[e]})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIERS.map(t => (
                <tr key={t} className="border-t border-zinc-800">
                  <td className="px-4 py-2 font-bold text-gold-light">T{t}</td>
                  {ENCHANTS.map(e => (
                    <td key={e} className="px-3 py-2 text-right tabular-nums text-zinc-300">
                      {ITEM_VALUE[t] * ENCHANT_MULT[e]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="medieval-panel p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gold-light mb-2">Base value per tier</h3>
          <div className="space-y-1 text-sm">
            {TIERS.map(t => (
              <div key={t} className="flex justify-between tabular-nums">
                <span className="text-zinc-400">T{t}</span>
                <span className="text-zinc-200 font-medium">{ITEM_VALUE[t]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="medieval-panel p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gold-light mb-2">Enchant multiplier</h3>
          <div className="space-y-1 text-sm">
            {ENCHANTS.map(e => (
              <div key={e} className="flex justify-between tabular-nums">
                <span className="text-zinc-400">.{e}{e === 0 ? ' (base)' : ''}</span>
                <span className="text-zinc-200 font-medium">×{ENCHANT_MULT[e]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ToolExplainer title="What item value is used for">
        <p>
          Item value is a base number Albion assigns to each item, derived
          purely from its tier and enchantment. It <strong>doubles every
          tier</strong> — a T2 item is 4, T3 is 8, all the way up to T8 at
          256 — and it <strong>doubles again with every enchant level</strong>,
          so a .4 item is 16× its base.
        </p>
        <p>
          The main place this matters for an everyday crafter is the
          <strong> station usage fee</strong>. When you craft at a station,
          the fee is calculated from "nutrition", and nutrition is the sum
          of the item values of the resources consumed, scaled by the
          station owner's fee setting. Higher tier and higher enchant items
          carry exponentially more value, which is why station fees on T8
          refined materials dwarf the fees on T4 — and why the Refining
          Calculator's "station fee per craft" field needs a much bigger
          number at high tiers.
        </p>
        <p>
          Item value also feeds into the IP (item power) curve, kill fame
          rewards, and the silver you get from salvaging — but for the
          calculators on this site, the station-fee link is the one that
          changes your profit numbers, so it's worth understanding why a
          T8.4 craft can cost hundreds of silver in fees while a T4.0
          craft costs almost nothing.
        </p>
      </ToolExplainer>
    </div>
  );
}
