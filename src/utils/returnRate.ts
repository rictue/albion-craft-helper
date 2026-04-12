import { CITIES } from '../data/cities';

/**
 * Crafting return rate math.
 *
 * Albion's internal return rate for a crafting station is derived from a
 * hidden "LPB" value:
 *     RR = LPB / (100 + LPB)
 *
 * Plain station LPB is 18 → ~15.3% return.
 *
 * Focus crafting adds a large LPB bonus (+59 → 77 LPB → ~43.5% return).
 *
 * Royal city specialization (e.g. Plate Armor at Fort Sterling, Cloth at
 * Bridgewatch) is NOT an LPB tweak in the real game — it is a FLAT ~+9.6%
 * return-rate bonus applied on top of whatever the station would give.
 *
 * This matters because the two models diverge once focus is involved:
 *     +15 LPB to a base LPB of 18  → +9.6% RR   (correct without focus)
 *     +15 LPB to a base LPB of 77  → +4.4% RR   (too low with focus!)
 *
 * So we compute the LPB-derived part first, then add a flat bonus only when
 * the selected city specializes in the selected item.
 */

const BASE_LPB = 18;
const FOCUS_LPB = 59;

// Royal city specialization bonus. In-game shows as "+10%" but the exact
// value the game uses is ~9.6% (additive to final return rate).
const CITY_SPEC_RR_BONUS = 0.096;

/**
 * LPB contribution from station + focus only. Does NOT include the royal city
 * specialization bonus, because that is applied as a flat bonus to the final
 * return rate, not as LPB.
 */
export function calculateLPB(
  _city: string,
  _subcategory: string,
  useFocus: boolean,
  specBonusLPB: number = 0,
): number {
  let lpb = BASE_LPB;
  if (useFocus) lpb += FOCUS_LPB;
  // Legacy param kept for backwards compat. Spec does NOT affect return rate.
  lpb += specBonusLPB;
  return lpb;
}

export function lpbToReturnRate(lpb: number): number {
  return lpb / (100 + lpb);
}

export function calculateReturnRate(
  city: string,
  subcategory: string,
  useFocus: boolean,
  specBonusLPB: number = 0,
): number {
  const lpb = calculateLPB(city, subcategory, useFocus, specBonusLPB);
  let rr = lpbToReturnRate(lpb);

  const cityInfo = CITIES.find(c => c.id === city);
  if (cityInfo && cityInfo.specializations.includes(subcategory)) {
    rr += CITY_SPEC_RR_BONUS;
  }

  return rr;
}

/**
 * Returns whether the given city has a specialization for the given item
 * subcategory. Used by the UI to show a "bonus active" badge.
 */
export function hasCityBonus(city: string, subcategory: string): boolean {
  const cityInfo = CITIES.find(c => c.id === city);
  return !!(cityInfo && cityInfo.specializations.includes(subcategory));
}

export { CITY_SPEC_RR_BONUS };
