/**
 * Pure math for the transmutation profit calculator.
 *
 * All numbers are silver per UNIT of OUTPUT resource. So if you transmute
 * 1000 logs from 4.2 to 4.3, the calculator treats every result as
 * "buyPrice (per 4.2 unit) + transmuteCost (per 4.3 unit) → sellPrice
 * (per 4.3 unit)". The 1:1 input:output assumption matches Albion's
 * transmute recipe behavior (1 input = 1 output, no return rate on
 * raws).
 */

export type SaleMode = 'market' | 'discord' | 'custom';

/** Default net-of-tax multipliers per sale mode. */
export const SALE_MULTIPLIERS: Record<Exclude<SaleMode, 'custom'>, number> = {
  market:  0.935,  // 6.5% premium tax — listing fee + sales tax
  discord: 0.95,   // -5% direct-sale discount, no tax
};

export interface CalcInput {
  inputBuyPrice: number;    // Silver per input unit
  transmuteCost: number;    // Silver per output unit (auto-filled from recipe)
  outputSellPrice: number;  // Silver per output unit
  quantity: number;
  saleMultiplier: number;   // 0..1, net-after-tax fraction of the gross sell
}

export interface CalcResult {
  costPerUnit: number;
  netSellPerUnit: number;
  profitPerUnit: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  roiPercent: number;
  breakEvenSellPrice: number;
}

/** Clamp helper used to keep inputs in sane ranges before math. */
function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

export function calculateTransmute(input: CalcInput): CalcResult {
  const buy        = Math.max(0, input.inputBuyPrice);
  const trans      = Math.max(0, input.transmuteCost);
  const sell       = Math.max(0, input.outputSellPrice);
  const qty        = Math.max(1, Math.floor(input.quantity || 1));
  const multiplier = clamp(input.saleMultiplier, 0, 1);

  const costPerUnit       = buy + trans;
  const netSellPerUnit    = sell * multiplier;
  const profitPerUnit     = netSellPerUnit - costPerUnit;
  const totalCost         = costPerUnit * qty;
  const totalRevenue      = netSellPerUnit * qty;
  const totalProfit       = profitPerUnit * qty;
  const roiPercent        = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const breakEvenSellPrice = multiplier > 0 ? costPerUnit / multiplier : 0;

  return {
    costPerUnit,
    netSellPerUnit,
    profitPerUnit,
    totalCost,
    totalRevenue,
    totalProfit,
    roiPercent,
    breakEvenSellPrice,
  };
}

export type Decision = 'strong' | 'playable' | 'thin' | 'loss';

export interface DecisionThresholds {
  strong: number;   // profit/unit >= strong = "Strong"
  playable: number; // profit/unit >= playable = "Playable"
  thin: number;     // profit/unit >= thin = "Thin", below = "Loss"
}

export const DEFAULT_THRESHOLDS: DecisionThresholds = {
  strong: 5000,
  playable: 1000,
  thin: 0,
};

export function decisionFor(profitPerUnit: number, t: DecisionThresholds): Decision {
  if (profitPerUnit >= t.strong)   return 'strong';
  if (profitPerUnit >= t.playable) return 'playable';
  if (profitPerUnit >= t.thin)     return 'thin';
  return 'loss';
}

export function decisionMeta(d: Decision): { label: string; tone: 'profit' | 'gold' | 'warn' | 'loss' } {
  switch (d) {
    case 'strong':   return { label: 'Strong',   tone: 'profit' };
    case 'playable': return { label: 'Playable', tone: 'gold' };
    case 'thin':     return { label: 'Thin',     tone: 'warn' };
    case 'loss':     return { label: 'Loss',     tone: 'loss' };
  }
}

/** Returns the sale multiplier for the given mode + optional custom override. */
export function resolveMultiplier(mode: SaleMode, customMultiplier: number): number {
  if (mode === 'custom') return clamp(customMultiplier, 0, 1);
  return SALE_MULTIPLIERS[mode];
}
