// Hosted inside AlbionCrafts AppShell. The original Codex standalone app
// lived at the root with its own <main>; here we drop that wrapper and slot
// the panels into the existing layout.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calculator, Shield } from "lucide-react";
import type {
  OrderPriceSide,
  PriceBook,
  PresetCost,
  ResourceType,
  ScannerSettings,
  TransmutationScanRow,
} from "./scanner/types";
import {
  createEmptyPriceBook,
  DEFAULT_SCANNER_SETTINGS,
  getEntryMultiplier,
  getSaleMultiplier,
  normalizePresets,
  normalizePriceBook,
  RESOURCE_TYPES,
  scanTransmutations,
  TRANSMUTATION_STEPS,
} from "./scanner/calculations";
import { scannerRowsToCsv } from "./scanner/format";
import { readStorage, writeStorage } from "./scanner/storage";
import { PresetCostsEditor } from "./scanner/PresetCostsEditor";
import { PriceMatrix } from "./scanner/PriceMatrix";
import { QuickResults } from "./scanner/QuickResults";
import { ScannerControls } from "./scanner/ScannerControls";
import { ScannerResultsTable } from "./scanner/ScannerResultsTable";
import { BuyOrderOpportunities } from "./scanner/BuyOrderOpportunities";
import { ChainTransmuteOpportunities } from "./scanner/ChainTransmuteOpportunities";
import ErrorBoundary from "../common/ErrorBoundary";
import { fetchScannerPrices, SCANNER_CITIES } from "./scanner/fetchAODPPrices";
import type { FetchResult, EstValueBook } from "./scanner/fetchAODPPrices";
import { useAppStore } from "../../store/appStore";
import { usePageMeta } from "../../hooks/usePageMeta";
import ToolExplainer from "../common/ToolExplainer";

const STORAGE_KEYS = {
  prices:    "albion-scanner-prices-v1",
  presets:   "albion-scanner-presets-v4",
  settings:  "albion-scanner-settings-v1",
  fetchCity: "albion-scanner-fetch-city-v1",
};

// Resource ↔ URL slug. "Wood / Logs" contains a slash that URL-encodes to
// %2F; Render/Cloudflare 404 on encoded slashes when the page is reloaded or
// shared. Use clean slugs in the URL instead.
const RESOURCE_SLUG: Record<string, string> = {
  'Wood / Logs': 'wood', 'Ore': 'ore', 'Fiber': 'fiber', 'Hide': 'hide', 'Stone': 'stone',
};
const SLUG_RESOURCE: Record<string, ResourceType> = {
  wood: 'Wood / Logs', ore: 'Ore', fiber: 'Fiber', hide: 'Hide', stone: 'Stone',
};

function resolveFetchCity(stored: unknown, fallback: string): string {
  const cities: readonly string[] = SCANNER_CITIES;
  if (typeof stored === "string" && cities.includes(stored)) return stored;
  if (cities.includes(fallback)) return fallback;
  return SCANNER_CITIES[0];
}

