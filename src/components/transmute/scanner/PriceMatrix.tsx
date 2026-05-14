// Ported from Codex 2026-05-14 transmutation scanner.
import { useState } from "react";
import { Boxes, Gem, Loader2, RefreshCw } from "lucide-react";
import type { OrderPriceSide, PriceBook, ResourceType } from "./types";
import { RESOURCE_TYPES } from "./calculations";
import { SCANNER_CITIES } from "./fetchAODPPrices";

const TIERS = [4, 5, 6, 7, 8];
const ENCHANTS = [0, 1, 2, 3, 4];

type ViewMode = "both" | "sell" | "buy";

interface PriceMatrixProps {
  priceBook: PriceBook;
  activeResource: ResourceType;
  onActiveResourceChange: (resource: ResourceType) => void;
  onPriceChange: (resource: ResourceType, tier: string, side: OrderPriceSide, value: string) => void;
  /** Auto-fill from AODP. */
  fetchCity: string;
  onFetchCityChange: (city: string) => void;
  onFetchLivePrices: () => void;
  isFetching: boolean;
  /** Last fetch summary — null if never fetched. */
  lastFetch?: {
    filledSells: number;
    filledBuys: number;
    totalCells: number;
    city: string;
    fetchedAt: number;
    staleness?: {
      oldestAgeMs: number;
      freshestAgeMs: number;
      medianAgeMs: number;
      fresh: number;
      recent: number;
      stale: number;
    };
  } | null;
  fetchError?: string | null;
}

