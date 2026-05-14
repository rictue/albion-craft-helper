// Ported from Codex 2026-05-14 transmutation scanner.
import type {
  CalculatorInput,
  SavedOpportunity,
  Thresholds,
  TransmutationScanRow
} from "./types";
import { calculateProfit, getDecision } from "./calculations";

const wholeNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const decimalNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "N/A";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000) return `${sign}${trimDecimal(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${trimDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trimDecimal(abs / 1_000)}k`;
  return `${sign}${wholeNumber.format(abs)}`;
}

export function formatSilver(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return wholeNumber.format(Math.round(value));
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${decimalNumber.format(value)}%`;
}

export function summarizeResult(input: CalculatorInput): string {
  const result = calculateProfit(input);
  return [
    "Albion Transmutation Profit",
    `${input.resource}: ${input.from} -> ${input.to}`,
    `Buy/unit: ${formatSilver(input.inputBuyPrice)}`,
    `Transmute/unit: ${formatSilver(input.transmuteCost)}`,
    `Sell/unit: ${formatSilver(input.outputSellPrice)}`,
    `Multiplier: ${input.saleMultiplier}`,
    `Quantity: ${formatSilver(input.quantity)}`,
    `Profit/unit: ${formatSilver(result.profitPerUnit)}`,
    `Total profit: ${formatSilver(result.totalProfit)}`,
    `ROI: ${formatPercent(result.roiPercent)}`,
    `Break-even sell: ${formatSilver(result.breakEvenSellPrice)}`
  ].join("\n");
}

export function opportunitiesToCsv(
  opportunities: SavedOpportunity[],
  thresholds: Thresholds
): string {
  const headers = [
    "Resource",
    "From",
    "To",
    "Buy",
    "Transmute",
    "Sell",
    "Quantity",
    "Multiplier",
    "Net Profit / Unit",
    "Total Profit",
    "ROI %",
    "Decision"
  ];

  const rows = opportunities.map((opportunity) => {
    const result = calculateProfit(opportunity);
    return [
      opportunity.resource,
      opportunity.from,
      opportunity.to,
      opportunity.inputBuyPrice,
      opportunity.transmuteCost,
      opportunity.outputSellPrice,
      opportunity.quantity,
      opportunity.saleMultiplier,
      Math.round(result.profitPerUnit),
      Math.round(result.totalProfit),
      Number(result.roiPercent.toFixed(2)),
      getDecision(result.profitPerUnit, thresholds)
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function scannerRowsToCsv(rows: TransmutationScanRow[]): string {
  const headers = [
    "Resource type",
    "From",
    "To",
    "Input price",
    "Transmute cost",
    "Station fee / unit",
    "Output sell price",
    "Net sell after tax",
    "Profit / unit",
    "ROI %",
    "Break-even price",
    "Decision"
  ];

  const csvRows = rows.map((row) => [
    row.resource,
    row.from,
    row.to,
    row.inputPrice ?? "missing price",
    row.transmuteCost,
    row.stationFeePerUnit,
    row.outputSellPrice ?? "missing price",
    row.netSellPerUnit === undefined ? "missing price" : Math.round(row.netSellPerUnit),
    row.profitPerUnit === undefined ? "missing price" : Math.round(row.profitPerUnit),
    row.roiPercent === undefined ? "missing price" : Number(row.roiPercent.toFixed(2)),
    row.breakEvenSellPrice === undefined
      ? "missing price"
      : Math.round(row.breakEvenSellPrice),
    row.decision ?? "Missing price"
  ]);

  return [headers, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function trimDecimal(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
}

function csvCell(value: string | number): string {
  const cell = String(value);
  if (!/[",\n]/.test(cell)) return cell;
  return `"${cell.split('"').join('""')}"`;
}
