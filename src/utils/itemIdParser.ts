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

// Centralized: get the 2H_↔MAIN_ alternate variant of an item ID
export function getAlternateVariantId(itemId: string): string | null {
  if (itemId.includes('_2H_')) return itemId.replace('_2H_', '_MAIN_');
  if (itemId.includes('_MAIN_')) return itemId.replace('_MAIN_', '_2H_');
  return null;
}

// Get both variants (original + alternate) for API fetching
export function getAllVariantIds(itemId: string): string[] {
  const alt = getAlternateVariantId(itemId);
  return alt ? [itemId, alt] : [itemId];
}

// Mutate a price map to ensure both 2H_ and MAIN_ variants have entries
export function crossMapVariants(map: Map<string, number>): void {
  const entries = [...map.entries()];
  for (const [k, v] of entries) {
    const alt = getAlternateVariantId(k);
    if (alt && !map.has(alt)) map.set(alt, v);
  }
}

export function getItemIconUrl(itemId: string, quality: number = 1, size: number = 128): string {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=${quality}&size=${size}`;
}

export function getMaterialIconUrl(materialBase: MaterialType, tier: Tier, enchantment: Enchantment): string {
  const materialId = resolveMaterialId(materialBase, tier, enchantment);
  return getItemIconUrl(materialId, 1, 64);
}
