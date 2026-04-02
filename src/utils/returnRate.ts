import { CITIES } from '../data/cities';

const BASE_LPB = 18;
const SPECIALIZATION_LPB = 15;
const FOCUS_LPB = 59;

export function calculateLPB(city: string, subcategory: string, useFocus: boolean): number {
  let lpb = BASE_LPB;

  const cityInfo = CITIES.find(c => c.id === city);
  if (cityInfo && cityInfo.specializations.includes(subcategory)) {
    lpb += SPECIALIZATION_LPB;
  }

  if (useFocus) {
    lpb += FOCUS_LPB;
  }

  return lpb;
}

export function lpbToReturnRate(lpb: number): number {
  return lpb / (100 + lpb);
}

export function calculateReturnRate(city: string, subcategory: string, useFocus: boolean): number {
  const lpb = calculateLPB(city, subcategory, useFocus);
  return lpbToReturnRate(lpb);
}