export function PriceMatrix({
  priceBook,
  activeResource,
  onActiveResourceChange,
  onPriceChange,
  fetchCity,
  onFetchCityChange,
  onFetchLivePrices,
  isFetching,
  lastFetch,
  fetchError,
}: PriceMatrixProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Manual prices</p>
          <h2 className="panel-title">Resource price matrix</h2>
        </div>
        <Boxes className="text-oldgold-300" size={24} />
      </div>

      {/* AODP auto-fill row */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-ash-950/35 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-vellum/55">
          Auto-fill from AODP
        </span>
        <select
          value={fetchCity}
          onChange={(e) => onFetchCityChange(e.target.value)}
          className="rounded border border-white/10 bg-ash-900 px-2 py-1 text-xs font-bold text-vellum focus:border-oldgold-300/60 focus:outline-none"
          disabled={isFetching}
        >
          {SCANNER_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onFetchLivePrices}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded border border-oldgold-300/45 bg-oldgold-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-oldgold-300 transition hover:border-oldgold-300/70 hover:bg-oldgold-500/25 disabled:opacity-60"
        >
          {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {isFetching ? 'Fetching…' : 'Fetch live prices'}
        </button>
        <div className="ml-auto flex flex-col items-end gap-0.5 text-[10px] tabular-nums">
          {fetchError ? (
            <span className="text-ember-400">{fetchError}</span>
          ) : lastFetch ? (
            <>
              <div className="text-vellum/45">
                <span className="text-moss-300 font-bold">{lastFetch.filledSells}</span>
                <span className="text-vellum/55"> sells</span>
                <span className="text-vellum/30"> · </span>
                <span className={`font-bold ${lastFetch.filledBuys === 0 ? 'text-ember-400' : 'text-moss-300'}`}>
                  {lastFetch.filledBuys}
                </span>
                <span className="text-vellum/55"> buys</span>
                <span className="text-vellum/30"> / {lastFetch.totalCells} cells</span>
                <span className="text-vellum/30"> · </span>
                <span>{lastFetch.city} · {formatAge(lastFetch.fetchedAt)}</span>
              </div>
              {lastFetch.staleness && (
                <div className="text-vellum/45">
                  <span className="text-vellum/55">AODP data: </span>
                  <span className="text-moss-300 font-bold">{lastFetch.staleness.fresh}</span>
                  <span className="text-vellum/45"> &lt;1h </span>
                  <span className="text-vellum/30">·</span>
                  <span className="text-oldgold-300 font-bold"> {lastFetch.staleness.recent}</span>
                  <span className="text-vellum/45"> 1-24h </span>
                  <span className="text-vellum/30">·</span>
                  <span className={`font-bold ${lastFetch.staleness.stale > 0 ? 'text-ember-400' : 'text-vellum/55'}`}> {lastFetch.staleness.stale}</span>
                  <span className="text-vellum/45"> &gt;24h </span>
                  <span className="text-vellum/30">·</span>
                  <span className="text-vellum/55"> median </span>
                  <span className="text-vellum">{formatDuration(lastFetch.staleness.medianAgeMs)}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-vellum/45">125 cells × 5 resources — buy orders are rarer in AODP than sells.</span>
          )}
        </div>
      </div>

      {/* Resource selector */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* View-mode toggle + legend */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-vellum/45">
          View
        </span>
        <div className="inline-flex rounded-md border border-white/10 bg-ash-950/45 p-0.5">
          {(["both", "sell", "buy"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                viewMode === m
                  ? "bg-oldgold-500/25 text-oldgold-300"
                  : "text-vellum/55 hover:text-vellum"
              }`}
            >
              {m === "both" ? "Both" : m === "sell" ? "Sell only" : "Buy only"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] font-bold">
          {viewMode === "both" && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400/80" />
                <span className="text-rose-300/85">Sell</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
                <span className="text-emerald-300/85">Buy</span>
              </span>
              <span className="text-vellum/15">|</span>
            </>
          )}
          <span className="flex items-center gap-1" title="AODP data fresher than 1 hour">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-vellum/55 normal-case tracking-normal">&lt;1h</span>
          </span>
          <span className="flex items-center gap-1" title="AODP data 1-24 hours old">
            <span className="w-1.5 h-1.5 rounded-full bg-oldgold-300" />
            <span className="text-vellum/55 normal-case tracking-normal">1-24h</span>
          </span>
          <span className="flex items-center gap-1" title="AODP data older than 24 hours">
            <span className="w-1.5 h-1.5 rounded-full bg-ember-400" />
            <span className="text-vellum/55 normal-case tracking-normal">&gt;24h</span>
          </span>
          <span className="flex items-center gap-1" title="You typed this value manually">
            <span className="w-1.5 h-1.5 rounded-full bg-oldgold-300/55" />
            <span className="text-vellum/55 normal-case tracking-normal">manual</span>
          </span>
        </div>
      </div>

      {/* Price grid */}
      <div className="overflow-x-auto">
        <div className={`rounded-md border border-white/10 bg-ash-950/35 p-2 ${
          viewMode === "both" ? "min-w-[820px]" : "min-w-[640px]"
        }`}>
          <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] gap-1.5">
            {/* Header: blank corner + .0 .1 .2 .3 .4 */}
            <div />
            {ENCHANTS.map((enchant) => (
              <div
                key={enchant}
                className="px-1 pb-1 text-center text-[11px] font-black uppercase tracking-[0.14em] text-oldgold-300/70"
              >
                .{enchant}
              </div>
            ))}

            {/* Body rows */}
            {TIERS.map((tier) => (
              <PriceRow
                key={tier}
                tier={tier}
                activeResource={activeResource}
                priceBook={priceBook}
                onPriceChange={onPriceChange}
                viewMode={viewMode}
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
  viewMode: ViewMode;
}

function PriceRow({ tier, activeResource, priceBook, onPriceChange, viewMode }: PriceRowProps) {
  return (
    <>
      <div className="flex items-center justify-center rounded border border-oldgold-300/25 bg-oldgold-500/10 px-2 text-sm font-black text-oldgold-300">
        T{tier}
      </div>
      {ENCHANTS.map((enchant) => {
        const label = `${tier}.${enchant}`;
        const cell = priceBook[activeResource][label];
        const hasAny = !!(cell.sellOrder || cell.buyOrder);
        const ageBadge = freshestBadge(cell);

        return (
          <div
            key={label}
            className={`rounded border transition ${
              hasAny
                ? "border-oldgold-300/25 bg-ash-900/70"
                : "border-white/8 bg-ash-950/40"
            }`}
          >
            <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-vellum/45">
                {label}
              </span>
              {hasAny && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${ageBadge.color}`}
                  title={ageBadge.title}
                />
              )}
            </div>

            {viewMode === "both" ? (
              <div className="grid grid-cols-2 divide-x divide-white/5">
                <PriceCell
                  side="sell"
                  value={cell.sellOrder}
                  ariaLabel={`${activeResource} ${label} sell order price`}
                  onChange={(v) => onPriceChange(activeResource, label, "sellOrder", v)}
                />
                <PriceCell
                  side="buy"
                  value={cell.buyOrder}
                  ariaLabel={`${activeResource} ${label} buy order price`}
                  onChange={(v) => onPriceChange(activeResource, label, "buyOrder", v)}
                />
              </div>
            ) : viewMode === "sell" ? (
              <SingleSideCell
                side="sell"
                value={cell.sellOrder}
                ariaLabel={`${activeResource} ${label} sell order price`}
                onChange={(v) => onPriceChange(activeResource, label, "sellOrder", v)}
              />
            ) : (
              <SingleSideCell
                side="buy"
                value={cell.buyOrder}
                ariaLabel={`${activeResource} ${label} buy order price`}
                onChange={(v) => onPriceChange(activeResource, label, "buyOrder", v)}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

interface PriceCellProps {
  side: "sell" | "buy";
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}

/** Compact dual-side cell — used in "both" view mode. */
function PriceCell({ side, value, ariaLabel, onChange }: PriceCellProps) {
  const isSell = side === "sell";
  return (
    <label className={`block px-2 py-1.5 min-w-0 cursor-text ${
      isSell ? "rounded-l" : "rounded-r"
    }`}>
      <span className={`block text-[8.5px] font-bold uppercase tracking-[0.18em] ${
        isSell ? "text-rose-300/65" : "text-emerald-300/65"
      }`}>
        {isSell ? "Sell" : "Buy"}
      </span>
      <input
        aria-label={ariaLabel}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={formatInputPrice(value)}
        onChange={(e) => {
          const sanitized = sanitizePrice(e.target.value);
          if (sanitized !== null) onChange(sanitized);
        }}
        placeholder="—"
        className={`w-full border-0 bg-transparent p-0 text-sm font-black tabular-nums outline-none placeholder:text-vellum/15 ${
          isSell ? "text-rose-100" : "text-emerald-100"
        }`}
      />
    </label>
  );
}

/** Single-side cell — used in "sell only" / "buy only" view modes. */
function SingleSideCell({ side, value, ariaLabel, onChange }: PriceCellProps) {
  const isSell = side === "sell";
  return (
    <label className="block px-2.5 py-2 min-w-0 cursor-text">
      <span className={`block text-[8.5px] font-bold uppercase tracking-[0.18em] mb-0.5 ${
        isSell ? "text-rose-300/65" : "text-emerald-300/65"
      }`}>
        {isSell ? "Sell order" : "Buy order"}
      </span>
      <input
        aria-label={ariaLabel}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={formatInputPrice(value)}
        onChange={(e) => {
          const sanitized = sanitizePrice(e.target.value);
          if (sanitized !== null) onChange(sanitized);
        }}
        placeholder="—"
        className={`w-full border-0 bg-transparent p-0 text-base font-black tabular-nums outline-none placeholder:text-vellum/15 ${
          isSell ? "text-rose-100" : "text-emerald-100"
        }`}
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

function formatAge(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Format a duration (ms) into a compact human string for inline labels. */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Look at the freshness signals on a cell and pick the color of its
 * top-right dot.
 *
 * For each side we take the LATER of:
 *   - the AODP *_date field (when AODP first observed this price), and
 *   - our local sellConfirmedAt / buyConfirmedAt (set when a fetch
 *     returned this side, regardless of AODP's date).
 *
 * The local confirmation is critical because AODP dedups: if a price
 * hasn't changed, AODP keeps the original sighting date forever even as
 * thousands of players re-upload the same value. Without our own
 * confirmation timestamp, a perfectly current price would render yellow
 * just because nobody else has moved it in 8 hours.
 *
 *   - Fresh   (<1h)            : green
 *   - Recent  (1-24h)          : gold
 *   - Stale   (>24h)           : amber
 *   - Manual  (no AODP date)   : neutral parchment
 */
function freshestBadge(cell: {
  sellDate?: string;
  buyDate?: string;
  sellConfirmedAt?: string;
  buyConfirmedAt?: string;
}): { color: string; title: string } {
  const now = Date.now();

  const ageOf = (aodpDate?: string, confirmedAt?: string): number | undefined => {
    const aodp = aodpDate ? Date.parse(aodpDate) : NaN;
    const conf = confirmedAt ? Date.parse(confirmedAt) : NaN;
    const candidates = [aodp, conf].filter(Number.isFinite);
    if (candidates.length === 0) return undefined;
    // Take the LATER timestamp → freshest age.
    return now - Math.max(...candidates);
  };

  const sellAge = ageOf(cell.sellDate, cell.sellConfirmedAt);
  const buyAge  = ageOf(cell.buyDate,  cell.buyConfirmedAt);

  const ages = [sellAge, buyAge].filter((a): a is number => Number.isFinite(a as number));
  if (ages.length === 0) {
    return { color: 'bg-oldgold-300/55', title: 'Manual entry — no AODP confirmation yet' };
  }
  const freshest = Math.min(...ages);
  const ONE_HOUR = 3_600_000;
  const ONE_DAY = 24 * ONE_HOUR;

  const partTitle: string[] = [];
  if (sellAge !== undefined) partTitle.push(`sell ${formatDuration(sellAge)}`);
  if (buyAge !== undefined)  partTitle.push(`buy ${formatDuration(buyAge)}`);
  const title = `Last confirmed — ${partTitle.join(' · ')}`;

  if (freshest < ONE_HOUR) return { color: 'bg-emerald-400', title };
  if (freshest < ONE_DAY)  return { color: 'bg-oldgold-300', title };
  return { color: 'bg-ember-400',     title };
}
