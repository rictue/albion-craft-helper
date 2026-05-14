// Ported from Codex 2026-05-14 transmutation scanner.
import type {
  CalculatorInput,
  CalculationResult,
  DecisionLevel,
  OrderPriceSide,
  PriceBook,
  PresetCost,
  ResourceType,
  SaleMode,
  ScannerSettings,
  Thresholds,
  TransmutationScanRow
} from "./types";

export const RESOURCE_TYPES: ResourceType[] = [
  "Wood / Logs",
  "Ore",
  "Fiber",
  "Hide",
  "Stone"
];

export const TIER_LABELS = buildTierOptions(4, 8, 0, 4);

export const TRANSMUTATION_STEPS: Array<{ from: string; to: string }> = [
  { from: "4.0", to: "4.1" },
  { from: "4.1", to: "4.2" },
  { from: "4.2", to: "4.3" },
  { from: "4.3", to: "4.4" },
  { from: "4.0", to: "5.0" },
  { from: "4.1", to: "5.1" },
  { from: "5.0", to: "5.1" },
  { from: "4.2", to: "5.2" },
  { from: "5.1", to: "5.2" },
  { from: "4.3", to: "5.3" },
  { from: "5.2", to: "5.3" },
  { from: "4.4", to: "5.4" },
  { from: "5.3", to: "5.4" },
  { from: "5.0", to: "6.0" },
  { from: "5.1", to: "6.1" },
  { from: "6.0", to: "6.1" },
  { from: "5.2", to: "6.2" },
  { from: "6.1", to: "6.2" },
  { from: "5.3", to: "6.3" },
  { from: "6.2", to: "6.3" },
  { from: "5.4", to: "6.4" },
  { from: "6.3", to: "6.4" },
  { from: "6.0", to: "7.0" },
  { from: "6.1", to: "7.1" },
  { from: "7.0", to: "7.1" },
  { from: "6.2", to: "7.2" },
  { from: "7.1", to: "7.2" },
  { from: "6.3", to: "7.3" },
  { from: "7.2", to: "7.3" },
  { from: "6.4", to: "7.4" },
  { from: "7.3", to: "7.4" },
  { from: "7.0", to: "8.0" },
  { from: "7.1", to: "8.1" },
  { from: "8.0", to: "8.1" },
  { from: "7.2", to: "8.2" },
  { from: "8.1", to: "8.2" },
  { from: "7.3", to: "8.3" },
  { from: "8.2", to: "8.3" },
  { from: "7.4", to: "8.4" },
  { from: "8.3", to: "8.4" }
];

export const SALE_MULTIPLIERS: Record<Exclude<SaleMode, "custom">, number> = {
  marketplace: 0.935,
  private: 0.95
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  strong: 5000,
  playable: 1000,
  thin: 0
};

export const DEFAULT_PRESETS: PresetCost[] = [
  { id: "4.0-4.1", from: "4.0", to: "4.1", cost: 1747 },
  { id: "4.1-4.2", from: "4.1", to: "4.2", cost: 3499 },
  { id: "4.2-4.3", from: "4.2", to: "4.3", cost: 7003 },
  { id: "4.3-4.4", from: "4.3", to: "4.4", cost: 27882 },
  { id: "4.0-5.0", from: "4.0", to: "5.0", cost: 909 },
  { id: "4.1-5.1", from: "4.1", to: "5.1", cost: 1819 },
  { id: "5.0-5.1", from: "5.0", to: "5.1", cost: 2324 },
  { id: "4.2-5.2", from: "4.2", to: "5.2", cost: 3636 },
  { id: "5.1-5.2", from: "5.1", to: "5.2", cost: 4648 },
  { id: "4.3-5.3", from: "4.3", to: "5.3", cost: 7273 },
  { id: "5.2-5.3", from: "5.2", to: "5.3", cost: 9296 },
  { id: "4.4-5.4", from: "4.4", to: "5.4", cost: 28995 },
  { id: "5.3-5.4", from: "5.3", to: "5.4", cost: 37087 },
  { id: "5.0-6.0", from: "5.0", to: "6.0", cost: 1454 },
  { id: "5.1-6.1", from: "5.1", to: "6.1", cost: 2908 },
  { id: "6.0-6.1", from: "6.0", to: "6.1", cost: 3486 },
  { id: "5.2-6.2", from: "5.2", to: "6.2", cost: 5816 },
  { id: "6.1-6.2", from: "6.1", to: "6.2", cost: 6972 },
  { id: "5.3-6.3", from: "5.3", to: "6.3", cost: 19145 },
  { id: "6.2-6.3", from: "6.2", to: "6.3", cost: 22960 },
  { id: "5.4-6.4", from: "5.4", to: "6.4", cost: 76439 },
  { id: "6.3-6.4", from: "6.3", to: "6.4", cost: 91698 },
  { id: "6.0-7.0", from: "6.0", to: "7.0", cost: 2904 },
  { id: "6.1-7.1", from: "6.1", to: "7.1", cost: 5809 },
  { id: "7.0-7.1", from: "7.0", to: "7.1", cost: 5577 },
  { id: "6.2-7.2", from: "6.2", to: "7.2", cost: 18264 },
  { id: "7.1-7.2", from: "7.1", to: "7.2", cost: 17536 },
  { id: "6.3-7.3", from: "6.3", to: "7.3", cost: 60197 },
  { id: "7.2-7.3", from: "7.2", to: "7.3", cost: 57794 },
  { id: "6.4-7.4", from: "6.4", to: "7.4", cost: 241000 },
  { id: "7.3-7.4", from: "7.3", to: "7.4", cost: 231000 },
  { id: "7.0-8.0", from: "7.0", to: "8.0", cost: 5809 },
  { id: "7.1-8.1", from: "7.1", to: "8.1", cost: 17397 },
  { id: "8.0-8.1", from: "8.0", to: "8.1", cost: 16703 },
  { id: "7.2-8.2", from: "7.2", to: "8.2", cost: 54735 },
  { id: "8.1-8.2", from: "8.1", to: "8.2", cost: 52550 },
  { id: "7.3-8.3", from: "7.3", to: "8.3", cost: 180000 },
  { id: "8.2-8.3", from: "8.2", to: "8.3", cost: 173000 },
  { id: "7.4-8.4", from: "7.4", to: "8.4", cost: 902000 },
  { id: "8.3-8.4", from: "8.3", to: "8.4", cost: 866000 }
];

