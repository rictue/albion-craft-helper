/**
 * Resource reference — the five refined resource lines, their home
 * refining city, raw-per-craft counts by tier, and where the raw is
 * typically cheapest. All data is read from refining.ts so it stays in
 * sync with the Refining Calculator.
 */

import { RESOURCE_TYPES, CITY_REFINE_BONUS, RESOURCE_CHEAP_CITIES } from '../../data/refining';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconFurnace } from '../shell/navIcons';

// Raw materials consumed per refine at each tier (RAW_PER_TIER in
// refining.ts — re-declared here so the reference renders without
// exporting the private const).
const RAW_PER_TIER: Record<number, number> = { 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5 };
const TIERS = [2, 3, 4, 5, 6, 7, 8];

// Royal-city biome each resource's home city sits in. The refining
// specialization city = the city in that resource's home biome, so this
// pairing is derived from CITY_REFINE_BONUS, not invented.
const CITY_BIOME: Record<string, string> = {
  'Fort Sterling': 'Highlands (snow)',
  'Lymhurst': 'Forest',
  'Bridgewatch': 'Mountains (desert)',
  'Martlock': 'Steppe',
  'Thetford': 'Swamp',
};

// resource id → which raw-prefix key RESOURCE_CHEAP_CITIES uses
const CHEAP_KEY: Record<string, string> = {
  wood: 'WOOD', ore: 'ORE', hide: 'HIDE', fiber: 'FIBER', rock: 'ROCK',
};

export default function ResourcesBiomes() {
  usePageMeta({
    title: 'Resource & Biome Reference',
    description: 'Albion Online resource reference: the five refined lines (planks, metal bars, leather, cloth, stone block), their tier names, home refining city + biome, raw-per-craft counts, and where each raw resource is cheapest.',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference · Resources"
        title="Resources & Biomes"
        description="Albion has five gatherable resource lines, each refined into a different material. Every line has a home royal city (and biome) where it gathers most densely and refines with a bonus. This page maps each resource to its tier names, home city, raw-per-craft, and cheapest sources."
        icon={IconFurnace}
      />

      {/* Resource summary table */}
      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">The five resource lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Resource → Refined</th>
                <th className="text-left px-4 py-2 font-bold">Home city (biome)</th>
                <th className="text-left px-4 py-2 font-bold">Cheapest raw cities</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCE_TYPES.map(rt => {
                const homeCity = Object.entries(CITY_REFINE_BONUS)
                  .find(([, resources]) => resources.includes(rt.id))?.[0] ?? '—';
                const cheapCities = RESOURCE_CHEAP_CITIES[CHEAP_KEY[rt.id]] ?? [];
                return (
                  <tr key={rt.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2 font-medium text-zinc-200">{rt.name}</td>
                    <td className="px-4 py-2 text-zinc-300">
                      {homeCity}
                      {CITY_BIOME[homeCity] && <span className="text-zinc-600"> · {CITY_BIOME[homeCity]}</span>}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{cheapCities.join(', ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tier names per resource */}
      {RESOURCE_TYPES.map(rt => (
        <section key={rt.id} className="medieval-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">{rt.name}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-2 font-bold">Tier</th>
                  <th className="text-left px-4 py-2 font-bold">Raw</th>
                  <th className="text-left px-4 py-2 font-bold">Refined</th>
                  <th className="text-right px-4 py-2 font-bold">Raw / craft</th>
                  <th className="text-left px-4 py-2 font-bold">Prev tier needed</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map(tier => {
                  const recipe = rt.recipes.find(r => r.tier === tier && r.enchant === 0);
                  if (!recipe) return null;
                  return (
                    <tr key={tier} className="border-t border-zinc-800">
                      <td className="px-4 py-2 font-bold text-gold-light">T{tier}</td>
                      <td className="px-4 py-2 text-zinc-300">{recipe.rawName}</td>
                      <td className="px-4 py-2 text-zinc-300">{recipe.refinedName}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{RAW_PER_TIER[tier]}</td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">
                        {recipe.prevPerCraft > 0 ? `${recipe.prevPerCraft}× T${tier - 1} refined` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <ToolExplainer title="How resources and refining work">
        <p>
          Albion Online has five gatherable resource lines: <strong>wood</strong> (refined
          into planks), <strong>ore</strong> (metal bars), <strong>hide</strong> (leather),
          <strong> fiber</strong> (cloth), and <strong>stone</strong> (stone block). Each line
          spans tiers 2 through 8, with a unique name per tier — Birch through
          Whitewood for wood, Copper through Adamantium for ore, and so on.
        </p>
        <p>
          Every resource has a <strong>home royal city</strong> sitting in the
          biome where that resource gathers most densely. That same city
          gives the refining bonus for the resource — Fort Sterling for wood,
          Thetford for ore, Martlock for hide, Lymhurst for fiber, and
          Bridgewatch for stone. Refining in the home city means a higher
          return rate (see the Return Rate reference), and the raw material
          is usually cheapest near its home biome too.
        </p>
        <p>
          The "raw per craft" column shows how many raw units each refine
          consumes — it climbs with tier, from 1 at T2 up to 5 at T7-T8.
          From T3 onward you also need the <strong>previous tier's refined
          material</strong> as a second input (the "prev tier needed"
          column). That's why high-tier refining chains the lower tiers: a
          T6 plank needs T5 planks, which need T4 planks, and so on. The
          Refining Calculator models this whole chain, including the
          materials you get back from return rate at each step.
        </p>
      </ToolExplainer>
    </div>
  );
}
