// User spec system - stored in localStorage, no hardcoded defaults

export interface SpecBonus {
  masteryLevel: number;
  specLevel: number;
  bonusLPB: number;
}

const STORAGE_KEY = 'albion-specs';

// Load all specs from localStorage
function loadSpecs(): Record<string, number> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Save spec to localStorage
export function saveSpec(key: string, value: number): void {
  const specs = loadSpecs();
  specs[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(specs));
}

// Get mastery level for a subcategory
export function getMastery(subcategory: string): number {
  const specs = loadSpecs();
  return specs[`mastery:${subcategory}`] || 0;
}

// Set mastery level
export function setMastery(subcategory: string, level: number): void {
  saveSpec(`mastery:${subcategory}`, level);
}

// Get item spec level
export function getItemSpec(baseId: string): number {
  const specs = loadSpecs();
  return specs[`spec:${baseId}`] || 0;
}

// Set item spec level
export function setItemSpec(baseId: string, level: number): void {
  saveSpec(`spec:${baseId}`, level);
}

// Get refine spec for a resource at a tier
export function getRefineSpec(resource: string, tier: number): number {
  const specs = loadSpecs();
  return specs[`refine:${resource}:${tier}`] || 0;
}

// Set refine spec
export function setRefineSpec(resource: string, tier: number, level: number): void {
  saveSpec(`refine:${resource}:${tier}`, level);
}

// Calculate spec bonus for return rate
export function getSpecBonus(subcategory: string, baseId: string): SpecBonus {
  const masteryLevel = getMastery(subcategory);
  const specLevel = getItemSpec(baseId);
  const bonusLPB = specLevel * 0.3;
  return { masteryLevel, specLevel, bonusLPB };
}
