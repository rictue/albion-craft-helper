// Ported from Codex 2026-05-14 transmutation scanner.
import { RotateCcw, ScrollText } from "lucide-react";
import type { PresetCost } from "./types";
import { DEFAULT_PRESETS } from "./calculations";
import { NumberField } from "./controls";

interface PresetCostsEditorProps {
  presets: PresetCost[];
  onChange: (presets: PresetCost[]) => void;
}

export function PresetCostsEditor({ presets, onChange }: PresetCostsEditorProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Editable defaults</p>
          <h2 className="panel-title">Preset costs</h2>
          <p className="mt-1 text-xs text-vellum/45">{presets.length} routes loaded</p>
        </div>
        <button
          type="button"
          className="icon-action"
          aria-label="Reset presets"
          title="Reset presets"
          onClick={() => onChange(DEFAULT_PRESETS)}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="grid max-h-[760px] gap-2 overflow-y-auto pr-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {presets.map((preset) => (
          <div key={preset.id} className="preset-row">
            <div className="flex min-w-20 items-center gap-2 text-sm font-black text-vellum">
              <ScrollText size={15} className="text-oldgold-300" />
              {preset.from}
              {" -> "}
              {preset.to}
            </div>
            <NumberField
              aria-label={`${preset.from} to ${preset.to} preset cost`}
              label="Cost"
              value={String(preset.cost)}
              onValueChange={(value) =>
                onChange(
                  presets.map((item) =>
                    item.id === preset.id ? { ...item, cost: Number(value || 0) } : item
                  )
                )
              }
              className="min-w-0 flex-1"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
