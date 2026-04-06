// Albion Online refining data with enchanted tiers
// Enchanted refining requires enchanted raw + previous tier enchanted refined

export interface RefineRecipe {
  rawId: string;
  refinedId: string;
  prevRefinedId: string;
  rawName: string;
  refinedName: string;
  tier: number;
  enchant: number;
  rawPerCraft: number;
  prevPerCraft: number;
  outputPerCraft: number;
}

export interface ResourceType {
  id: string;
  name: string;
  rawPrefix: string;
  refinedPrefix: string;
  recipes: RefineRecipe[];
}

// Raw resources needed per tier (from in-game data)
const RAW_PER_TIER: Record<number, number> = {
  2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5, 8: 5,
};

function generateRecipes(
  rawPrefix: string,
  refinedPrefix: string,
  tierNames: Record<number, { raw: string; refined: string }>,
): RefineRecipe[] {
  const recipes: RefineRecipe[] = [];
  const enchantNames = ['', 'Uncommon', 'Rare', 'Epic'];

  for (let tier = 2; tier <= 8; tier++) {
    const names = tierNames[tier];
    if (!names) continue;

    const rawCount = RAW_PER_TIER[tier];
    const prevRefined = tier > 2 ? `T${tier - 1}_${refinedPrefix}` : '';

    // Base (enchant 0)
    recipes.push({
      rawId: `T${tier}_${rawPrefix}`,
      refinedId: `T${tier}_${refinedPrefix}`,
      prevRefinedId: prevRefined,
      rawName: names.raw,
      refinedName: names.refined,
      tier, enchant: 0,
      rawPerCraft: rawCount, prevPerCraft: tier > 2 ? 1 : 0, outputPerCraft: 1,
    });

    // Enchanted (1-3) only for T4+
    // T4 enchanted uses T3 BASE planks (no T3 enchanted in recipes).
    // T5+ enchanted uses matching enchant prev: T5.2 needs T4.2, T6.1 needs T5.1, etc.
    if (tier >= 4) {
      for (let e = 1; e <= 3; e++) {
        const prevEnch = tier === 4
          ? prevRefined  // T4.X → T3 base
          : `T${tier - 1}_${refinedPrefix}_LEVEL${e}@${e}`; // T5+ → prev enchanted
        recipes.push({
          rawId: `T${tier}_${rawPrefix}_LEVEL${e}@${e}`,
          refinedId: `T${tier}_${refinedPrefix}_LEVEL${e}@${e}`,
          prevRefinedId: prevEnch,
          rawName: `${enchantNames[e]} ${names.raw}`,
          refinedName: `${enchantNames[e]} ${names.refined}`,
          tier, enchant: e,
          rawPerCraft: rawCount, prevPerCraft: 1, outputPerCraft: 1,
        });
      }
    }
  }

  return recipes;
}

const WOOD_NAMES: Record<number, { raw: string; refined: string }> = {
  2: { raw: 'Birch Log', refined: 'Birch Planks' },
  3: { raw: 'Chestnut Log', refined: 'Chestnut Planks' },
  4: { raw: 'Pine Log', refined: 'Pine Planks' },
  5: { raw: 'Cedar Log', refined: 'Cedar Planks' },
  6: { raw: 'Bloodoak Log', refined: 'Bloodoak Planks' },
  7: { raw: 'Ashenbark Log', refined: 'Ashenbark Planks' },
  8: { raw: 'Whitewood Log', refined: 'Whitewood Planks' },
};

const ORE_NAMES: Record<number, { raw: string; refined: string }> = {
  2: { raw: 'Copper Ore', refined: 'Copper Bar' },
  3: { raw: 'Tin Ore', refined: 'Bronze Bar' },
  4: { raw: 'Iron Ore', refined: 'Steel Bar' },
  5: { raw: 'Titanium Ore', refined: 'Titanium Bar' },
  6: { raw: 'Runite Ore', refined: 'Runite Bar' },
  7: { raw: 'Meteorite Ore', refined: 'Meteorite Bar' },
  8: { raw: 'Adamantium Ore', refined: 'Adamantium Bar' },
};

