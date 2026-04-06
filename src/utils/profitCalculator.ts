import type { ItemDefinition, Tier, Enchantment } from '../types';
import { resolveMaterialId, resolveItemId, resolveArtifactId } from './itemIdParser';

export interface MaterialCost {
  materialId: string;
  materialBase: string;
  name: string;
  count: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CraftingResult {
  itemId: string;
  materials: MaterialCost[];
  artifactCost: { id: string; price: number } | null;
  totalMaterialCost: number;      // raw materials + artifact (display)
  effectiveMaterialCost: number;  // materials × (1 - RR) + artifact (true cost paid per craft set)
  sellPrice: number;
  tax: number;
  taxRate: number;
  usageFee: number;
  profit: number;
  profitMargin: number;
  returnRate: number;
  investment: number;
}

const MATERIAL_NAMES: Record<string, string> = {
  METALBAR: 'Metal Bar',
  PLANKS: 'Planks',
  CLOTH: 'Cloth',
  LEATHER: 'Leather',
  STONEBLOCK: 'Stone Block',
};

// Albion Item Value per resource tier (from albiononline2d source / game data).
// Used for station nutrition/setup fee calculation.
const RESOURCE_ITEM_VALUE: Record<number, number> = {
  2: 4,
  3: 8,
  4: 16,
  5: 32,
  6: 64,
  7: 128,
  8: 256,
};

// Enchant multiplier for item value (from game data)
const ENCHANT_IV_MULT: Record<number, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
  4: 16,
};

function getResourceItemValue(tier: number, enchant: number): number {
  const base = RESOURCE_ITEM_VALUE[tier] || 0;
  return base * (ENCHANT_IV_MULT[enchant] || 1);
}

export function calculateCrafting(
  item: ItemDefinition,
  tier: Tier,
  enchantment: Enchantment,
  quantity: number,
  returnRate: number,
  hasPremium: boolean,
  usageFeePerHundred: number,
  priceMap: Map<string, number>,
): CraftingResult {
  const itemId = resolveItemId(item.baseId, tier, enchantment);

  const materials: MaterialCost[] = item.recipe.map(req => {
    const materialId = resolveMaterialId(req.materialBase, tier, enchantment);
    const unitPrice = priceMap.get(materialId) || 0;
    const count = req.count * quantity;
    return {
      materialId,
      materialBase: req.materialBase,
      name: MATERIAL_NAMES[req.materialBase] || req.materialBase,
      count,
      unitPrice,
      totalPrice: unitPrice * count,
    };
  });

  let artifactCost: { id: string; price: number } | null = null;
  if (item.artifactId) {
    const artifactFullId = resolveArtifactId(item.artifactId, tier);
    const artifactPrice = priceMap.get(artifactFullId) || 0;
    artifactCost = { id: artifactFullId, price: artifactPrice * quantity };
  }

  // CRITICAL: Return rate only applies to REFINED materials, never to artifacts.
  // Artifacts are always fully consumed per craft.
  const rawMaterialCost = materials.reduce((sum, m) => sum + m.totalPrice, 0);
  const artifactTotal = artifactCost?.price || 0;
  const totalMaterialCost = rawMaterialCost + artifactTotal;
  const effectiveMaterialCost = rawMaterialCost * (1 - returnRate) + artifactTotal;

  const sellPrice = (priceMap.get(itemId) || 0) * quantity;
  const taxRate = hasPremium ? 0.065 : 0.105;
  const tax = sellPrice * taxRate;

  // Station usage fee (setup/nutrition).
  // Nutrition per craft = sum(resource count × resource item value) × 0.1125
  // Fee = (nutrition / 100) × fee_per_100_nutrition
  let nutritionPerCraft = 0;
  for (const req of item.recipe) {
    const iv = getResourceItemValue(tier, enchantment);
    nutritionPerCraft += req.count * iv;
  }
  nutritionPerCraft = nutritionPerCraft * 0.1125;
  const usageFee = (nutritionPerCraft / 100) * usageFeePerHundred * quantity;

  const investment = effectiveMaterialCost + usageFee;
  const profit = sellPrice - tax - effectiveMaterialCost - usageFee;
  const profitMargin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

  return {
    itemId,
    materials,
    artifactCost,
    totalMaterialCost,
    effectiveMaterialCost,
    sellPrice,
    tax,
    taxRate,
    usageFee,
    profit,
    profitMargin,
    returnRate,
    investment,
  };
}
