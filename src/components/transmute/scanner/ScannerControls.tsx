// Ported from Codex 2026-05-14 transmutation scanner.
import {
  ArrowDownUp,
  ArrowRightLeft,
  Download,
  Filter,
  HandCoins,
  Percent,
  Store
} from "lucide-react";
import type { ReactNode } from "react";
import type { OrderPriceSide, ScannerSettings, SortMode } from "./types";
import { NumberField, SelectField } from "./controls";

interface ScannerControlsProps {
  settings: ScannerSettings;
  saleMultiplier: number;
  totalRows: number;
  completeRows: number;
  profitableRows: number;
  visibleRows: number;
  bestProfit?: number;
  onSettingsChange: (settings: ScannerSettings) => void;
  onExportCsv: () => void;
}

export function ScannerControls({
  settings,
  saleMultiplier,
  totalRows,
  completeRows,
  profitableRows,
  visibleRows,
  bestProfit,
  onSettingsChange,
  onExportCsv
}: ScannerControlsProps) {
  const applyTaxPreset = (profile: "premium" | "normal") => {
    onSettingsChange({
      ...settings,
      taxProfile: profile,
      marketplaceTaxPercent: profile === "premium" ? 4 : 8,
      setupFeePercent: 2.5,
      saleMode: "marketplace"
    });
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Scanner settings</p>
          <h2 className="panel-title">Market rules</h2>
        </div>
        <div className="rounded-md border border-white/10 bg-ash-850 px-3 py-2 text-sm font-black tabular-nums text-oldgold-300">
          x{saleMultiplier.toFixed(3)}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="grid grid-cols-2 gap-2">
          <SaleModeButton
            active={settings.saleMode === "marketplace"}
            label="Marketplace"
            value={`${settings.marketplaceTaxPercent}% tax`}
            icon={<Store size={15} />}
            onClick={() => onSettingsChange({ ...settings, saleMode: "marketplace" })}
          />
          <SaleModeButton
            active={settings.saleMode === "private"}
            label="Private sale"
            value="0.95"
            icon={<HandCoins size={15} />}
            onClick={() => onSettingsChange({ ...settings, saleMode: "private" })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SaleModeButton
            active={settings.taxProfile === "premium"}
            label="Premium"
            value="4% + setup"
            icon={<Percent size={15} />}
            onClick={() => applyTaxPreset("premium")}
          />
          <SaleModeButton
            active={settings.taxProfile === "normal"}
            label="No premium"
            value="8% + setup"
            icon={<Percent size={15} />}
            onClick={() => applyTaxPreset("normal")}
          />
        </div>

        <SelectField
          label="Entry"
          icon={ArrowRightLeft}
          value={settings.entryPriceSource}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              entryPriceSource: event.target.value as OrderPriceSide
            })
          }
        >
          <option value="sellOrder">Instant buy: sell order</option>
          <option value="buyOrder">Buy order</option>
        </SelectField>

        <SelectField
          label="Exit"
          icon={ArrowRightLeft}
          value={settings.exitPriceSource}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              exitPriceSource: event.target.value as OrderPriceSide
            })
          }
        >
          <option value="buyOrder">Instant sell: buy order</option>
          <option value="sellOrder">Sell order</option>
        </SelectField>

        <NumberField
          label="Sales tax %"
          icon={Percent}
          value={String(settings.marketplaceTaxPercent)}
          max={100}
          step={0.1}
          onValueChange={(value) =>
            onSettingsChange({
              ...settings,
              marketplaceTaxPercent: Number(value || 0),
              taxProfile: "custom",
              saleMode: "marketplace"
            })
          }
        />

        <NumberField
          label="Setup fee %"
          icon={Percent}
          value={String(settings.setupFeePercent)}
          max={100}
          step={0.1}
          onValueChange={(value) =>
            onSettingsChange({
              ...settings,
              setupFeePercent: Number(value || 0),
              taxProfile: "custom",
              saleMode: "marketplace"
            })
          }
        />

        <NumberField
          label="Station fee/unit"
          icon={Percent}
          value={String(settings.stationFeePerUnit)}
          step={1}
          onValueChange={(value) =>
            onSettingsChange({
              ...settings,
              stationFeePerUnit: Number(value || 0)
            })
          }
        />

        <SelectField
          label="Sort"
          icon={ArrowDownUp}
          value={settings.sortMode}
          onChange={(event) =>
            onSettingsChange({ ...settings, sortMode: event.target.value as SortMode })
          }
        >
          <option value="profitDesc">Profit high first</option>
          <option value="profitAsc">Profit low first</option>
          <option value="roiDesc">ROI high first</option>
          <option value="resource">Resource order</option>
        </SelectField>

        <button type="button" className="secondary-action" onClick={onExportCsv}>
          <Download size={16} />
          CSV
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Rows" value={`${visibleRows}/${totalRows}`} />
        <Stat label="Complete" value={String(completeRows)} />
        <Stat label="Profitable" value={String(profitableRows)} tone="good" />
        <Stat
          label="Best/unit"
          value={bestProfit === undefined ? "N/A" : formatStat(bestProfit)}
          tone={bestProfit === undefined ? "neutral" : bestProfit < 0 ? "bad" : "good"}
        />
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-ash-950/35 px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-vellum/55">
            <Filter size={14} />
            Profitable only
          </span>
          <input
            type="checkbox"
            checked={settings.onlyProfitable}
            onChange={(event) =>
              onSettingsChange({ ...settings, onlyProfitable: event.target.checked })
            }
            className="h-4 w-4 accent-oldgold-400"
          />
        </label>
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-ash-950/35 px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-vellum/55">
            <Filter size={14} />
            Best route only
          </span>
          <input
            type="checkbox"
            checked={settings.bestRouteOnly}
            onChange={(event) =>
              onSettingsChange({ ...settings, bestRouteOnly: event.target.checked })
            }
            className="h-4 w-4 accent-oldgold-400"
          />
        </label>
      </div>
    </section>
  );
}

interface SaleModeButtonProps {
  active: boolean;
  label: string;
  value: string;
  icon: ReactNode;
  onClick: () => void;
}

function SaleModeButton({ active, label, value, icon, onClick }: SaleModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left transition ${
        active
          ? "border-oldgold-300/70 bg-oldgold-500/20 text-vellum"
          : "border-white/10 bg-ash-850/60 text-vellum/70 hover:border-white/20 hover:text-vellum"
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-black">
        {icon}
        {label}
      </span>
      <span className="text-xs tabular-nums text-vellum/45">{value}</span>
    </button>
  );
}

function Stat({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div className="rounded-md border border-white/10 bg-ash-950/35 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-vellum/42">
        {label}
      </div>
      <div
        className={`mt-0.5 text-lg font-black tabular-nums ${
          tone === "good" ? "text-moss-300" : tone === "bad" ? "text-ember-400" : "text-vellum"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatStat(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(".0", "")}k`;
  return `${Math.round(value)}`;
}
