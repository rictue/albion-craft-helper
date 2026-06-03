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
   *
   * Quirk: AODP's *_date fields reflect when the price was first observed,
   * not the most recent confirmation. If many players keep scanning the
   * same market without the price changing, AODP dedups silently and the
   * date stays stuck on the original sighting. That makes a "yellow" dot
   * misleading — the price might be confirmed-correct right now even
   * though AODP says the date is 8h old.
   */
  sellDate?: string;
  buyDate?: string;
  /**
   * Our own confirmation timestamps: set to "now" every time a fetch
   * returns a non-zero value for this side, regardless of AODP's date.
   * Cleared on manual edit so user-entered values don't get a false
   * fresh signal. The freshness dot uses max(aodp_date, confirmedAt).
   */
  sellConfirmedAt?: string;
  buyConfirmedAt?: string;
  /**
   * For the cross-city source/target books: which royal city this side's
   * price came from (cheapest for sources, dearest for targets). Lets the
   * chain panel tell you WHERE to buy / sell. Undefined for the plain
   * single-city grid book.
   */
  sellCity?: string;
  buyCity?: string;
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
