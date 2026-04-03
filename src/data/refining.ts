// Albion Online refining data
// Refining converts raw resources into refined materials
// Each tier requires previous tier refined + raw resource of current tier

export interface RefineRecipe {
  rawId: string;         // e.g. T4_WOOD
  refinedId: string;     // e.g. T4_PLANKS
  prevRefinedId: string; // e.g. T3_PLANKS (previous tier refined needed)
  rawName: string;
  refinedName: string;
  tier: number;
  rawPerCraft: number;   // raw resources needed
  prevPerCraft: number;  // previous tier refined needed
  outputPerCraft: number;
}

export interface ResourceType {
  id: string;
  name: string;
  rawPrefix: string;     // e.g. WOOD, ORE, HIDE, FIBER, ROCK
  refinedPrefix: string; // e.g. PLANKS, METALBAR, LEATHER, CLOTH, STONEBLOCK
  recipes: RefineRecipe[];
}

export const RESOURCE_TYPES: ResourceType[] = [
  {
    id: 'wood', name: 'Wood → Planks', rawPrefix: 'WOOD', refinedPrefix: 'PLANKS',
    recipes: [
      { rawId: 'T2_WOOD', refinedId: 'T2_PLANKS', prevRefinedId: '', rawName: 'Birch Log', refinedName: 'Birch Planks', tier: 2, rawPerCraft: 2, prevPerCraft: 0, outputPerCraft: 1 },
      { rawId: 'T3_WOOD', refinedId: 'T3_PLANKS', prevRefinedId: 'T2_PLANKS', rawName: 'Chestnut Log', refinedName: 'Chestnut Planks', tier: 3, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T4_WOOD', refinedId: 'T4_PLANKS', prevRefinedId: 'T3_PLANKS', rawName: 'Pine Log', refinedName: 'Pine Planks', tier: 4, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T5_WOOD', refinedId: 'T5_PLANKS', prevRefinedId: 'T4_PLANKS', rawName: 'Cedar Log', refinedName: 'Cedar Planks', tier: 5, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T6_WOOD', refinedId: 'T6_PLANKS', prevRefinedId: 'T5_PLANKS', rawName: 'Bloodoak Log', refinedName: 'Bloodoak Planks', tier: 6, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T7_WOOD', refinedId: 'T7_PLANKS', prevRefinedId: 'T6_PLANKS', rawName: 'Ashenbark Log', refinedName: 'Ashenbark Planks', tier: 7, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T8_WOOD', refinedId: 'T8_PLANKS', prevRefinedId: 'T7_PLANKS', rawName: 'Whitewood Log', refinedName: 'Whitewood Planks', tier: 8, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
    ],
  },
  {
    id: 'ore', name: 'Ore → Metal Bars', rawPrefix: 'ORE', refinedPrefix: 'METALBAR',
    recipes: [
      { rawId: 'T2_ORE', refinedId: 'T2_METALBAR', prevRefinedId: '', rawName: 'Copper Ore', refinedName: 'Copper Bar', tier: 2, rawPerCraft: 2, prevPerCraft: 0, outputPerCraft: 1 },
      { rawId: 'T3_ORE', refinedId: 'T3_METALBAR', prevRefinedId: 'T2_METALBAR', rawName: 'Tin Ore', refinedName: 'Bronze Bar', tier: 3, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T4_ORE', refinedId: 'T4_METALBAR', prevRefinedId: 'T3_METALBAR', rawName: 'Iron Ore', refinedName: 'Steel Bar', tier: 4, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T5_ORE', refinedId: 'T5_METALBAR', prevRefinedId: 'T4_METALBAR', rawName: 'Titanium Ore', refinedName: 'Titanium Bar', tier: 5, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T6_ORE', refinedId: 'T6_METALBAR', prevRefinedId: 'T5_METALBAR', rawName: 'Runite Ore', refinedName: 'Runite Bar', tier: 6, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T7_ORE', refinedId: 'T7_METALBAR', prevRefinedId: 'T6_METALBAR', rawName: 'Meteorite Ore', refinedName: 'Meteorite Bar', tier: 7, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T8_ORE', refinedId: 'T8_METALBAR', prevRefinedId: 'T7_METALBAR', rawName: 'Adamantium Ore', refinedName: 'Adamantium Bar', tier: 8, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
    ],
  },
  {
    id: 'hide', name: 'Hide → Leather', rawPrefix: 'HIDE', refinedPrefix: 'LEATHER',
    recipes: [
      { rawId: 'T2_HIDE', refinedId: 'T2_LEATHER', prevRefinedId: '', rawName: 'Rugged Hide', refinedName: 'Stiff Leather', tier: 2, rawPerCraft: 2, prevPerCraft: 0, outputPerCraft: 1 },
      { rawId: 'T3_HIDE', refinedId: 'T3_LEATHER', prevRefinedId: 'T2_LEATHER', rawName: 'Thin Hide', refinedName: 'Thick Leather', tier: 3, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T4_HIDE', refinedId: 'T4_LEATHER', prevRefinedId: 'T3_LEATHER', rawName: 'Medium Hide', refinedName: 'Worked Leather', tier: 4, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T5_HIDE', refinedId: 'T5_LEATHER', prevRefinedId: 'T4_LEATHER', rawName: 'Heavy Hide', refinedName: 'Cured Leather', tier: 5, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T6_HIDE', refinedId: 'T6_LEATHER', prevRefinedId: 'T5_LEATHER', rawName: 'Robust Hide', refinedName: 'Hardened Leather', tier: 6, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T7_HIDE', refinedId: 'T7_LEATHER', prevRefinedId: 'T6_LEATHER', rawName: 'Thick Hide', refinedName: 'Reinforced Leather', tier: 7, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T8_HIDE', refinedId: 'T8_LEATHER', prevRefinedId: 'T7_LEATHER', rawName: 'Resilient Hide', refinedName: 'Fortified Leather', tier: 8, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
    ],
  },
  {
    id: 'fiber', name: 'Fiber → Cloth', rawPrefix: 'FIBER', refinedPrefix: 'CLOTH',
    recipes: [
      { rawId: 'T2_FIBER', refinedId: 'T2_CLOTH', prevRefinedId: '', rawName: 'Cotton', refinedName: 'Simple Cloth', tier: 2, rawPerCraft: 2, prevPerCraft: 0, outputPerCraft: 1 },
      { rawId: 'T3_FIBER', refinedId: 'T3_CLOTH', prevRefinedId: 'T2_CLOTH', rawName: 'Flax', refinedName: 'Neat Cloth', tier: 3, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T4_FIBER', refinedId: 'T4_CLOTH', prevRefinedId: 'T3_CLOTH', rawName: 'Hemp', refinedName: 'Fine Cloth', tier: 4, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T5_FIBER', refinedId: 'T5_CLOTH', prevRefinedId: 'T4_CLOTH', rawName: 'Skyflower', refinedName: 'Ornate Cloth', tier: 5, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T6_FIBER', refinedId: 'T6_CLOTH', prevRefinedId: 'T5_CLOTH', rawName: 'Redleaf Cotton', refinedName: 'Royal Cloth', tier: 6, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T7_FIBER', refinedId: 'T7_CLOTH', prevRefinedId: 'T6_CLOTH', rawName: 'Sunflower', refinedName: 'Regal Cloth', tier: 7, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T8_FIBER', refinedId: 'T8_CLOTH', prevRefinedId: 'T7_CLOTH', rawName: 'Ghost Cotton', refinedName: 'Imperial Cloth', tier: 8, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
    ],
  },
  {
    id: 'rock', name: 'Rock → Stone Blocks', rawPrefix: 'ROCK', refinedPrefix: 'STONEBLOCK',
    recipes: [
      { rawId: 'T2_ROCK', refinedId: 'T2_STONEBLOCK', prevRefinedId: '', rawName: 'Limestone', refinedName: 'Limestone Block', tier: 2, rawPerCraft: 2, prevPerCraft: 0, outputPerCraft: 1 },
      { rawId: 'T3_ROCK', refinedId: 'T3_STONEBLOCK', prevRefinedId: 'T2_STONEBLOCK', rawName: 'Sandstone', refinedName: 'Sandstone Block', tier: 3, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T4_ROCK', refinedId: 'T4_STONEBLOCK', prevRefinedId: 'T3_STONEBLOCK', rawName: 'Travertine', refinedName: 'Travertine Block', tier: 4, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T5_ROCK', refinedId: 'T5_STONEBLOCK', prevRefinedId: 'T4_STONEBLOCK', rawName: 'Granite', refinedName: 'Granite Block', tier: 5, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T6_ROCK', refinedId: 'T6_STONEBLOCK', prevRefinedId: 'T5_STONEBLOCK', rawName: 'Slate', refinedName: 'Slate Block', tier: 6, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T7_ROCK', refinedId: 'T7_STONEBLOCK', prevRefinedId: 'T6_STONEBLOCK', rawName: 'Basalt', refinedName: 'Basalt Block', tier: 7, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
      { rawId: 'T8_ROCK', refinedId: 'T8_STONEBLOCK', prevRefinedId: 'T7_STONEBLOCK', rawName: 'Marble', refinedName: 'Marble Block', tier: 8, rawPerCraft: 2, prevPerCraft: 1, outputPerCraft: 1 },
    ],
  },
];

// City refining bonuses (resource return rate bonus)
export const CITY_REFINE_BONUS: Record<string, string[]> = {
  'Fort Sterling': ['rock', 'wood'],
  'Lymhurst': ['fiber', 'hide'],
  'Bridgewatch': ['ore', 'rock'],
  'Martlock': ['wood', 'hide'],
  'Thetford': ['fiber', 'ore'],
  'Caerleon': [],
};
