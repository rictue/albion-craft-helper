import type { Tier, Enchantment, MaterialType } from '../types';

export function resolveItemId(baseId: string, tier: Tier, enchantment: Enchantment): string {
  const base = `T${tier}_${baseId}`;
  return enchantment > 0 ? `${base}@${enchantment}` : base;
}

export function resolveMaterialId(materialBase: MaterialType, tier: Tier, enchantment: Enchantment): string {
  if (enchantment === 0) {
    return `T${tier}_${materialBase}`;
  }
  return `T${tier}_${materialBase}_LEVEL${enchantment}@${enchantment}`;
}

export function resolveArtifactId(artifactId: string, tier: Tier): string {
  return `T${tier}_${artifactId}`;
}

export function getItemIconUrl(itemId: string, quality: number = 1, size: number = 128): string {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=${quality}&size=${size}`;
}

export function getMaterialIconUrl(materialBase: MaterialType, tier: Tier, enchantment: Enchantment): string {
  const materialId = resolveMaterialId(materialBase, tier, enchantment);
  return getItemIconUrl(materialId, 1, 64);
}
