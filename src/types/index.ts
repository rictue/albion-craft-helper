export type Tier = 4 | 5 | 6 | 7 | 8;
export type Enchantment = 0 | 1 | 2 | 3 | 4;
export type Quality = 1 | 2 | 3 | 4 | 5;

export type ItemCategory =
  | 'weapon_1h'
  | 'weapon_2h'
  | 'offhand'
  | 'head'
  | 'chest'
  | 'shoes'
  | 'bag'
  | 'cape';

export type MaterialType = 'METALBAR' | 'PLANKS' | 'CLOTH' | 'LEATHER';

export interface ResourceRequirement {
  materialBase: MaterialType;
  count: number;
}

export interface ItemDefinition {
  baseId: string;
  name: string;
  category: ItemCategory;
  subcategory: string;
  recipe: ResourceRequirement[];
  artifactId?: string;
  icon?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  category: ItemCategory;
  items: ItemDefinition[];
}

export interface MarketPrice {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  buy_price_min: number;
  buy_price_max: number;
  buy_price_max_date: string;
}

export interface PriceEntry {
  prices: MarketPrice[];
  fetchedAt: number;
}

import type { MarketFeeSettings } from '../utils/marketFees';

export interface CraftingSettings {
  craftingCity: string;
  sellingLocation: string;
  /** @deprecated Kept for backwards compat — derived from feeSettings.taxProfile === 'premium'. */
  hasPremium: boolean;
  useFocus: boolean;
  returnRateOverride: number | null;
  usageFeePerHundred: number;
  quantity: number;
  /**
   * Today's additional station/production bonus as a raw percentage
   * (e.g. 15 means +15% added to the final return rate). Albion Online
   * rotates this daily per city/item type — the value is visible at the
   * crafting station in-game. There is no public API for it, so the user
   * enters it manually.
   */
  dailyStationBonusPct: number;
  /**
   * Full marketplace fee model: tax profile + entry/exit price source +
   * private (Discord) sale toggle. Replaces the old hasPremium boolean as
   * the single source of truth for tax calculations.
   */
  feeSettings: MarketFeeSettings;
}

export interface CityInfo {
  id: string;
  name: string;
  specializations: string[];
}
