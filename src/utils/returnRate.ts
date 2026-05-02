import { CITIES } from '../data/cities';
import { BASE_LPB, CRAFT_CITY_LPB, FOCUS_LPB } from '../data/constants';

/**
 * Crafting return rate math.
 *
 * Albion Free Market's current formula treats base station bonus, royal city
 * specialization, focus, and daily production bonus as one LPB/production
 * bonus pool:
 *     RR = LPB / (100 + LPB)
 *
 * The previous implementation added city and daily bonuses directly to the
 * final RR. That happens to look close for no-focus city crafting, but it
 * overstates return rate once focus or daily bonuses are active.
 */

/**
 * LPB contribution from station, city specialization, focus, and optional
 * daily production bonus.
 */
export function calculateLPB(
  city: string,
  subcategory: string,
  useFocus: boolean,
  specBonusLPB: number = 0,
  dailyBonusPct: number = 0,
): number {
  let lpb = BASE_LPB;

  const cityInfo = CITIES.find(c => c.id === city);
  if (cityInfo && cityInfo.specializations.includes(subcategory)) {
    lpb += CRAFT_CITY_LPB;
  }

  if (useFocus) lpb += FOCUS_LPB;

  // Legacy param kept for backwards compat. Item spec affects focus cost, not
  // return rate, so current callers should leave this at 0.
  lpb += Math.max(0, specBonusLPB);
  lpb += Math.max(0, dailyBonusPct);

  return Math.max(0, lpb);
}

export function lpbToReturnRate(lpb: number): number {
  return lpb <= 0 ? 0 : lpb / (100 + lpb);
}

export function calculateReturnRate(
  city: string,
  subcategory: string,
  useFocus: boolean,
  specBonusLPB: number = 0,
  dailyBonusPct: number = 0,
): number {
  const lpb = calculateLPB(city, subcategory, useFocus, specBonusLPB, dailyBonusPct);
  return Math.min(0.999, lpbToReturnRate(lpb));
}

/**
 * Returns whether the given city has a specialization for the given item
 * subcategory. Used by the UI to show a "bonus active" badge.
 */
export function hasCityBonus(city: string, subcategory: string): boolean {
  const cityInfo = CITIES.find(c => c.id === city);
  return !!(cityInfo && cityInfo.specializations.includes(subcategory));
}
