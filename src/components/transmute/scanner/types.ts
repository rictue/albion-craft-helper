// Ported from Codex 2026-05-14 transmutation scanner.
export type ResourceType = "Wood / Logs" | "Ore" | "Fiber" | "Hide" | "Stone";

export type SaleMode = "marketplace" | "private" | "custom";

export type DecisionLevel = "Strong" | "Playable" | "Thin" | "Loss";

export type ScannerSaleMode = "marketplace" | "private";

export type SortMode = "profitDesc" | "profitAsc" | "roiDesc" | "resource";

export type TaxProfile = "premium" | "normal" | "custom";

export type OrderPriceSide = "buyOrder" | "sellOrder";

export interface OrderBookPrice {
  buyOrder: string;
  sellOrder: string;
  /**
   * ISO timestamps captured from AODP at fetch time — undefined when the
   * user typed the value manually. Used to render per-cell data-age hints
   * so the user can tell which slots are fresh vs days old.
   */
  sellDate?: string;
  buyDate?: string;
}

export type PriceBook = Record<ResourceType, Record<string, OrderBookPrice>>;

export interface CalculatorInput {
  resource: ResourceType;
  from: string;
  to: string;
  inputBuyPrice: number;
  transmuteCost: number;
  outputSellPrice: number;
  quantity: number;
  saleMode: SaleMode;
  saleMultiplier: number;
}

export interface CalculationResult {
  costPerUnit: number;
  netSellPerUnit: number;
  profitPerUnit: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  roiPercent: number;
  breakEvenSellPrice: number;
}

export interface Thresholds {
  strong: number;
  playable: number;
  thin: number;
}

export interface PresetCost {
  id: string;
  from: string;
  to: string;
  cost: number;
}

export interface SavedOpportunity extends CalculatorInput {
  id: string;
  createdAt: number;
}

export interface ScannerSettings {
  saleMode: ScannerSaleMode;
  marketplaceTaxPercent: number;
  setupFeePercent: number;
  stationFeePerUnit: number;
  taxProfile: TaxProfile;
  entryPriceSource: OrderPriceSide;
  exitPriceSource: OrderPriceSide;
  onlyProfitable: boolean;
  bestRouteOnly: boolean;
  sortMode: SortMode;
}

export interface TransmutationScanRow {
  id: string;
  resource: ResourceType;
  from: string;
  to: string;
  inputPrice?: number;
  transmuteCost: number;
  stationFeePerUnit: number;
  outputSellPrice?: number;
  netSellPerUnit?: number;
  profitPerUnit?: number;
  totalCostPerUnit?: number;
  roiPercent?: number;
  breakEvenSellPrice?: number;
  decision?: DecisionLevel;
  missingPrice: boolean;
}
