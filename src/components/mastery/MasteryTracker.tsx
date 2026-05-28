/**
 * Mastery / Spec Tracker.
 *
 * Lets the player record their refining specialization level (0-100)
 * for each resource × tier. Stored via the shared specs.ts helpers in
 * localStorage, so the Refining Calculator reads the same values when
 * it computes focus cost. Spec does NOT change return rate — it only
 * reduces the focus needed per craft.
 */

import { useState } from 'react';
import { RESOURCE_TYPES } from '../../data/refining';
import { getRefineSpec, setRefineSpec } from '../../data/specs';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconFurnace } from '../shell/navIcons';

const TIERS = [4, 5, 6, 7, 8];

export default function MasteryTracker() {
  usePageMeta({
    title: 'Mastery & Spec Tracker',
    description: 'Track your Albion Online refining specialization levels per resource and tier. Stored locally and read by the Refining Calculator to compute accurate focus cost. Spec reduces focus per craft, not return rate.',
  });

  // Seed local state from the shared spec store. Keyed "resource:tier".
  const [specs, setSpecs] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const rt of RESOURCE_TYPES) {
      for (const tier of TIERS) {
        init[`${rt.id}:${tier}`] = getRefineSpec(rt.id, tier);
      }
    }
    return init;
  });

  const update = (resourceId: string, tier: number, raw: string) => {
    let v = parseInt(raw) || 0;
    v = Math.max(0, Math.min(100, v));
    setRefineSpec(resourceId, tier, v);
    setSpecs(prev => ({ ...prev, [`${resourceId}:${tier}`]: v }));
  };

  // Quick stat: count of maxed (100) specs + average across all filled.
  const allValues = Object.values(specs);
  const maxedCount = allValues.filter(v => v >= 100).length;
  const filledValues = allValues.filter(v => v > 0);
  const avgSpec = filledValues.length > 0
    ? Math.round(filledValues.reduce((a, b) => a + b, 0) / filledValues.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Personal · Local-only"
        title="Mastery & Spec Tracker"
        description="Record your refining specialization for each resource and tier. The Refining Calculator reads these to compute your real focus cost per craft. Specialization lowers focus cost — it does not change return rate. Data stays in this browser."
        icon={IconFurnace}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="stat-card">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Maxed (100)</div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{maxedCount}</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Avg filled spec</div>
          <div className="text-2xl font-black text-gold-light mt-1">{avgSpec}</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Tracked</div>
          <div className="text-2xl font-black text-zinc-300 mt-1">{filledValues.length}/{allValues.length}</div>
        </div>
      </div>

      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">Refining specialization (0-100)</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Read these off the in-game Destiny Board. T2/T3 omitted — focus on T4+.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Resource</th>
                {TIERS.map(t => (
                  <th key={t} className="text-center px-2 py-2 font-bold">T{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCE_TYPES.map(rt => (
                <tr key={rt.id} className="border-t border-zinc-800">
                  <td className="px-4 py-2 font-medium text-zinc-200 whitespace-nowrap">{rt.name}</td>
                  {TIERS.map(tier => {
                    const key = `${rt.id}:${tier}`;
                    const val = specs[key] ?? 0;
                    return (
                      <td key={tier} className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={val || ''}
                          placeholder="0"
                          onChange={e => update(rt.id, tier, e.target.value)}
                          className={`w-16 bg-zinc-800 border rounded px-2 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-gold/40 ${
                            val >= 100 ? 'border-emerald-500/50 text-emerald-300' : 'border-zinc-700 text-zinc-200'
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ToolExplainer title="How specialization works">
        <p>
          In Albion Online, specialization is the bottom layer of the
          Destiny Board — the specific levels under each refining or
          crafting node (e.g. "Expert Wood Refiner" → specific tier
          specs). Each spec level you earn does one thing for your
          economy: it <strong>lowers the focus cost</strong> of crafting
          or refining that exact item/tier.
        </p>
        <p>
          Crucially, <strong>specialization does not raise your return
          rate</strong>. Return rate comes only from base LPB, the city
          specialization bonus, and whether you spend focus (see the
          Return Rate reference). What spec buys you is the ability to do
          far more focus crafts from the same daily focus pool — at spec
          100, a craft can cost a fraction of the focus it does at spec 0.
        </p>
        <p>
          That's why this tracker feeds the Refining Calculator: when you
          enable focus, the calculator uses your spec level for that
          resource and tier to compute how many crafts your focus budget
          actually covers, and splits the run into focus and no-focus
          segments accordingly. Keep these numbers current with your
          in-game Destiny Board and the focus efficiency figures on the
          site will match reality.
        </p>
        <p>
          Tip: the highest-value specs to push are the tiers you refine
          most. If you live in Fort Sterling refining T6-T8 wood, maxing
          those three specs stretches your daily 30k focus across many more
          planks than spreading points thin across every tier.
        </p>
      </ToolExplainer>
    </div>
  );
}
