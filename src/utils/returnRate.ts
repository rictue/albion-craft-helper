import { CITIES } from '../data/cities';

const BASE_LPB = 18;
const SPECIALIZATION_LPB = 15;
const FOCUS_LPB = 59;

export function calculateLPB(city: string, subcategory: string, useFocus: boolean, specBonusLPB: number = 0): number {
  let lpb = BASE_LPB;

  const cityInfo = CITIES.find(c => c.id === city);
  if (cityInfo && cityInfo.specializations.includes(subcategory)) {
    lpb += SPECIALIZATION_LPB;
  }

  if (useFocus) {
    lpb += FOCUS_LPB;
  }

  // Legacy param kept for backwards compat, but always 0
  // Spec does NOT affect return rate in Albion Online
  lpb += specBonusLPB;

  return lpb;
}

export function lpbToReturnRate(lpb: number): number {
  return lpb / (100 + lpb);
}

export function calculateReturnRate(city: string, subcategory: string, useFocus: boolean, specBonusLPB: number = 0): number {
  const lpb = calculateLPB(city, subcategory, useFocus, specBonusLPB);
  return lpbToReturnRate(lpb);
}
