// User's crafting & refining specializations
// Spec level adds +0.3 LPB per level to return rate
// Mastery + Spec reduce focus cost

export interface SpecEntry {
  category: string;
  masteryLevel: number;
  specs: {
    itemMatch: string;
    level: number;
    label: string;
  }[];
}

export interface RefineSpec {
  resource: string;
  tiers: Record<number, number>; // tier -> spec level
}

// Default specs (Rictue's)
export const DEFAULT_CRAFT_SPECS: SpecEntry[] = [
  {
    category: 'plate_shoes',
    masteryLevel: 76,
    specs: [
      { itemMatch: 'SHOES_PLATE_SET1', level: 52, label: 'Soldier Boots' },
    ],
  },
  {
    category: 'plate_armor',
    masteryLevel: 60,
    specs: [
      { itemMatch: 'ARMOR_PLATE_SET1', level: 40, label: 'Soldier Armor' },
    ],
  },
  {
    category: 'axe',
    masteryLevel: 82,
    specs: [
      { itemMatch: 'MAIN_AXE', level: 16, label: 'Battleaxe' },
      { itemMatch: '2H_SCYTHE_HELL', level: 55, label: 'Infernal Scythe' },
      { itemMatch: '2H_DUALAXE_KEEPER', level: 19, label: 'Bear Paws' },
    ],
  },
  {
    category: 'knuckles',
    masteryLevel: 43,
    specs: [
      { itemMatch: '2H_KNUCKLES', level: 27, label: 'Battle Bracers' },
    ],
  },
  {
    category: 'bow',
    masteryLevel: 91,
    specs: [
      { itemMatch: '2H_LONGBOW', level: 71, label: 'Longbow' },
    ],
  },
  {
    category: 'spear',
    masteryLevel: 49,
    specs: [
      { itemMatch: '2H_GLAIVE', level: 34, label: 'Rift Glaive' },
    ],
  },
  {
    category: 'firestaff',
    masteryLevel: 71,
    specs: [
      { itemMatch: '2H_FIRESTAFF_AVALON', level: 45, label: 'Brimstone Staff' },
      { itemMatch: '2H_INFERNOSTAFF_MORGANA', level: 15, label: 'Blazing Staff' },
      { itemMatch: 'MAIN_FIRESTAFF_KEEPER', level: 10, label: 'Dawnsong' },
    ],
  },
];

export const DEFAULT_REFINE_SPECS: RefineSpec[] = [
  {
    resource: 'PLANKS',
    tiers: { 4: 77, 5: 18, 6: 100, 7: 46, 8: 33 },
  },
];

// Get spec bonus for a crafted item
export function getSpecBonus(
  specs: SpecEntry[],
  subcategory: string,
  baseId: string,
): { masteryLevel: number; specLevel: number; bonusLPB: number; focusReduction: number } {
  const entry = specs.find(s => s.category === subcategory);
  if (!entry) return { masteryLevel: 0, specLevel: 0, bonusLPB: 0, focusReduction: 0 };

  const spec = entry.specs.find(s => baseId.includes(s.itemMatch));
  const specLevel = spec?.level || 0;

  const bonusLPB = specLevel * 0.3;
  const focusReduction = (entry.masteryLevel * 0.5 + specLevel * 0.5) / 100;

  return { masteryLevel: entry.masteryLevel, specLevel, bonusLPB, focusReduction };
}

// Get refine spec for a resource tier
export function getRefineSpec(
  refineSpecs: RefineSpec[],
  resource: string,
  tier: number,
): number {
  const entry = refineSpecs.find(s => s.resource === resource);
  return entry?.tiers[tier] || 0;
}
