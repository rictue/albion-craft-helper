/**
 * Local Production Bonus reference — which royal city specializes in
 * which weapons, armor pieces, off-hands, and refined resources.
 *
 * Data sources are the same files the calculators use, so this table can
 * never drift from the live math:
 *   - crafting specializations: src/data/cities.ts
 *   - refining bonus:           src/data/refining.ts (CITY_REFINE_BONUS)
 */

import { CITIES } from '../../data/cities';
import { CITY_REFINE_BONUS } from '../../data/refining';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconCrown } from '../shell/navIcons';

// Human-readable labels for the subcategory ids stored on cities.
const SUBCAT_LABELS: Record<string, string> = {
  sword: 'Swords', axe: 'Axes', mace: 'Maces', hammer: 'Hammers', spear: 'Spears',
  dagger: 'Daggers', quarterstaff: 'Quarterstaffs', bow: 'Bows', crossbow: 'Crossbows',
  firestaff: 'Fire Staffs', froststaff: 'Frost Staffs', holystaff: 'Holy Staffs',
  arcanestaff: 'Arcane Staffs', cursestaff: 'Cursed Staffs', naturestaff: 'Nature Staffs',
  shieldtype: 'Shields', booktype: 'Tomes', torchtype: 'Torches',
  plate_helmet: 'Plate Helmets', plate_armor: 'Plate Armor', plate_shoes: 'Plate Boots',
  leather_helmet: 'Leather Hoods', leather_armor: 'Leather Jackets', leather_shoes: 'Leather Shoes',
  cloth_helmet: 'Cloth Cowls', cloth_armor: 'Cloth Robes', cloth_shoes: 'Cloth Sandals',
  bags: 'Bags', cape: 'Capes',
};

const REFINE_LABELS: Record<string, string> = {
  wood: 'Wood → Planks',
  ore: 'Ore → Metal Bars',
  hide: 'Hide → Leather',
  fiber: 'Fiber → Cloth',
  rock: 'Stone → Stone Block',
};

export default function CityBonuses() {
  usePageMeta({
    title: 'City Bonus Reference',
    description: 'Albion Online local production bonus reference — which royal city gives a crafting or refining bonus for each weapon, armor piece, off-hand and refined resource. Craft and refine where the bonus is to maximize return rate.',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference · Production"
        title="City Bonus Reference"
        description="Crafting and refining in a city that specializes in your item type grants a Local Production Bonus — a flat boost to return rate. Pick the right city and you reclaim far more materials per craft. Caerleon and Brecilien have no production bonus."
        icon={IconCrown}
      />

      {/* Refining bonus */}
      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">Refining Bonus — one resource per city</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Each royal city boosts exactly one refined resource line.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-bold">City</th>
                <th className="text-left px-4 py-2 font-bold">Refining specialization</th>
              </tr>
            </thead>
            <tbody>
              {CITIES.filter(c => c.id !== 'Black Market').map(city => {
                const refineKeys = Object.entries(CITY_REFINE_BONUS)
                  .filter(([cityName]) => cityName === city.id)
                  .flatMap(([, resources]) => resources);
                return (
                  <tr key={city.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2 font-medium text-zinc-200">{city.name}</td>
                    <td className="px-4 py-2 text-zinc-300">
                      {refineKeys.length > 0
                        ? refineKeys.map(k => REFINE_LABELS[k] ?? k).join(', ')
                        : <span className="text-zinc-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Crafting bonus */}
      <section className="medieval-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">Crafting Bonus — weapons, armor, off-hands</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Royal cities split weapon and armor specializations between them.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-bold">City</th>
                <th className="text-left px-4 py-2 font-bold">Crafting specializations</th>
              </tr>
            </thead>
            <tbody>
              {CITIES.filter(c => c.specializations.length > 0).map(city => (
                <tr key={city.id} className="border-t border-zinc-800">
                  <td className="px-4 py-2 font-medium text-zinc-200 whitespace-nowrap align-top">{city.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {city.specializations.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300">
                          {SUBCAT_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ToolExplainer title="How city bonuses work">
        <p>
          Every royal city in Albion Online has a set of Local Production
          Bonuses. When you craft or refine an item that the city
          specializes in, you get a flat boost to your return rate — the
          chance to get materials back after a craft. Over thousands of
          crafts that boost compounds into a large material saving.
        </p>
        <p>
          <strong>Refining</strong> is the simplest: each of the five royal
          cities boosts exactly one resource line. Refine wood in Fort
          Sterling, ore in Thetford, hide in Martlock, fiber in Lymhurst,
          and stone in Bridgewatch. Refining anywhere else means a lower
          return rate and more wasted raw materials.
        </p>
        <p>
          <strong>Crafting</strong> is split more granularly. Weapons,
          armor pieces and off-hands each have a "home" city — and the
          armor pieces of one material are deliberately scattered across
          different cities, so there's no single "plate city". Use the
          table above to find where your item is boosted, then set that
          city in the Crafting Calculator to see the higher return rate
          reflected in your profit.
        </p>
        <p>
          Caerleon and Brecilien grant no production bonus, but they sit at
          the center of the map (Caerleon) or in the Mists (Brecilien) and
          often have better market access. The tradeoff is yours: bonus
          return rate in a royal city, or convenience and liquidity
          elsewhere.
        </p>
      </ToolExplainer>
    </div>
  );
}
