import type { MaterialType } from '../types';

export interface MaterialInfo {
  type: MaterialType;
  name: string;
  icon: string;
}

export const MATERIALS: Record<MaterialType, MaterialInfo> = {
  METALBAR: { type: 'METALBAR', name: 'Metal Bar', icon: 'METALBAR' },
  PLANKS: { type: 'PLANKS', name: 'Planks', icon: 'PLANKS' },
  CLOTH: { type: 'CLOTH', name: 'Cloth', icon: 'CLOTH' },
  LEATHER: { type: 'LEATHER', name: 'Leather', icon: 'LEATHER' },
};

export const ENCHANTMENT_NAMES: Record<number, string> = {
  0: 'Normal',
  1: 'Uncommon',
  2: 'Rare',
  3: 'Epic',
  4: 'Legendary',
};

export const ENCHANTMENT_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#22c55e',
  2: '#3b82f6',
  3: '#a855f7',
  4: '#eab308',
};

export const TIER_COLORS: Record<number, string> = {
  4: '#94a3b8',
  5: '#ef4444',
  6: '#f97316',
  7: '#eab308',
  8: '#f0f0f0',
};
