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

    // Base (enchant 0)
    const prevRefined = tier > 2 ? `T${tier - 1}_${refinedPrefix}` : '';
    recipes.push({
      rawId: `T${tier}_${rawPrefix}`,
      refinedId: `T${tier}_${refinedPrefix}`,
      prevRefinedId: prevRefined,
      rawName: names.raw,
      refinedName: names.refined,
      tier, enchant: 0,
      rawPerCraft: 2, prevPerCraft: tier > 2 ? 1 : 0, outputPerCraft: 1,
    });

    // Enchanted (1-3) only for T4+
    if (tier >= 4) {
      for (let e = 1; e <= 3; e++) {
        const prevEnchRef = `T${tier - 1}_${refinedPrefix}_LEVEL${e}@${e}`;
        recipes.push({
          rawId: `T${tier}_${rawPrefix}_LEVEL${e}@${e}`,
          refinedId: `T${tier}_${refinedPrefix}_LEVEL${e}@${e}`,
          prevRefinedId: prevEnchRef,
          rawName: `${enchantNames[e]} ${names.raw}`,
          refinedName: `${enchantNames[e]} ${names.refined}`,
          tier, enchant: e,
          rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1,
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

export const CITY_REFINE_BONUS: Record<string, string[]> = {
  'Fort Sterling': ['rock', 'wood'],
  'Lymhurst': ['fiber', 'hide'],
  'Bridgewatch': ['ore', 'rock'],
  'Martlock': ['wood', 'hide'],
  'Thetford': ['fiber', 'ore'],
  'Caerleon': [],
};
