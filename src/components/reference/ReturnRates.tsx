/**
 * Return Rate (RR) reference table. Computes every combination of
 * base / city-bonus / focus directly from the same LPB constants the
 * calculators use, so the numbers are guaranteed consistent with the
 * live tools.
 *
 *   RR = LPB / (100 + LPB)
 */

import { BASE_LPB, REFINE_CITY_LPB, CRAFT_CITY_LPB, FOCUS_LPB } from '../../data/constants';
import { lpbToReturnRate } from '../../utils/returnRate';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconFurnace } from '../shell/navIcons';

interface Row {
  scenario: string;
  lpb: number;
  rr: number;
  note: string;
}

function pct(rr: number): string {
  return (rr * 100).toFixed(1) + '%';
}

export default function ReturnRates() {
  usePageMeta({
    title: 'Return Rate Reference',
    description: 'Albion Online return rate (RR) reference. RR = LPB / (100 + LPB). See exact return rates for refining and crafting with and without city specialization bonus and focus, plus how much your effective material cost drops.',
  });

  // Refining scenarios — city bonus is +40 LPB.
  const refiningRows: Row[] = [
    { scenario: 'Base (no city, no focus)', lpb: BASE_LPB, rr: lpbToReturnRate(BASE_LPB), note: 'Refining outside a specialization city' },
    { scenario: 'Spec city, no focus', lpb: BASE_LPB + REFINE_CITY_LPB, rr: lpbToReturnRate(BASE_LPB + REFINE_CITY_LPB), note: 'e.g. wood in Fort Sterling' },
    { scenario: 'Base + focus', lpb: BASE_LPB + FOCUS_LPB, rr: lpbToReturnRate(BASE_LPB + FOCUS_LPB), note: 'Focus but wrong city' },
    { scenario: 'Spec city + focus', lpb: BASE_LPB + REFINE_CITY_LPB + FOCUS_LPB, rr: lpbToReturnRate(BASE_LPB + REFINE_CITY_LPB + FOCUS_LPB), note: 'Optimal refining setup' },
  ];

  // Crafting scenarios — city bonus is +15 LPB.
  const craftingRows: Row[] = [
    { scenario: 'Base (no city, no focus)', lpb: BASE_LPB, rr: lpbToReturnRate(BASE_LPB), note: 'Crafting outside a specialization city' },
    { scenario: 'Spec city, no focus', lpb: BASE_LPB + CRAFT_CITY_LPB, rr: lpbToReturnRate(BASE_LPB + CRAFT_CITY_LPB), note: 'e.g. swords in Lymhurst' },
    { scenario: 'Base + focus', lpb: BASE_LPB + FOCUS_LPB, rr: lpbToReturnRate(BASE_LPB + FOCUS_LPB), note: 'Focus but wrong city' },
    { scenario: 'Spec city + focus', lpb: BASE_LPB + CRAFT_CITY_LPB + FOCUS_LPB, rr: lpbToReturnRate(BASE_LPB + CRAFT_CITY_LPB + FOCUS_LPB), note: 'Optimal crafting setup' },
  ];

  const renderTable = (rows: Row[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="text-left  px-4 py-2 font-bold">Scenario</th>
            <th className="text-right px-4 py-2 font-bold">LPB</th>
            <th className="text-right px-4 py-2 font-bold">Return rate</th>
            <th className="text-right px-4 py-2 font-bold">Effective material cost</th>
            <th className="text-left  px-4 py-2 font-bold">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.scenario} className="border-t border-zinc-800">
              <td className="px-4 py-2 font-medium text-zinc-200">{r.scenario}</td>
              <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{r.lpb}</td>
              <td className="px-4 py-2 text-right tabular-nums font-bold text-emerald-300">{pct(r.rr)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-zinc-300">{pct(1 - r.rr)} of raw</td>
              <td className="px-4 py-2 text-[11px] text-zinc-500">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference · Math"
        title="Return Rate Reference"
        description="Return rate is the share of materials you get back after a craft or refine. The formula is RR = LPB / (100 + LPB). Higher LPB — from city specialization and focus — means more materials reclaimed and a lower effective cost per item."
        icon={IconFurnace}
      />

      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">Refining</h2>
          <p className="text-xs text-zinc-500 mt-0.5">City specialization bonus for refining is +{REFINE_CITY_LPB} LPB.</p>
        </div>
        {renderTable(refiningRows)}
      </section>

      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">Crafting</h2>
          <p className="text-xs text-zinc-500 mt-0.5">City specialization bonus for crafting is +{CRAFT_CITY_LPB} LPB.</p>
        </div>
        {renderTable(craftingRows)}
      </section>

      <ToolExplainer title="Understanding return rate">
        <p>
          When you craft or refine in Albion Online, a percentage of the
          materials you put in come back to you. That percentage is the
          <strong> return rate</strong>, and it's driven by a hidden stat
          called LPB (Local Production Bonus points). The conversion is:
        </p>
        <p className="font-mono text-zinc-300 bg-black/30 rounded px-3 py-2">
          Return Rate = LPB / (100 + LPB)
        </p>
        <p>
          The base LPB for everyone is {BASE_LPB}, which is a {pct(lpbToReturnRate(BASE_LPB))} return
          rate. On top of that you add:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>+{REFINE_CITY_LPB} LPB</strong> when refining the city's specialized resource</li>
          <li><strong>+{CRAFT_CITY_LPB} LPB</strong> when crafting the city's specialized item type</li>
          <li><strong>+{FOCUS_LPB} LPB</strong> when you spend focus on the craft</li>
        </ul>
        <p>
          Notice the diminishing returns baked into the formula: going from
          0 to {REFINE_CITY_LPB} LPB is a big jump, but stacking focus on top
          of an already-high LPB adds less and less. That's why the single
          most important decision is <em>crafting in the right city</em> — the
          city bonus is "free" every craft, while focus is a limited daily
          pool you have to ration.
        </p>
        <p>
          The "effective material cost" column shows what fraction of your
          raw materials you actually consume per item after returns. At a
          {pct(lpbToReturnRate(BASE_LPB + REFINE_CITY_LPB + FOCUS_LPB))} return rate
          you only burn about {pct(1 - lpbToReturnRate(BASE_LPB + REFINE_CITY_LPB + FOCUS_LPB))} of
          your inputs — the rest cycles back into the next craft. This is
          exactly the reinvest loop the Refining Calculator simulates
          pass-by-pass.
        </p>
      </ToolExplainer>
    </div>
  );
}
