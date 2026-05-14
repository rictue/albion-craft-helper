// Ported from Codex 2026-05-14 transmutation scanner.
import type { ResourceType, ScannerSettings, TransmutationScanRow } from "./types";
import { formatCompact, formatPercent } from "./format";
import { DecisionBadge } from "./DecisionBadge";

interface QuickResultsProps {
  resource: ResourceType;
  rows: TransmutationScanRow[];
  settings: ScannerSettings;
}

export function QuickResults({ resource, rows, settings }: QuickResultsProps) {
  const completeRows = pickBestRoutesForResource(
    rows.filter((row) => row.resource === resource),
    settings.bestRouteOnly
  )
    .filter((row) => !row.missingPrice)
    .sort((a, b) => (b.profitPerUnit ?? 0) - (a.profitPerUnit ?? 0))
    .slice(0, 6);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live rows</p>
          <h2 className="panel-title">{resource}</h2>
        </div>
        <div className="rounded-md border border-white/10 bg-ash-850 px-3 py-2 text-sm font-black tabular-nums text-vellum/70">
          {completeRows.length} calculated
        </div>
      </div>

      {completeRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 bg-ash-950/35 px-4 py-5 text-center text-sm text-vellum/50">
          No complete rows yet.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {completeRows.map((row) => {
            const isLoss = (row.profitPerUnit ?? 0) < 0;
            const scenarioRows = buildScenarios(row, settings.setupFeePercent);

            return (
              <div
                key={row.id}
                className="rounded-md border border-white/10 bg-ash-950/35 px-3 py-2"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-oldgold-300">
                    {row.from}
                    {" -> "}
                    {row.to}
                  </div>
                  {row.decision ? <DecisionBadge decision={row.decision} /> : null}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <QuickMetric label="Input" value={formatCompact(row.inputPrice ?? 0)} />
                  <QuickMetric label="Output" value={formatCompact(row.outputSellPrice ?? 0)} />
                  <QuickMetric
                    label="Profit"
                    value={formatCompact(row.profitPerUnit ?? 0)}
                    tone={isLoss ? "bad" : "good"}
                  />
                  <QuickMetric label="Net" value={formatCompact(row.netSellPerUnit ?? 0)} />
                  <QuickMetric label="Cost" value={formatCompact(row.totalCostPerUnit ?? 0)} />
                  <QuickMetric label="ROI" value={formatPercent(row.roiPercent ?? 0)} />
                  <QuickMetric label="Transmute" value={formatCompact(row.transmuteCost)} />
                  <QuickMetric label="Station" value={formatCompact(row.stationFeePerUnit)} />
                </div>
                <div className="mt-3 border-t border-white/10 pt-2">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-vellum/35">
                    Fee reality check
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {scenarioRows.map((scenario) => (
                      <div
                        key={scenario.label}
                        className="flex items-center justify-between gap-2 rounded border border-white/8 bg-ash-900/60 px-2 py-1"
                      >
                        <span className="truncate text-vellum/50">{scenario.label}</span>
                        <span
                          className={`font-black tabular-nums ${
                            scenario.profit < 0 ? "text-ember-400" : "text-moss-300"
                          }`}
                        >
                          {formatCompact(scenario.profit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function pickBestRoutesForResource(rows: TransmutationScanRow[], bestRouteOnly: boolean) {
  if (!bestRouteOnly) return rows;

  const bestByTarget = new Map<string, TransmutationScanRow>();
  rows.forEach((row) => {
    const current = bestByTarget.get(row.to);
    if (!current) {
      bestByTarget.set(row.to, row);
      return;
    }

    if (current.missingPrice && !row.missingPrice) {
      bestByTarget.set(row.to, row);
      return;
    }

    if (!current.missingPrice && row.missingPrice) return;

    const rowProfit = row.profitPerUnit ?? Number.NEGATIVE_INFINITY;
    const currentProfit = current.profitPerUnit ?? Number.NEGATIVE_INFINITY;
    if (rowProfit > currentProfit) bestByTarget.set(row.to, row);
  });

  return Array.from(bestByTarget.values());
}

function buildScenarios(row: TransmutationScanRow, setupFeePercent: number) {
  const input = row.inputPrice ?? 0;
  const output = row.outputSellPrice ?? 0;
  const cost = input + row.transmuteCost + row.stationFeePerUnit;
  const setup = Math.max(0, setupFeePercent);

  return [
    {
      label: "Prem instant",
      profit: output * 0.96 - cost
    },
    {
      label: "Prem sell order",
      profit: output * (1 - (4 + setup) / 100) - cost
    },
    {
      label: "No prem instant",
      profit: output * 0.92 - cost
    },
    {
      label: "No prem sell order",
      profit: output * (1 - (8 + setup) / 100) - cost
    }
  ];
}

function QuickMetric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-vellum/35">
        {label}
      </div>
      <div
        className={`truncate text-sm font-black tabular-nums ${
          tone === "good" ? "text-moss-300" : tone === "bad" ? "text-ember-400" : "text-vellum"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