export default function Transmutation() {
  usePageMeta({
    title: 'Transmutation Profit Scanner',
    description: 'Resource transmutation profit scanner for Albion Online: enter live AODP prices or paste a price sheet, see profit, ROI and break-even per step across every tier and enchant, plus multi-hop chain transmute opportunities and buy-order plays.',
  });

  const globalCity = useAppStore(s => s.settings.craftingCity);

  const [activeResource, setActiveResource] = useState<ResourceType>("Wood / Logs");
  const [priceBook, setPriceBook] = useState<PriceBook>(() =>
    normalizePriceBook(readStorage<unknown>(STORAGE_KEYS.prices, createEmptyPriceBook()))
  );
  const [presets, setPresets] = useState<PresetCost[]>(() =>
    normalizePresets(readStorage<unknown>(STORAGE_KEYS.presets, []))
  );
  const [settings, setSettings] = useState<ScannerSettings>(() =>
    normalizeSettings(readStorage<unknown>(STORAGE_KEYS.settings, DEFAULT_SCANNER_SETTINGS))
  );
  const [toast, setToast] = useState("");
  // Est. market value (royal-continent avg, Black Market excluded), filled on
  // fetch. Used for the chain panel's discounted direct-trade exit rows.
  const [estValue, setEstValue] = useState<EstValueBook>(() =>
    RESOURCE_TYPES.reduce((b, r) => { b[r] = {}; return b; }, {} as EstValueBook)
  );

  // Auto-fill controls
  const [fetchCity, setFetchCity] = useState<string>(() =>
    resolveFetchCity(readStorage<unknown>(STORAGE_KEYS.fetchCity, null), globalCity)
  );
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetch, setLastFetch] = useState<FetchResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // URL state sync — /transmute?city=Lymhurst&resource=Hide. Mount reads
  // URL once and overrides the localStorage-restored defaults so shared
  // links land where the sender intended; subsequent state changes flow
  // back into the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlHydrated, setUrlHydrated] = useState(false);

  useEffect(() => {
    if (urlHydrated) return;
    const cityParam = searchParams.get("city");
    const resourceParam = searchParams.get("resource");
    if (cityParam && (SCANNER_CITIES as readonly string[]).includes(cityParam)) {
      setFetchCity(cityParam);
    }
    if (resourceParam) {
      // Accept the clean slug ("hide") or, for back-compat, the old full
      // name ("Hide" / "Wood / Logs").
      const resolved = SLUG_RESOURCE[resourceParam]
        ?? ((RESOURCE_TYPES as readonly string[]).includes(resourceParam) ? (resourceParam as ResourceType) : undefined);
      if (resolved) setActiveResource(resolved);
    }
    setUrlHydrated(true);
  }, [urlHydrated, searchParams]);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams();
    if (fetchCity) params.set("city", fetchCity);
    if (activeResource) params.set("resource", RESOURCE_SLUG[activeResource] ?? activeResource);
    setSearchParams(params, { replace: true });
  }, [urlHydrated, fetchCity, activeResource, setSearchParams]);

  const saleMultiplier = useMemo(() => getSaleMultiplier(settings), [settings]);
  const entryMultiplier = useMemo(() => getEntryMultiplier(settings), [settings]);
  const rows = useMemo(
    () =>
      scanTransmutations(
        priceBook,
        presets,
        saleMultiplier,
        entryMultiplier,
        settings.stationFeePerUnit,
        settings.entryPriceSource,
        settings.exitPriceSource
      ),
    [
      priceBook,
      presets,
      saleMultiplier,
      entryMultiplier,
      settings.stationFeePerUnit,
      settings.entryPriceSource,
      settings.exitPriceSource,
    ]
  );
  const visibleRows = useMemo(
    () =>
      sortRows(
        filterRows(pickBestRoutes(rows, settings.bestRouteOnly), settings.onlyProfitable),
        settings.sortMode
      ),
    [rows, settings.bestRouteOnly, settings.onlyProfitable, settings.sortMode]
  );
  const completeRows = rows.filter((row) => !row.missingPrice).length;
  const profitableRows = rows.filter((row) => (row.profitPerUnit ?? 0) > 0).length;
  const bestProfit = rows
    .filter((row) => row.profitPerUnit !== undefined)
    .reduce<number | undefined>(
      (best, row) =>
        best === undefined || row.profitPerUnit! > best ? row.profitPerUnit : best,
      undefined
    );

  useEffect(() => writeStorage(STORAGE_KEYS.prices, priceBook), [priceBook]);
  useEffect(() => writeStorage(STORAGE_KEYS.presets, presets), [presets]);
  useEffect(() => writeStorage(STORAGE_KEYS.settings, settings), [settings]);
  useEffect(() => writeStorage(STORAGE_KEYS.fetchCity, fetchCity), [fetchCity]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updatePrice = (
    resource: ResourceType,
    tier: string,
    side: OrderPriceSide,
    value: string
  ) => {
    // Manual edit overrides AODP — clear both the AODP date AND our own
    // confirmation timestamp for the edited side so the cell freshness
    // dot flips to "manual" instead of falsely showing a fresh signal.
    const dateKey      = side === "sellOrder" ? "sellDate"        : "buyDate";
    const confirmedKey = side === "sellOrder" ? "sellConfirmedAt" : "buyConfirmedAt";
    setPriceBook((current) => ({
      ...current,
      [resource]: {
        ...current[resource],
        [tier]: {
          ...current[resource][tier],
          [side]: value,
          [dateKey]: undefined,
          [confirmedKey]: undefined,
        },
      },
    }));
  };

  const exportCsv = () => {
    const csv = scannerRowsToCsv(visibleRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "albion-transmutation-scan.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("CSV exported");
  };

  const handleFetchLivePrices = async () => {
    if (isFetching) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const { priceBook: nextBook, estValue: nextEst, result } = await fetchScannerPrices(priceBook, fetchCity);
      setPriceBook(nextBook);
      setEstValue(nextEst);
      setLastFetch(result);
      setToast(`${result.filledSells} sells · ${result.filledBuys} buys from ${result.city}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fetch failed";
      setFetchError(msg);
      setToast("AODP fetch failed");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="text-vellum">
      <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-oldgold-300/25 bg-oldgold-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-oldgold-300">
            <Shield size={14} />
            Albion market tool
          </div>
          <h1 className="max-w-4xl text-3xl font-black tracking-normal text-vellum sm:text-4xl">
            Resource Transmutation Profit Scanner
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-vellum/62 sm:text-base">
            Scan every raw resource enchant step from manual prices before the market corrects.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-ash-850/70 px-3 py-2 text-sm text-vellum/70">
          <Calculator size={18} className="text-oldgold-300" />
          <span className="font-semibold tabular-nums">{completeRows}</span>
          calculated
          <span className="text-vellum/30">/</span>
          <span className="font-semibold tabular-nums text-moss-300">{profitableRows}</span>
          profitable
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <PriceMatrix
            priceBook={priceBook}
            activeResource={activeResource}
            onActiveResourceChange={setActiveResource}
            onPriceChange={updatePrice}
            fetchCity={fetchCity}
            onFetchCityChange={setFetchCity}
            onFetchLivePrices={handleFetchLivePrices}
            isFetching={isFetching}
            lastFetch={lastFetch}
            fetchError={fetchError}
          />
          <QuickResults resource={activeResource} rows={rows} settings={settings} />
          <ScannerControls
            settings={settings}
            saleMultiplier={saleMultiplier}
            totalRows={rows.length}
            completeRows={completeRows}
            profitableRows={profitableRows}
            visibleRows={visibleRows.length}
            bestProfit={bestProfit}
            onSettingsChange={(nextSettings) => setSettings(normalizeSettings(nextSettings))}
            onExportCsv={exportCsv}
          />
        </div>

        <div className="space-y-4">
          <ErrorBoundary compact label="Chain transmute">
            <ChainTransmuteOpportunities
              priceBook={priceBook}
              estValue={estValue}
              presets={presets}
              feeSettings={{
                saleMode: 'marketplace',
                taxProfile: settings.taxProfile === 'normal' ? 'normal' : settings.taxProfile === 'custom' ? 'custom' : 'premium',
                customSalesTaxPct: settings.marketplaceTaxPercent,
                customSetupFeePct: settings.setupFeePercent,
                entrySource: settings.entryPriceSource,
                exitSource: settings.exitPriceSource,
              }}
            />
          </ErrorBoundary>
          <ErrorBoundary compact label="Buy-order opportunities">
            <BuyOrderOpportunities
              priceBook={priceBook}
              presets={presets}
              feeSettings={{
                saleMode: 'marketplace',
                taxProfile: settings.taxProfile === 'normal' ? 'normal' : settings.taxProfile === 'custom' ? 'custom' : 'premium',
                customSalesTaxPct: settings.marketplaceTaxPercent,
                customSetupFeePct: settings.setupFeePercent,
                entrySource: 'buyOrder',
                exitSource: settings.exitPriceSource,
              }}
            />
          </ErrorBoundary>
          <PresetCostsEditor presets={presets} onChange={(next) => setPresets(normalizePresets(next))} />
        </div>
      </div>

      <div className="mt-4">
        <ScannerResultsTable rows={visibleRows} />
      </div>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-oldgold-300/40 bg-ash-900 px-4 py-2 text-sm font-bold text-oldgold-300 shadow-steel">
          {toast}
        </div>
      ) : null}

      <ToolExplainer title="About the Transmutation Scanner">
        <p>
          Resource transmutation is one of the most overlooked silver
          machines in Albion. The basic mechanic is simple: you spend a
          fixed silver fee to convert a lower-tier or lower-enchant
          resource into a higher one, with no return rate involved. When
          the gap between input price and output price is wider than the
          transmutation fee, you print silver — and because most players
          don't track every step, those gaps stay open for a long time.
        </p>
        <p>
          The scanner has three views. The main grid lets you punch in
          prices for every tier-enchant cell of every resource family
          (wood, ore, fiber, hide, stone), either by hand or auto-filled
          from AODP for the city of your choice. The auto-scan table on
          the left then computes profit, ROI and break-even sell price
          for every single-step transmutation in the game — usually 40+
          rows per resource. The Chain Transmute panel on the right goes
          one further and finds the cheapest multi-hop path to any
          target tier-enchant, surfacing routes like T5.2 → T5.3 → T6.3
          that beat the direct one-step path.
        </p>
        <p>
          Intermediate tier prices don't matter for chain math — you
          never buy or sell the substrate, you just pay the step fee.
          What the chain panel <em>does</em> use intermediate prices for
          is the "vs direct 1-step" comparison, which checks whether
          buying the target's direct precursor would be cheaper than
          chaining. If the answer is yes, the chain still shows (because
          it might be the only realistic way to source volume when the
          intermediate tier is illiquid), but the badge tells you the
          shortcut exists.
        </p>
        <p>
          The bulk-paste button at the top of the price matrix is the
          workflow unlock — copy 25 prices from a spreadsheet or the
          in-game market window in one shot, paste, click Apply, scan.
          Combined with the End Goal filter (set it to e.g. T6.3 to only
          see chains that produce that target), the scanner turns from
          "drown me in numbers" into "show me the three plays that
          actually matter today."
        </p>
      </ToolExplainer>
    </div>
  );
}

function filterRows(rows: TransmutationScanRow[], onlyProfitable: boolean) {
  if (!onlyProfitable) return rows;
  return rows.filter((row) => (row.profitPerUnit ?? 0) > 0);
}

function sortRows(rows: TransmutationScanRow[], sortMode: ScannerSettings["sortMode"]) {
  return [...rows].sort((a, b) => {
    if (a.missingPrice !== b.missingPrice) return a.missingPrice ? 1 : -1;

    if (sortMode === "profitAsc") {
      return (a.profitPerUnit ?? Number.POSITIVE_INFINITY) - (b.profitPerUnit ?? Number.POSITIVE_INFINITY);
    }

    if (sortMode === "roiDesc") {
      return (b.roiPercent ?? Number.NEGATIVE_INFINITY) - (a.roiPercent ?? Number.NEGATIVE_INFINITY);
    }

    if (sortMode === "resource") {
      const resourceDelta =
        RESOURCE_TYPES.indexOf(a.resource) - RESOURCE_TYPES.indexOf(b.resource);
      if (resourceDelta !== 0) return resourceDelta;
      return stepIndex(a) - stepIndex(b);
    }

    return (b.profitPerUnit ?? Number.NEGATIVE_INFINITY) - (a.profitPerUnit ?? Number.NEGATIVE_INFINITY);
  });
}

function stepIndex(row: TransmutationScanRow) {
  return TRANSMUTATION_STEPS.findIndex((step) => step.from === row.from && step.to === row.to);
}

function normalizeSettings(value: unknown): ScannerSettings {
  if (!value || typeof value !== "object") return DEFAULT_SCANNER_SETTINGS;

  const candidate = value as Partial<ScannerSettings>;
  const legacyTotalTax =
    candidate.setupFeePercent === undefined &&
    typeof candidate.marketplaceTaxPercent === "number" &&
    candidate.marketplaceTaxPercent >= 6;
  const taxProfile = candidate.taxProfile ?? (legacyTotalTax ? "premium" : undefined);
  const marketplaceTaxPercent =
    legacyTotalTax && candidate.marketplaceTaxPercent === 6.5
      ? 4
      : typeof candidate.marketplaceTaxPercent === "number"
        ? candidate.marketplaceTaxPercent
        : DEFAULT_SCANNER_SETTINGS.marketplaceTaxPercent;
  const sortModes: ScannerSettings["sortMode"][] = [
    "profitDesc",
    "profitAsc",
    "roiDesc",
    "resource",
  ];

  return {
    saleMode: candidate.saleMode === "private" ? "private" : "marketplace",
    marketplaceTaxPercent: clampNumber(marketplaceTaxPercent, 0, 100),
    setupFeePercent: clampNumber(
      typeof candidate.setupFeePercent === "number"
        ? candidate.setupFeePercent
        : DEFAULT_SCANNER_SETTINGS.setupFeePercent,
      0,
      100
    ),
    stationFeePerUnit: clampNumber(
      typeof candidate.stationFeePerUnit === "number"
        ? candidate.stationFeePerUnit
        : DEFAULT_SCANNER_SETTINGS.stationFeePerUnit,
      0,
      Number.MAX_SAFE_INTEGER
    ),
    taxProfile:
      taxProfile === "normal" || taxProfile === "custom" || taxProfile === "premium"
        ? taxProfile
        : DEFAULT_SCANNER_SETTINGS.taxProfile,
    entryPriceSource:
      candidate.entryPriceSource === "buyOrder" ? "buyOrder" : "sellOrder",
    exitPriceSource:
      candidate.exitPriceSource === "sellOrder" ? "sellOrder" : "buyOrder",
    onlyProfitable: Boolean(candidate.onlyProfitable),
    bestRouteOnly:
      typeof candidate.bestRouteOnly === "boolean"
        ? candidate.bestRouteOnly
        : DEFAULT_SCANNER_SETTINGS.bestRouteOnly,
    sortMode: candidate.sortMode && sortModes.includes(candidate.sortMode)
      ? candidate.sortMode
      : DEFAULT_SCANNER_SETTINGS.sortMode,
  };
}

function pickBestRoutes(rows: TransmutationScanRow[], bestRouteOnly: boolean) {
  if (!bestRouteOnly) return rows;

  const bestByTarget = new Map<string, TransmutationScanRow>();
  rows.forEach((row) => {
    const key = `${row.resource}-${row.to}`;
    const current = bestByTarget.get(key);
    if (!current) {
      bestByTarget.set(key, row);
      return;
    }

    if (current.missingPrice && !row.missingPrice) {
      bestByTarget.set(key, row);
      return;
    }

    if (!current.missingPrice && row.missingPrice) return;

    if ((row.profitPerUnit ?? Number.NEGATIVE_INFINITY) > (current.profitPerUnit ?? Number.NEGATIVE_INFINITY)) {
      bestByTarget.set(key, row);
    }
  });

  return Array.from(bestByTarget.values());
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