const HIDE_NAMES: Record<number, { raw: string; refined: string }> = {
  2: { raw: 'Rugged Hide', refined: 'Stiff Leather' },
  3: { raw: 'Thin Hide', refined: 'Thick Leather' },
  4: { raw: 'Medium Hide', refined: 'Worked Leather' },
  5: { raw: 'Heavy Hide', refined: 'Cured Leather' },
  6: { raw: 'Robust Hide', refined: 'Hardened Leather' },
  7: { raw: 'Thick Hide', refined: 'Reinforced Leather' },
  8: { raw: 'Resilient Hide', refined: 'Fortified Leather' },
};

const FIBER_NAMES: Record<number, { raw: string; refined: string }> = {
  2: { raw: 'Cotton', refined: 'Simple Cloth' },
  3: { raw: 'Flax', refined: 'Neat Cloth' },
  4: { raw: 'Hemp', refined: 'Fine Cloth' },
  5: { raw: 'Skyflower', refined: 'Ornate Cloth' },
  6: { raw: 'Redleaf Cotton', refined: 'Royal Cloth' },
  7: { raw: 'Sunflower', refined: 'Regal Cloth' },
  8: { raw: 'Ghost Cotton', refined: 'Imperial Cloth' },
};

const ROCK_NAMES: Record<number, { raw: string; refined: string }> = {
  2: { raw: 'Limestone', refined: 'Limestone Block' },
  3: { raw: 'Sandstone', refined: 'Sandstone Block' },
  4: { raw: 'Travertine', refined: 'Travertine Block' },
  5: { raw: 'Granite', refined: 'Granite Block' },
  6: { raw: 'Slate', refined: 'Slate Block' },
  7: { raw: 'Basalt', refined: 'Basalt Block' },
  8: { raw: 'Marble', refined: 'Marble Block' },
};

export const RESOURCE_TYPES: ResourceType[] = [
  { id: 'wood', name: 'Wood → Planks', rawPrefix: 'WOOD', refinedPrefix: 'PLANKS', recipes: generateRecipes('WOOD', 'PLANKS', WOOD_NAMES) },
  { id: 'ore', name: 'Ore → Metal Bars', rawPrefix: 'ORE', refinedPrefix: 'METALBAR', recipes: generateRecipes('ORE', 'METALBAR', ORE_NAMES) },
  { id: 'hide', name: 'Hide → Leather', rawPrefix: 'HIDE', refinedPrefix: 'LEATHER', recipes: generateRecipes('HIDE', 'LEATHER', HIDE_NAMES) },
  { id: 'fiber', name: 'Fiber → Cloth', rawPrefix: 'FIBER', refinedPrefix: 'CLOTH', recipes: generateRecipes('FIBER', 'CLOTH', FIBER_NAMES) },
  { id: 'rock', name: 'Rock → Stone', rawPrefix: 'ROCK', refinedPrefix: 'STONEBLOCK', recipes: generateRecipes('ROCK', 'STONEBLOCK', ROCK_NAMES) },
];

// Albion refining city bonuses (each city specializes in exactly one resource).
export const CITY_REFINE_BONUS: Record<string, string[]> = {
  'Fort Sterling': ['wood'],
  'Lymhurst': ['fiber'],
  'Bridgewatch': ['rock'],
  'Martlock': ['hide'],
  'Thetford': ['ore'],
};

// Cities where each raw resource is typically cheapest (biome proximity)
export const RESOURCE_CHEAP_CITIES: Record<string, string[]> = {
  'WOOD': ['Lymhurst', 'Fort Sterling', 'Martlock'],
  'ORE': ['Thetford', 'Bridgewatch'],
  'HIDE': ['Martlock', 'Lymhurst'],
  'FIBER': ['Thetford', 'Lymhurst'],
  'ROCK': ['Bridgewatch', 'Fort Sterling'],
};