export const FROM_OPTIONS = buildTierOptions(4, 8, 0, 3);
export const TO_OPTIONS = buildTierOptions(4, 8, 0, 4);

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  saleMode: "marketplace",
  marketplaceTaxPercent: 4,
  setupFeePercent: 2.5,
  stationFeePerUnit: 0,
  taxProfile: "premium",
  entryPriceSource: "sellOrder",
  exitPriceSource: "buyOrder",
  onlyProfitable: false,
  bestRouteOnly: true,
  sortMode: "profitDesc"
};

export function calculateProfit(input: CalculatorInput): CalculationResult {
  const quantity = input.quantity > 0 ? input.quantity : 1;
  const saleMultiplier = clamp(input.saleMultiplier, 0, 1);
  const costPerUnit = input.inputBuyPrice + input.transmuteCost;
  const netSellPerUnit = input.outputSellPrice * saleMultiplier;
  const profitPerUnit = netSellPerUnit - costPerUnit;
  const totalCost = costPerUnit * quantity;
  const totalRevenue = netSellPerUnit * quantity;
  const totalProfit = profitPerUnit * quantity;
  const roiPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const breakEvenSellPrice =
    saleMultiplier > 0 ? costPerUnit / saleMultiplier : Number.POSITIVE_INFINITY;

  return {
    costPerUnit,
    netSellPerUnit,
    profitPerUnit,
    totalCost,
    totalRevenue,
    totalProfit,
    roiPercent,
    breakEvenSellPrice
  };
}

export function getDecision(
  profitPerUnit: number,
  thresholds: Thresholds
): DecisionLevel {
  const normalized = {
    strong: Math.max(0, thresholds.strong),
    playable: Math.max(0, thresholds.playable),
    thin: thresholds.thin
  };

  if (profitPerUnit > normalized.strong) return "Strong";
  if (profitPerUnit >= normalized.playable) return "Playable";
  if (profitPerUnit >= normalized.thin) return "Thin";
  return "Loss";
}

export function findPresetCost(
  presets: PresetCost[],
  from: string,
  to: string
): PresetCost | undefined {
  return presets.find((preset) => preset.from === from && preset.to === to);
}

export function createEmptyPriceBook(): PriceBook {
  return RESOURCE_TYPES.reduce((book, resource) => {
    book[resource] = TIER_LABELS.reduce<Record<string, { buyOrder: string; sellOrder: string }>>((prices, tier) => {
      prices[tier] = { buyOrder: "", sellOrder: "" };
      return prices;
    }, {});
    return book;
  }, {} as PriceBook);
}

export function normalizePriceBook(value: unknown): PriceBook {
  const empty = createEmptyPriceBook();
  if (!value || typeof value !== "object") return empty;

  const maybeBook = value as Partial<Record<ResourceType, Partial<Record<string, unknown>>>>;
  return RESOURCE_TYPES.reduce((book, resource) => {
    TIER_LABELS.forEach((tier) => {
      const stored = maybeBook[resource]?.[tier];
      book[resource][tier] = normalizeOrderBookPrice(stored);
    });
    return book;
  }, empty);
}

export function normalizePresets(value: unknown): PresetCost[] {
  if (!Array.isArray(value)) return DEFAULT_PRESETS;

  return DEFAULT_PRESETS.map((defaultPreset) => {
    const stored = value.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "from" in item &&
        "to" in item &&
        item.from === defaultPreset.from &&
        item.to === defaultPreset.to
    ) as Partial<PresetCost> | undefined;

    return {
      ...defaultPreset,
      cost:
        typeof stored?.cost === "number" && Number.isFinite(stored.cost)
          ? stored.cost
          : defaultPreset.cost
    };
  });
}

