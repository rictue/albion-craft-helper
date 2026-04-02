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
  totalMaterialCost: number;
  effectiveMaterialCost: number;
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
};

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

  const totalMaterialCost = materials.reduce((sum, m) => sum + m.totalPrice, 0) + (artifactCost?.price || 0);
  const effectiveMaterialCost = totalMaterialCost * (1 - returnRate);

  const sellPrice = (priceMap.get(itemId) || 0) * quantity;
  const taxRate = hasPremium ? 0.065 : 0.105;
  const tax = sellPrice * taxRate;

  // Usage fee: simplified - based on item value * nutrition factor
  const itemValue = sellPrice / quantity;
  const nutritionPerItem = itemValue * 0.1125;
  const usageFee = (nutritionPerItem / 100) * usageFeePerHundred * quantity;

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
