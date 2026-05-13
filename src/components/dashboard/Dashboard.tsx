import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  StatCard,
  ProfitBadge,
  EmptyState,
  WarningBox,
  DataTable,
  SectionDivider,
  ToolCard,
  RiskBadge,
} from '../ui';
import type { Column } from '../ui';
import { useAppStore } from '../../store/appStore';
import { formatSilver } from '../../utils/formatters';
import { getLastFetchTime } from '../../services/api';
import {
  IconHammer,
  IconFurnace,
  IconLaborer,
  IconScales,
  IconLedger,
  IconCog,
  IconFlame,
  IconShield,
  IconCrown,
  IconPouch,
} from '../shell/navIcons';

type CraftType = 'refining' | 'crafting' | 'butcher' | 'cooking' | 'farming' | 'flipping' | 'other';
interface CraftEntry {
  id: string;
  ts: number;
  type: CraftType;
  name: string;
  cost: number;
  revenue: number;
}

const CRAFT_HISTORY_LS = 'albion-craft-history-v1';

function loadCraftHistory(): CraftEntry[] {
  try {
    const raw = localStorage.getItem(CRAFT_HISTORY_LS);
    if (raw) return JSON.parse(raw) as CraftEntry[];
  } catch {
    // Corrupt LS — show empty list instead of crashing the dashboard.
  }
  return [];
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ToolGrid() {
  const tools = [
    { to: '/calculator', title: 'Craft Calculator', description: 'Per-item profit with fees, focus, return rate.', icon: IconHammer },
    { to: '/refining',   title: 'Refining',         description: 'Raw → refined with focus, RR + transport.',     icon: IconFurnace, prominent: true },
    { to: '/cooking',    title: 'Cooking',          description: 'Recipe-by-recipe meal profit with city bonus.', icon: IconFlame },
    { to: '/laborers',   title: 'Laborers',         description: 'House, journals, happiness, ROI on upgrade.',   icon: IconLaborer },
    { to: '/flipper',    title: 'Market Flipper',   description: 'City spread scan with ROI per 1M invested.',    icon: IconScales },
    { to: '/bm-runner',  title: 'BM Runner',        description: 'Caerleon Black Market arbitrage routes.',       icon: IconPouch },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tools.map(t => (
        <ToolCard key={t.to} {...t} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const plannerItems = useAppStore(s => s.plannerItems);
  const customPrices = useAppStore(s => s.customPrices);
  const settings = useAppStore(s => s.settings);

  // CraftHistory is in its own LS bucket — read synchronously at mount.
  const [craftHistory] = useState<CraftEntry[]>(() => loadCraftHistory());

  // Track when the AODP price cache was last refreshed. Refreshes via a 30s
  // tick driven by an effect (the effect updates state from an external
  // subscription, which is the legit "synchronize with external system" use).
  const [lastFetchAge, setLastFetchAge] = useState<number | null>(() => {
    const t = getLastFetchTime();
    return t ? Date.now() - t : null;
  });

  useEffect(() => {
    const tick = () => {
      const cur = getLastFetchTime();
      setLastFetchAge(cur ? Date.now() - cur : null);
    };
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // Snapshot `now` at mount so the memo stays pure for lint's purity check.
  const [nowSnapshot] = useState(() => Date.now());

  const totals = useMemo(() => {
    const grossProfit = craftHistory.reduce((a, e) => a + (e.revenue - e.cost), 0);
    const totalInvested = craftHistory.reduce((a, e) => a + e.cost, 0);
    const sessions = craftHistory.length;
    const margin = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0;

    const cutoff = nowSnapshot - 7 * 86_400_000;
    const recent = craftHistory.filter(e => e.ts >= cutoff);
    const recentProfit = recent.reduce((a, e) => a + (e.revenue - e.cost), 0);

    // Best margin session
    let bestMargin = 0;
    let bestName = '';
    for (const e of craftHistory) {
      if (e.cost <= 0) continue;
      const m = ((e.revenue - e.cost) / e.cost) * 100;
      if (m > bestMargin) {
        bestMargin = m;
        bestName = e.name;
      }
    }
    return { grossProfit, totalInvested, sessions, margin, recentProfit, bestMargin, bestName };
  }, [craftHistory, nowSnapshot]);

  const stale = lastFetchAge !== null && lastFetchAge > 6 * 3_600_000;
  const noData = lastFetchAge === null;

  const watchlistKeys = Object.keys(customPrices);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Royal Market Hall"
        title="Ledger of the Realm"
        description="At-a-glance silver, crafts, and market spreads. Configure defaults in Settings; log finished runs in Profit History."
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Logged Sessions"
          value={totals.sessions}
          hint={totals.sessions === 0
            ? 'Log your first run in Profit History.'
            : `${formatSilver(totals.totalInvested)} silver invested over time.`}
          tone="gold"
        />
        <StatCard
          label="Lifetime Profit"
          value={
            <span className={totals.grossProfit >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
              {totals.grossProfit >= 0 ? '+' : ''}{formatSilver(totals.grossProfit)}
            </span>
          }
          hint={totals.sessions > 0 ? `${totals.margin.toFixed(1)}% net margin on logged runs.` : 'Net silver from logged sessions.'}
          tone={totals.grossProfit >= 0 ? 'profit' : 'loss'}
        />
        <StatCard
          label="7-Day Profit"
          value={
            <span className={totals.recentProfit >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
              {totals.recentProfit >= 0 ? '+' : ''}{formatSilver(totals.recentProfit)}
            </span>
          }
          hint="Profit from logged sessions in the last 7 days."
        />
        <StatCard
          label="Watched Items"
          value={watchlistKeys.length}
          hint={watchlistKeys.length === 0
            ? 'Add manual prices in Custom Prices.'
            : `Custom prices: ${watchlistKeys.length} entries`}
          tone="default"
        />
      </div>

      {/* Warnings */}
      {(stale || noData) && (
        <WarningBox
          tone={stale ? 'warning' : 'info'}
          title={stale ? 'Market data is stale' : 'No prices fetched yet'}
        >
          {stale && lastFetchAge !== null && (
            <>Last successful AODP fetch was {Math.floor(lastFetchAge / 3_600_000)}h ago.
            Open a calculator (Refining, Calculator, Flipper) to force a refresh, or add manual overrides via Custom Prices.</>
          )}
          {noData && <>Open <Link to="/refining" className="underline">Refining</Link> or <Link to="/flipper" className="underline">Market Flipper</Link> to pull live prices from the Albion Online Data Project.</>}
        </WarningBox>
      )}

      {/* 2-column main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: tools + recent sessions */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <SectionDivider label="Best Tools" hint="Direct paths into the most-used calculators" />
            <ToolGrid />
          </section>

          <section>
            <SectionDivider label="Recent Sessions" hint="Last logged crafts from Profit History" />
            <RecentSessionsTable rows={craftHistory.slice(0, 8)} />
          </section>
        </div>

        {/* Right: side panels */}
        <div className="space-y-6">
          <section>
            <SectionDivider label="Quick Actions" />
            <div className="medieval-panel p-3 space-y-1.5">
              <QuickRow to="/calculator"    label="Calculate a craft"   icon={IconHammer} />
              <QuickRow to="/refining"      label="Run refining"        icon={IconFurnace} />
              <QuickRow to="/cooking"       label="Cook for profit"     icon={IconFlame} />
              <QuickRow to="/flipper"       label="Scan markets"        icon={IconScales} />
              <QuickRow to="/bm-runner"     label="Plan BM run"         icon={IconPouch} />
              <QuickRow to="/laborers"      label="Check laborer ROI"   icon={IconLaborer} />
              <QuickRow to="/craft-history" label="Log a finished run"  icon={IconLedger} />
              <QuickRow to="/settings"      label="Adjust defaults"     icon={IconCog} />
            </div>
          </section>

          <section>
            <SectionDivider label="Strategy Picks" />
            <div className="space-y-2">
              <StrategyRow
                to="/refining"
                title="Refining loop"
                blurb="Royal city + focus — backbone of daily silver."
                risk="low"
                icon={IconFurnace}
              />
              <StrategyRow
                to="/suggested"
                title="ZvZ Meta Crafts"
                blurb="Demand-driven gear with steady Black Market churn."
                risk="medium"
                icon={IconShield}
              />
              <StrategyRow
                to="/flipper"
                title="Market Flipper"
                blurb="City-to-city spreads without crafting anything."
                risk="medium"
                icon={IconScales}
              />
              <StrategyRow
                to="/bm-runner"
                title="BM Runner"
                blurb="Caerleon ↔ royal arbitrage. Faster turn, dirt road."
                risk="high"
                icon={IconCrown}
              />
              <StrategyRow
                to="/transmute"
                title="Transmutation"
                blurb="Park idle focus when nothing else needs it."
                risk="low"
                icon={IconFlame}
              />
            </div>
          </section>

          {totals.bestName && (
            <section>
              <SectionDivider label="Top Performer" />
              <div className="medieval-panel p-4">
                <div className="medieval-title-sm">{totals.bestName}</div>
                <div className="mt-1 text-xl font-black text-[color:var(--color-profit)]">
                  +{totals.bestMargin.toFixed(1)}% margin
                </div>
                <div className="text-[11px] text-[#8a7b62] mt-1">
                  Best-margin run from your logged sessions.
                </div>
              </div>
            </section>
          )}

          <section>
            <SectionDivider label="Your Setup" />
            <div className="medieval-panel p-4 space-y-2 text-[12px]">
              <SettingRow label="Default City" value={settings.craftingCity} />
              <SettingRow label="Premium" value={settings.hasPremium ? 'Yes (6.5% tax)' : 'No (10.5% tax)'} />
              <SettingRow label="Sell Target" value={settings.sellingLocation} />
              <SettingRow label="Planner Queue" value={`${plannerItems.length} items`} />
              <Link to="/settings" className="block text-center mt-2 text-[10px] uppercase tracking-[0.18em] text-gold/70 font-bold hover:text-gold-light">
                Adjust →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function QuickRow({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="guild-nav-row group !text-[12px] hover:!bg-[rgba(214,166,74,0.08)]"
    >
      <span className="opacity-90 shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-gold/40 group-hover:text-gold/80 text-[10px] transition-colors">→</span>
    </Link>
  );
}

function StrategyRow({
  to, title, blurb, risk, icon,
}: {
  to: string;
  title: string;
  blurb: string;
  risk: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
}) {
  return (
    <Link to={to} className="tool-card flex items-start gap-3 p-3 rounded-md hover:-translate-y-0.5 transition-all">
      <div className="icon-frame relative z-10 h-9 w-9 rounded-md text-gold-light shrink-0">{icon}</div>
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="medieval-title text-[13px] truncate">{title}</div>
          <RiskBadge level={risk} />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-[#a89175]">{blurb}</p>
      </div>
    </Link>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-gold/65">{label}</span>
      <span className="text-zinc-200 font-semibold truncate">{value}</span>
    </div>
  );
}

function RecentSessionsTable({ rows }: { rows: CraftEntry[] }) {
  const typeColor: Record<CraftType, string> = {
    refining: 'text-cyan-300', crafting: 'text-gold-light', butcher: 'text-rose-300',
    cooking:  'text-orange-300', farming: 'text-lime-300', flipping: 'text-purple-300',
    other:    'text-zinc-300',
  };
  const columns: Column<CraftEntry>[] = [
    { key: 'name', header: 'Session', cell: r => (
        <div>
          <div className="text-zinc-100 font-semibold leading-tight">{r.name}</div>
          <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${typeColor[r.type]}`}>{r.type}</div>
        </div>
      ),
    },
    { key: 'cost', header: 'Cost', numeric: true, cell: r => formatSilver(r.cost) },
    { key: 'rev',  header: 'Revenue', numeric: true, cell: r => formatSilver(r.revenue) },
    { key: 'profit', header: 'Profit', numeric: true, cell: r => (
        <ProfitBadge
          amount={r.revenue - r.cost}
          percent={r.cost > 0 ? ((r.revenue - r.cost) / r.cost) * 100 : undefined}
        />
      ),
    },
    { key: 'when', header: 'When', numeric: true, cell: r => (
        <span className="text-[11px] text-zinc-500">{formatRelativeTime(r.ts)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={r => r.id}
      empty={
        <EmptyState
          title="No sessions logged yet"
          description="Use Profit History to log finished refining, crafting, or flipping runs. They feed the stat cards above."
          action={
            <Link
              to="/craft-history"
              className="chip border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 transition-colors"
            >
              Open Profit History
            </Link>
          }
        />
      }
    />
  );
}
