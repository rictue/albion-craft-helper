/**
 * Side panel for the "I'll place buy orders" workflow.
 *
 * For every (resource, transmute step) pair we know the output sell price
 * for and have a transmute cost, we solve for the highest buy-order price
 * the player can post on the INPUT and still profit after transmute +
 * sale fees:
 *
 *   maxBuyOrderPrice = (outputPrice × saleMult − transmuteCost − targetProfit)
 *                    / (1 + setupFee)
 *
 *   where setupFee = 0.025 (always — you're posting a buy order)
 *         saleMult = follows the user's exit-side fee settings.
 *
 * We then compare maxBuyOrderPrice against:
 *   - the current top buy order on the same input (must beat it to sit
 *     at the head of the queue and get filled first), and
 *   - the current cheapest sell order on the same input (must be below
 *     it; otherwise instant-buying is cheaper than waiting).
 *
 * Rows are sorted by "room to bid" = maxBuyOrderPrice − current top buy.
 */

import { useEffect, useMemo, useState } from "react";
import { Coins, TrendingUp } from "lucide-react";
import type { PriceBook, PresetCost, ResourceType } from "./types";
import { RESOURCE_TYPES, TRANSMUTATION_STEPS } from "./calculations";
import { getSaleMultiplier } from "../../../utils/marketFees";
import type { MarketFeeSettings } from "../../../utils/marketFees";

interface BuyOrderOpportunitiesProps {
  priceBook: PriceBook;
  presets: PresetCost[];
  feeSettings: MarketFeeSettings;
}

interface OpportunityRow {
  id: string;
  resource: ResourceType;
  from: string;
  to: string;
  outputPrice: number;
  transmuteCost: number;
  maxBuyOrderPrice: number;
  currentTopBuy: number;
  currentLowSell: number;
  /** Profit per unit if the buy fills at the recommended price. */
  profitAtRecommended: number;
  recommended: number;
  status: "strong" | "tight" | "blocked";
}

const SETUP_FEE = 0.025;
const ONE_HOUR = 3_600_000;

function parseManualNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function BuyOrderOpportunities({
  priceBook,
  presets,
  feeSettings,
}: BuyOrderOpportunitiesProps) {
  const [targetProfit, setTargetProfit] = useState<number>(2000);
  const [resourceFilter, setResourceFilter] = useState<ResourceType | "all">("all");
  const [maxAgeHours, setMaxAgeHours] = useState<number>(24);
  // "now" snapshot updated every minute — Date.now() inside render trips
  // react-hooks/purity, so we own it as state and tick it on an interval.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const saleMult = getSaleMultiplier(feeSettings);

  const rows = useMemo<OpportunityRow[]>(() => {
    const presetByKey = new Map<string, number>();
    for (const p of presets) presetByKey.set(`${p.from}-${p.to}`, p.cost);

    const ageCutoff = maxAgeHours > 0 ? now - maxAgeHours * ONE_HOUR : 0;
    const out: OpportunityRow[] = [];

    for (const resource of RESOURCE_TYPES) {
      if (resourceFilter !== "all" && resource !== resourceFilter) continue;
      const bookForResource = priceBook[resource];
      if (!bookForResource) continue;

      for (const step of TRANSMUTATION_STEPS) {
        const transmuteCost = presetByKey.get(`${step.from}-${step.to}`);
        if (!transmuteCost || transmuteCost <= 0) continue;

        const outputCell = bookForResource[step.to];
        const inputCell  = bookForResource[step.from];
        if (!outputCell || !inputCell) continue;

        // Output exit price — use the side the user said they'll sell into.
        const outputPriceStr = feeSettings.exitSource === "sellOrder"
          ? outputCell.sellOrder
          : outputCell.buyOrder;
        const outputPrice = parseManualNumber(outputPriceStr);
        if (outputPrice <= 0) continue;

        // Stale-output filter: if the user only trusts data <N hours old,
        // skip cells where the relevant output side is too stale.
        if (ageCutoff > 0) {
          const dateStr = feeSettings.exitSource === "sellOrder"
            ? (outputCell.sellConfirmedAt ?? outputCell.sellDate)
            : (outputCell.buyConfirmedAt ?? outputCell.buyDate);
          if (dateStr) {
            const t = Date.parse(dateStr);
            if (Number.isFinite(t) && t < ageCutoff) continue;
          } else {
            // No confirmation timestamp — treat manual entries as fresh.
          }
        }

        const maxBuyOrderPrice = Math.floor(
          (outputPrice * saleMult - transmuteCost - targetProfit) / (1 + SETUP_FEE)
        );
        if (maxBuyOrderPrice <= 0) continue;

        const currentTopBuy = parseManualNumber(inputCell.buyOrder);
        const currentLowSell = parseManualNumber(inputCell.sellOrder);

        // Recommended bid: one silver above the current top buy (to be at
        // the head of the queue), but never above our profit ceiling.
        const recommended = currentTopBuy > 0
          ? Math.min(maxBuyOrderPrice, currentTopBuy + 1)
          : maxBuyOrderPrice;

        const profitAtRecommended = Math.floor(
          outputPrice * saleMult - transmuteCost - recommended * (1 + SETUP_FEE)
        );

        let status: OpportunityRow["status"];
        const beatsTopBuy = currentTopBuy === 0 || maxBuyOrderPrice > currentTopBuy;
        const underLowSell = currentLowSell === 0 || maxBuyOrderPrice < currentLowSell;
        if (beatsTopBuy && underLowSell) status = "strong";
        else if (beatsTopBuy || underLowSell) status = "tight";
        else status = "blocked";

        out.push({
          id: `${resource}-${step.from}-${step.to}`,
          resource,
          from: step.from,
          to: step.to,
          outputPrice,
          transmuteCost,
          maxBuyOrderPrice,
          currentTopBuy,
          currentLowSell,
          profitAtRecommended,
          recommended,
          status,
        });
      }
    }

    return out
      .sort((a, b) => {
        const rank = (r: OpportunityRow) =>
          r.status === "strong" ? 0 : r.status === "tight" ? 1 : 2;
        const rankDelta = rank(a) - rank(b);
        if (rankDelta !== 0) return rankDelta;
        return b.profitAtRecommended - a.profitAtRecommended;
      })
      .slice(0, 50);
  }, [priceBook, presets, feeSettings, saleMult, targetProfit, resourceFilter, maxAgeHours, now]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Buy-order strategy</p>
          <h2 className="panel-title">Where to bid</h2>
          <p className="mt-1 text-xs text-vellum/45">
            Max buy-order price you can post on the input and still hit your profit target after transmute + tax.
          </p>
        </div>
        <Coins className="text-oldgold-300" size={22} />
      </div>

      {/* Controls */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Target profit
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={targetProfit.toLocaleString("de-DE")}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "");
              setTargetProfit(digits === "" ? 0 : Number(digits));
            }}
            className="w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums text-vellum outline-none"
          />
        </label>
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Resource
          </span>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value as ResourceType | "all")}
            className="w-full border-0 bg-transparent p-0 text-xs font-bold text-vellum outline-none"
            style={{ colorScheme: "dark" }}
          >
            <option value="all" style={{ backgroundColor: "#17100a", color: "#f3ead2" }}>All</option>
            {RESOURCE_TYPES.map((r) => (
              <option key={r} value={r} style={{ backgroundColor: "#17100a", color: "#f3ead2" }}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block rounded border border-white/10 bg-ash-950/35 px-2 py-1.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-vellum/45">
            Max age (h)
          </span>
          <input
            type="number"
            min={0}
            max={168}
            value={maxAgeHours}
            onChange={(e) => setMaxAgeHours(Math.max(0, Number(e.target.value) || 0))}
            className="w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums text-vellum outline-none"
          />
        </label>
      </div>

      {/* Result list */}
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 bg-ash-950/35 px-4 py-6 text-center text-sm text-vellum/55">
          <TrendingUp size={18} className="mx-auto mb-2 text-vellum/40" />
          No profitable buy-order opportunities at this target.<br />
          Lower the target profit, expand resources, or fetch fresh prices first.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
          {rows.map((row) => (
            <OpportunityCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <div className="mt-3 text-[10px] text-vellum/40 leading-snug">
        Math assumes 2.5% buy-order setup fee on the input and your current Market Fees for the output sale. Recommended bid is current top buy +1 silver, capped at the profit ceiling.
      </div>
    </section>
  );
}

function OpportunityCard({ row }: { row: OpportunityRow }) {
  const statusStyle =
    row.status === "strong"
      ? "border-moss-300/50 bg-moss-500/10"
      : row.status === "tight"
        ? "border-oldgold-300/40 bg-oldgold-500/10"
        : "border-ember-400/40 bg-ember-500/10";

  return (
    <div className={`rounded border ${statusStyle} px-2.5 py-2`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-black text-vellum truncate">
          {row.resource}
          <span className="text-oldgold-300 ml-1">{row.from} → {row.to}</span>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
            row.status === "strong"
              ? "text-moss-300"
              : row.status === "tight"
                ? "text-oldgold-300"
                : "text-ember-400"
          }`}
        >
          {row.status === "strong" ? "OK to bid" : row.status === "tight" ? "Tight" : "Blocked"}
        </span>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
        <div className="text-vellum/55">Place buy ≤</div>
        <div className="text-right font-black text-moss-300 tabular-nums">
          {row.maxBuyOrderPrice.toLocaleString("de-DE")}
        </div>

        <div className="text-vellum/55">Recommended bid</div>
        <div className="text-right font-bold text-vellum tabular-nums">
          {row.recommended.toLocaleString("de-DE")}
        </div>

        <div className="text-vellum/55">Profit/unit if filled</div>
        <div className="text-right font-bold tabular-nums text-moss-300">
          +{row.profitAtRecommended.toLocaleString("de-DE")}
        </div>

        <div className="text-vellum/40 text-[10px]">Current top buy</div>
        <div className="text-right text-vellum/55 tabular-nums text-[10px]">
          {row.currentTopBuy > 0 ? row.currentTopBuy.toLocaleString("de-DE") : "—"}
        </div>

        <div className="text-vellum/40 text-[10px]">Current low sell</div>
        <div className="text-right text-vellum/55 tabular-nums text-[10px]">
          {row.currentLowSell > 0 ? row.currentLowSell.toLocaleString("de-DE") : "—"}
        </div>
      </div>
    </div>
  );
}