export function getSaleMultiplier(settings: ScannerSettings): number {
  if (settings.saleMode === "private") return 0.95;
  const setupFee =
    settings.exitPriceSource === "sellOrder" ? clamp(settings.setupFeePercent, 0, 100) : 0;
  const totalFee = clamp(settings.marketplaceTaxPercent, 0, 100) + setupFee;
  return clamp(1 - totalFee / 100, 0, 1);
}

export function getEntryMultiplier(settings: ScannerSettings): number {
  if (settings.saleMode === "private") return 1;
  const setupFee =
    settings.entryPriceSource === "buyOrder" ? clamp(settings.setupFeePercent, 0, 100) : 0;
  return 1 + setupFee / 100;
}

export function scanTransmutations(
  priceBook: PriceBook,
  presets: PresetCost[],
  saleMultiplier: number,
  entryMultiplier: number,
  stationFeePerUnit = 0,
  entryPriceSource: OrderPriceSide = "sellOrder",
  exitPriceSource: OrderPriceSide = "buyOrder"
): TransmutationScanRow[] {
  const multiplier = clamp(saleMultiplier, 0, 1);
  const inputMultiplier = entryMultiplier > 0 ? entryMultiplier : 1;
  const stationFee = Math.max(0, stationFeePerUnit);

  return RESOURCE_TYPES.flatMap((resource) =>
    TRANSMUTATION_STEPS.map((step) => {
      const preset = findPresetCost(presets, step.from, step.to);
      const fromPrices = normalizeOrderBookPrice(priceBook[resource]?.[step.from]);
      const toPrices = normalizeOrderBookPrice(priceBook[resource]?.[step.to]);
      const inputPrice = parseManualPrice(fromPrices[entryPriceSource]);
      const outputSellPrice = parseManualPrice(toPrices[exitPriceSource]);
      const transmuteCost = preset?.cost ?? 0;
      const missingPrice = inputPrice === undefined || outputSellPrice === undefined;
      const id = `${resource}-${step.from}-${step.to}`;

      if (missingPrice) {
        return {
          id,
          resource,
          from: step.from,
          to: step.to,
          inputPrice,
          transmuteCost,
          stationFeePerUnit: stationFee,
          outputSellPrice,
          missingPrice: true
        };
      }

      const totalCostPerUnit = inputPrice * inputMultiplier + transmuteCost + stationFee;
      const netSellPerUnit = outputSellPrice * multiplier;
      const profitPerUnit = netSellPerUnit - totalCostPerUnit;
      const roiPercent =
        totalCostPerUnit > 0 ? (profitPerUnit / totalCostPerUnit) * 100 : 0;
      const breakEvenSellPrice =
        multiplier > 0 ? totalCostPerUnit / multiplier : Number.POSITIVE_INFINITY;

      return {
        id,
        resource,
        from: step.from,
        to: step.to,
        inputPrice,
        transmuteCost,
        stationFeePerUnit: stationFee,
        outputSellPrice,
        netSellPerUnit,
        profitPerUnit,
        totalCostPerUnit,
        roiPercent,
        breakEvenSellPrice,
        decision: getDecision(profitPerUnit, DEFAULT_THRESHOLDS),
        missingPrice: false
      };
    })
  );
}

export function suggestTarget(from: string): string {
  const parsed = parseTierLabel(from);
  if (!parsed) return "8.3";

  const [tier, enchant] = parsed;
  const nextEnchant = Math.min(enchant + 1, 4);
  return `${tier}.${nextEnchant}`;
}

export function parseTierLabel(label: string): [number, number] | null {
  const match = /^([4-8])\.([0-4])$/.exec(label.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function parseManualPrice(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value.replace(/[^\d]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function normalizePriceString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function normalizeOrderBookPrice(value: unknown): { buyOrder: string; sellOrder: string } {
  if (typeof value === "string" || typeof value === "number") {
    const price = normalizePriceString(value);
    return { buyOrder: price, sellOrder: price };
  }

  if (value && typeof value === "object") {
    const quote = value as Partial<Record<"buy" | "sell" | "buyOrder" | "sellOrder", unknown>>;
    const buyOrder = normalizePriceString(quote.buyOrder ?? quote.buy);
    const sellOrder = normalizePriceString(quote.sellOrder ?? quote.sell);
    const fallback = buyOrder || sellOrder;
    return {
      buyOrder: buyOrder || fallback,
      sellOrder: sellOrder || fallback
    };
  }

  return { buyOrder: "", sellOrder: "" };
}

function buildTierOptions(
  minTier: number,
  maxTier: number,
  minEnchant: number,
  maxEnchant: number
): string[] {
  const options: string[] = [];
  for (let tier = minTier; tier <= maxTier; tier += 1) {
    for (let enchant = minEnchant; enchant <= maxEnchant; enchant += 1) {
      options.push(`${tier}.${enchant}`);
    }
  }
  return options;
}
