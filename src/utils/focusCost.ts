/**
 * Focus cost math for refining and crafting.
 *
 * The real Albion formula (from the official game data):
 *
 *   cost = baseFocus × enchantMultiplier × 0.5^((sumAllTierSpecs·0.3 + tierSpec·2.5) / 100)
 *
 * The enchant multiplier matches the item-value ratio (.1 = 2×, .2 = 4×,
 * .3 = 8×, .4 = 16×), which is why enchanted refining burns focus so
 * fast. The sum-of-all-tier-specs × 0.3 term is what makes a maxed
 * refiner ridiculously efficient even on tiers they haven't focused on.
 *
 * Earlier versions of this calculator missed BOTH of these terms, which
 * made .4 refining look ~15× cheaper than reality and produced phantom
 * planks in reinvest simulations.
 */

// Base .0-enchant focus cost per tier — applies to refining.
// For crafting items the game uses the same base values.
export const BASE_FOCUS_PER_TIER: Record<number, number> = {
  2: 6, 3: 18, 4: 48, 5: 101, 6: 201, 7: 402, 8: 604,
};

// Each enchant level multiplies the focus cost by 2× (stacked), matching
// the item-value enchant scaling used everywhere else in the game.
export const FOCUS_ENCHANT_MULT: Record<number, number> = {
  0: 1, 1: 2, 2: 4, 3: 8, 4: 16,
};

export interface FocusCostInput {
  tier: number;             // 2-8
  enchant?: number;         // 0-4, default 0
  tierSpec: number;         // 0-100, spec level for the exact tier
  totalResourceSpec?: number; // sum of spec levels across all tiers of this resource
  /** Override base focus cost (e.g. for crafting recipes with different base). */
  baseOverride?: number;
}

export function computeFocusCost({
  tier,
  enchant = 0,
  tierSpec,
  totalResourceSpec = tierSpec,
  baseOverride,
}: FocusCostInput): number {
  const base = baseOverride ?? BASE_FOCUS_PER_TIER[tier] ?? 0;
  const enchantMult = FOCUS_ENCHANT_MULT[enchant] ?? 1;
  const exponent = (totalResourceSpec * 0.3 + tierSpec * 2.5) / 100;
  const discount = Math.pow(0.5, exponent);
  return Math.max(1, Math.round(base * enchantMult * discount));
}

/**
 * Legacy single-spec version kept for places that don't track
 * cross-tier sums yet. Equivalent to the full formula with
 * totalResourceSpec = tierSpec.
 */
export function computeFocusCostSimple(tier: number, tierSpec: number, enchant = 0): number {
  return computeFocusCost({ tier, tierSpec, enchant });
}
