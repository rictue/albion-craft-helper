// Ported from Codex 2026-05-14 transmutation scanner.
import type { ReactNode } from "react";
import type { TransmutationScanRow } from "./types";
import { formatCompact, formatPercent } from "./format";
import { DecisionBadge } from "./DecisionBadge";

interface ScannerResultsTableProps {
  rows: TransmutationScanRow[];
}

export function ScannerResultsTable({ rows }: ScannerResultsTableProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Auto scan</p>
          <h2 className="panel-title">Transmutation results</h2>
        </div>
        <div className="rounded-md border border-white/10 bg-ash-850 px-3 py-2 text-sm font-black tabular-nums text-vellum/70">
          {rows.length} rows
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto rounded-md border border-white/10">
        <table className="min-w-[1240px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-ash-900">
            <tr className="text-[11px] uppercase tracking-[0.12em] text-vellum/45">
              <Th>Resource type</Th>
              <Th>From</Th>
              <Th>To</Th>
              <Th>Input price</Th>
              <Th>Transmute cost</Th>
              <Th>Station fee</Th>
              <Th>Output sell price</Th>
              <Th>Net sell after tax</Th>
              <Th>Profit/unit</Th>
              <Th>ROI %</Th>
              <Th>Break-even price</Th>
              <Th>Decision</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-vellum/50">
                  No rows match the current filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => <ResultRow key={row.id} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultRow({ row }: { row: TransmutationScanRow }) {
  const isLoss = (row.profitPerUnit ?? 0) < 0;
  const isProfitable = (row.profitPerUnit ?? 0) > 0;

  return (
    <tr className="group">
      <Td className="font-bold text-vellum">{row.resource}</Td>
      <Td className="font-black text-oldgold-300">{row.from}</Td>
      <Td className="font-black text-oldgold-300">{row.to}</Td>
      <Td>{formatMaybe(row.inputPrice)}</Td>
      <Td>{formatCompact(row.transmuteCost)}</Td>
      <Td>{formatCompact(row.stationFeePerUnit)}</Td>
      <Td>{formatMaybe(row.outputSellPrice)}</Td>
      <Td>{formatMaybe(row.netSellPerUnit)}</Td>
      <Td className={isLoss ? "text-ember-400" : isProfitable ? "text-moss-300" : ""}>
        {formatMaybe(row.profitPerUnit)}
      </Td>
      <Td className={isLoss ? "text-ember-400" : isProfitable ? "text-moss-300" : ""}>
        {row.roiPercent === undefined ? "missing price" : formatPercent(row.roiPercent)}
      </Td>
      <Td>{row.breakEvenSellPrice === undefined ? "missing price" : formatCompact(row.breakEvenSellPrice)}</Td>
      <Td>
        {row.decision ? <DecisionBadge decision={row.decision} /> : <MissingBadge />}
      </Td>
    </tr>
  );
}

function MissingBadge() {
  return (
    <span className="inline-flex min-w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-vellum/45">
      Missing price
    </span>
  );
}

function formatMaybe(value: number | undefined): string {
  return value === undefined ? "missing price" : formatCompact(value);
}

function Th({ children }: { children?: ReactNode }) {
  return <th className="border-b border-white/10 px-3 py-3 font-bold">{children}</th>;
}

function Td({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-white/5 px-3 py-3 tabular-nums text-vellum/70 group-hover:bg-white/[0.025] ${className}`}
    >
      {children}
    </td>
  );
}
