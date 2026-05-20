/**
 * Marketplace fee / tax math used by every profit calculator on the site.
 *
 * Albion's marketplace has two distinct fees:
 *  - Sales tax: deducted from sell price when a sell order resolves
 *      Premium: 4%, Non-premium: 8%
 *  - Setup fee: extra fee when POSTING a buy or sell order (not instant)
 *      Premium + Non-premium: 2.5%
 *
 * So the actual silver flow depends on whether the player buys/sells
 * instantly (matches against an existing order) or posts their own order
 * and waits.
 *
 *   When SELLING:
 *     - Instant sell (sells into a buy order): pay sales tax only
 *     - Sell order (posts a sell order):       pay sales tax + setup fee
 *
 *   When BUYING (the input/material side):
 *     - Instant buy (buys from a sell order): pay sticker price, no fee
 *     - Buy order (posts a buy order):        pay sticker + setup fee
 *
 * Direct trade / private sale bypasses the marketplace entirely — buyer
 * and seller agree on a price in chat or Discord, then trade in-game.
 * No tax, no setup, and (by user request) no built-in discount: the
 * price the user types is the price they get.
 */

export type TaxProfile = 'premium' | 'normal' | 'custom';
export type SaleMode = 'marketplace' | 'private';
export type PriceSource = 'buyOrder' | 'sellOrder';

export interface MarketFeeSettings {
  saleMode: SaleMode;
  taxProfile: TaxProfile;
  /** Custom sales tax percent (only used when taxProfile === 'custom'). */
  customSalesTaxPct?: number;
  /** Custom setup fee percent (only used when taxProfile === 'custom'). */
  customSetupFeePct?: number;
  /** How the player gets the input materials. */
  entrySource: PriceSource;
  /** How the player sells the output. */
  exitSource: PriceSource;
}

interface TaxRates {
  salesTaxPct: number;
  setupFeePct: number;
}

export const TAX_PRESETS: Record<Exclude<TaxProfile, 'custom'>, TaxRates> = {
  premium: { salesTaxPct: 4, setupFeePct: 2.5 },
  normal:  { salesTaxPct: 8, setupFeePct: 2.5 },
};

/** Direct trade / private sale: buyer and seller agree on a sticker price
 *  and trade in-game. No marketplace tax, no setup fee, no built-in
 *  discount — the price the user types IS the price they receive. */
export const PRIVATE_SALE_MULTIPLIER = 1.0;

export const DEFAULT_FEE_SETTINGS: MarketFeeSettings = {
  saleMode:    'marketplace',
  taxProfile:  'premium',
  entrySource: 'sellOrder',  // default: instant buy (most users)
  exitSource:  'buyOrder',   // default: instant sell (most users)
};

function rates(s: MarketFeeSettings): TaxRates {
  if (s.taxProfile === 'custom') {
    return {
      salesTaxPct: clamp(s.customSalesTaxPct ?? 0, 0, 100),
      setupFeePct: clamp(s.customSetupFeePct ?? 0, 0, 100),
    };
  }
  return TAX_PRESETS[s.taxProfile];
}

/** Multiplier applied to the sell price to get net silver received per unit. */
export function getSaleMultiplier(s: MarketFeeSettings): number {
  if (s.saleMode === 'private') return PRIVATE_SALE_MULTIPLIER;
  const r = rates(s);
  const setupFee = s.exitSource === 'sellOrder' ? r.setupFeePct : 0;
  return clamp(1 - (r.salesTaxPct + setupFee) / 100, 0, 1);
}

/**
 * Multiplier applied to the buy price to get total silver spent per unit.
 *
 * Note: the entry side is independent of saleMode — even when a player
 * sells on Discord (private), they still buy raw materials from the
 * marketplace and incur a setup fee if they use a buy order. Only the
 * exit (sell) side bypasses the marketplace.
 */
export function getEntryMultiplier(s: MarketFeeSettings): number {
  const r = rates(s);
  const setupFee = s.entrySource === 'buyOrder' ? r.setupFeePct : 0;
  return 1 + setupFee / 100;
}

/** Backwards-compat shim for legacy callers that just want a flat tax rate. */
export function getEffectiveTaxRate(s: MarketFeeSettings): number {
  return 1 - getSaleMultiplier(s);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Standard "fee reality check" scenarios — used by every calc's results
 * panel so the player can see net profit across the four common
 * marketplace setups at once. Profit = sellPrice * saleMult - (costBeforeFees * entryMult + fixedFees).
 */
export interface FeeScenario {
  label: string;
  saleMultiplier: number;
  entryMultiplier: number;
}

export const FEE_SCENARIOS: FeeScenario[] = [
  { label: 'Prem instant',       saleMultiplier: 0.96,  entryMultiplier: 1     },
  { label: 'Prem sell order',    saleMultiplier: 0.935, entryMultiplier: 1.025 },
  { label: 'No prem instant',    saleMultiplier: 0.92,  entryMultiplier: 1     },
  { label: 'No prem sell order', saleMultiplier: 0.895, entryMultiplier: 1.025 },
];

export interface ScenarioProfitInput {
  sellPrice: number;
  costBeforeFees: number;
  /** Per-unit station / journal / nutrition fees that are not subject to tax/setup. */
  fixedFees?: number;
}

export function profitForScenario(
  input: ScenarioProfitInput,
  scenario: FeeScenario,
): number {
  const cost = input.costBeforeFees * scenario.entryMultiplier + (input.fixedFees ?? 0);
  return input.sellPrice * scenario.saleMultiplier - cost;
}
