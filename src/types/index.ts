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

export interface CraftingSettings {
  craftingCity: string;
  sellingLocation: string;
  hasPremium: boolean;
  useFocus: boolean;
  returnRateOverride: number | null;
  usageFeePerHundred: number;
  quantity: number;
}

export interface PlannerEntry {
  id: string;
  item: ItemDefinition;
  tier: Tier;
  enchantment: Enchantment;
  quantity: number;
}

export interface CustomPriceEntry {
  itemId: string;
  city: string;
  price: number;
  updatedAt: number;
}

export interface CityInfo {
  id: string;
  name: string;
  specializations: string[];
}
