/**
 * Resource transmutation recipes.
 *
 * Each entry describes "to" tier+enchant achievable from a single "from"
 * level at a fixed silver cost per unit. Targets with two viable sources
 * have two entries — the user picks which one based on the price they can
 * source the input resource at.
 *
 * The cost values are the in-game silver-per-unit costs as of 2026-05-14
 * (user-provided). They apply to all raw resource families (wood, ore,
 * fiber, hide, stone) — Albion's transmute cost only depends on the
 * tier/enchant jump, not the resource family.
 */

export type ResourceType = 'wood' | 'ore' | 'fiber' | 'hide' | 'stone';

export interface ResourceInfo {
  id: ResourceType;
  label: string;
  /** Albion item-id family used for icons (T6_<family>_LEVEL1@1 etc.) */
  iconFamily: string;
  /** Brief player-facing description shown in the picker. */
  hint: string;
}

export const RESOURCES: ResourceInfo[] = [
  { id: 'wood',  label: 'Wood / Logs', iconFamily: 'WOOD',  hint: 'Birch → Bloodoak → Whitewood' },
  { id: 'ore',   label: 'Ore',         iconFamily: 'ORE',   hint: 'Copper → Runite → Meteorite' },
  { id: 'fiber', label: 'Fiber',       iconFamily: 'FIBER', hint: 'Cotton → Sunflax → Ghost Hemp' },
  { id: 'hide',  label: 'Hide',        iconFamily: 'HIDE',  hint: 'Light → Robust → Resilient' },
  { id: 'stone', label: 'Stone',       iconFamily: 'ROCK',  hint: 'Limestone → Granite → Adamantine' },
];

/** Helper to build the Albion icon ID for the resource at a given tier+enchant. */
export function resourceItemId(resource: ResourceType, level: string): string {
  const info = RESOURCES.find(r => r.id === resource);
  if (!info) return `T4_${level.split('.')[0]}_WOOD@0`;
  const [tier, enchant] = level.split('.');
  return `T${tier}_${info.iconFamily}_LEVEL${enchant}@${enchant}`;
}

export interface Recipe {
  /** Target level — e.g. "5.3" */
  to: string;
  /** Source level — e.g. "5.2" (enchant-up) or "4.3" (tier-up) */
  from: string;
  /** Silver per output unit to transmute. */
  cost: number;
}

// Recipes provided by the user 2026-05-14 — single-step transmutes only.
// To support multi-step (e.g. 4.3 → 5.4), the user enters a manual cost
// at the input panel. The recipe table is the auto-fill.
export const RECIPES: Recipe[] = [
  // === Tier 4 enchant chain ===
  { to: '4.1', from: '4.0', cost: 1747 },
  { to: '4.2', from: '4.1', cost: 3499 },
  { to: '4.3', from: '4.2', cost: 7003 },
  { to: '4.4', from: '4.3', cost: 27882 },

  // === Tier 5 ===
  { to: '5.0', from: '4.0', cost: 909 },
  { to: '5.1', from: '4.1', cost: 1819 },
  { to: '5.1', from: '5.0', cost: 2324 },
  { to: '5.2', from: '4.2', cost: 3636 },
  { to: '5.2', from: '5.1', cost: 4648 },
  { to: '5.3', from: '4.3', cost: 7273 },
  { to: '5.3', from: '5.2', cost: 9296 },
  { to: '5.4', from: '4.4', cost: 28995 },
  { to: '5.4', from: '5.3', cost: 37087 },

  // === Tier 6 ===
  { to: '6.0', from: '5.0', cost: 1454 },
  { to: '6.1', from: '5.1', cost: 2908 },
  { to: '6.1', from: '6.0', cost: 3486 },
  { to: '6.2', from: '5.2', cost: 5816 },
  { to: '6.2', from: '6.1', cost: 6972 },
  { to: '6.3', from: '5.3', cost: 19145 },
  { to: '6.3', from: '6.2', cost: 22960 },
  { to: '6.4', from: '5.4', cost: 76439 },
  { to: '6.4', from: '6.3', cost: 91698 },

  // === Tier 7 ===
  { to: '7.0', from: '6.0', cost: 2904 },
  { to: '7.1', from: '6.1', cost: 5809 },
  { to: '7.1', from: '7.0', cost: 5577 },
  { to: '7.2', from: '6.2', cost: 18264 },
  { to: '7.2', from: '7.1', cost: 17536 },
  { to: '7.3', from: '6.3', cost: 60197 },
  { to: '7.3', from: '7.2', cost: 57794 },
  { to: '7.4', from: '6.4', cost: 241000 },
  { to: '7.4', from: '7.3', cost: 231000 },

  // === Tier 8 ===
  { to: '8.0', from: '7.0', cost: 5809 },
  { to: '8.1', from: '7.1', cost: 17397 },
  { to: '8.1', from: '8.0', cost: 16703 },
  { to: '8.2', from: '7.2', cost: 54735 },
  { to: '8.2', from: '8.1', cost: 52550 },
  { to: '8.3', from: '7.3', cost: 180000 },
  { to: '8.3', from: '8.2', cost: 173000 },
  { to: '8.4', from: '7.4', cost: 902000 },
  { to: '8.4', from: '8.3', cost: 866000 },
];

/** Returns all valid `from` sources for the given target, with their costs. */
export function getRecipesFor(to: string): Recipe[] {
  return RECIPES.filter(r => r.to === to);
}

/** Look up exact recipe cost; returns null if the pair isn't a direct transmute. */
export function getRecipeCost(from: string, to: string): number | null {
  const r = RECIPES.find(rec => rec.from === from && rec.to === to);
  return r ? r.cost : null;
}

/** All target levels in tier+enchant order — used to populate the To selector. */
export const ALL_TARGETS: string[] = [...new Set(RECIPES.map(r => r.to))].sort();

/** All possible levels (sources + targets) for the From selector. */
export const ALL_LEVELS: string[] = [
  '4.0', '4.1', '4.2', '4.3', '4.4',
  '5.0', '5.1', '5.2', '5.3', '5.4',
  '6.0', '6.1', '6.2', '6.3', '6.4',
  '7.0', '7.1', '7.2', '7.3', '7.4',
  '8.0', '8.1', '8.2', '8.3', '8.4',
];

/** Numeric comparator for level strings (e.g. "5.3" < "5.4" < "6.0"). */
export function compareLevels(a: string, b: string): number {
  const [ta, ea] = a.split('.').map(Number);
  const [tb, eb] = b.split('.').map(Number);
  if (ta !== tb) return ta - tb;
  return ea - eb;
}
