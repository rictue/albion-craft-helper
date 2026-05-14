// Ported from Codex 2026-05-14 transmutation scanner.
import { Boxes, Gem } from "lucide-react";
import type { OrderPriceSide, PriceBook, ResourceType } from "./types";
import { RESOURCE_TYPES } from "./calculations";

const TIERS = [4, 5, 6, 7, 8];
const ENCHANTS = [0, 1, 2, 3, 4];

interface PriceMatrixProps {
  priceBook: PriceBook;
  activeResource: ResourceType;
  onActiveResourceChange: (resource: ResourceType) => void;
  onPriceChange: (resource: ResourceType, tier: string, side: OrderPriceSide, value: string) => void;
}

export function PriceMatrix({
  priceBook,
  activeResource,
  onActiveResourceChange,
  onPriceChange
}: PriceMatrixProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Manual prices</p>
          <h2 className="panel-title">Resource price matrix</h2>
        </div>
        <Boxes className="text-oldgold-300" size={24} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {RESOURCE_TYPES.map((resource) => {
          const filled = Object.values(priceBook[resource]).reduce(
            (total, price) =>
              total + Number(Boolean(price.buyOrder)) + Number(Boolean(price.sellOrder)),
            0
          );
          const active = activeResource === resource;

          return (
            <button
              key={resource}
              type="button"
              onClick={() => onActiveResourceChange(resource)}
              className={`rounded-md border px-3 py-2 text-left transition ${
                active
                  ? "border-oldgold-300/70 bg-oldgold-500/20 text-vellum"
                  : "border-white/10 bg-ash-850/60 text-vellum/70 hover:border-white/20 hover:text-vellum"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-black">
                <Gem size={14} className={active ? "text-oldgold-300" : "text-vellum/35"} />
                {resource}
              </span>
              <span className="text-xs tabular-nums text-vellum/45">{filled}/50</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] rounded-md border border-white/10 bg-ash-950/35 p-2">
          <div className="grid grid-cols-[64px_repeat(5,minmax(128px,1fr))] gap-2">
            <div />
            {ENCHANTS.map((enchant) => (
              <div
                key={enchant}
                className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-vellum/45"
              >
                .{enchant}
              </div>
            ))}

            {TIERS.map((tier) => (
              <PriceRow
                key={tier}
                tier={tier}
                activeResource={activeResource}
                priceBook={priceBook}
                onPriceChange={onPriceChange}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface PriceRowProps {
  tier: number;
  activeResource: ResourceType;
  priceBook: PriceBook;
  onPriceChange: (resource: ResourceType, tier: string, side: OrderPriceSide, value: string) => void;
}

function PriceRow({ tier, activeResource, priceBook, onPriceChange }: PriceRowProps) {
  return (
    <>
      <div className="flex items-center rounded-md border border-white/10 bg-ash-850/80 px-3 text-sm font-black text-oldgold-300">
        T{tier}
      </div>
      {ENCHANTS.map((enchant) => {
        const label = `${tier}.${enchant}`;

        return (
          <label
            key={label}
            className="rounded-md border border-white/10 bg-ash-900/65 px-2 py-2 transition focus-within:border-oldgold-300/60"
          >
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-vellum/45">
              {label}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <PriceInput
                label="Sell order"
                value={priceBook[activeResource][label].sellOrder}
                ariaLabel={`${activeResource} ${label} sell order price`}
                onChange={(value) => onPriceChange(activeResource, label, "sellOrder", value)}
              />
              <PriceInput
                label="Buy order"
                value={priceBook[activeResource][label].buyOrder}
                ariaLabel={`${activeResource} ${label} buy order price`}
                onChange={(value) => onPriceChange(activeResource, label, "buyOrder", value)}
              />
            </div>
          </label>
        );
      })}
    </>
  );
}

interface PriceInputProps {
  label: string;
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}

function PriceInput({ label, value, ariaLabel, onChange }: PriceInputProps) {
  return (
    <label className="min-w-0">
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-vellum/35">
        {label}
      </span>
      <input
        aria-label={ariaLabel}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={formatInputPrice(value)}
        onChange={(event) => {
          const sanitized = sanitizePrice(event.target.value);
          if (sanitized !== null) onChange(sanitized);
        }}
        placeholder=""
        className="w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums text-vellum outline-none placeholder:text-vellum/18"
      />
    </label>
  );
}

function sanitizePrice(value: string): string | null {
  const normalized = value.replace(/[^\d]/g, "");
  if (normalized === "") return "";
  if (normalized.includes("-")) return "0";
  if (!/^\d*$/.test(normalized)) return null;
  return normalized;
}

function formatInputPrice(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
