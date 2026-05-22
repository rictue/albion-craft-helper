import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroPanel from './panels/HeroPanel';
import NewsPanel from './panels/NewsPanel';
import QuickToolsPanel from './panels/QuickToolsPanel';
import ProfitOpportunitiesPanel from './panels/ProfitOpportunitiesPanel';
import TimersPanel from './panels/TimersPanel';
import ChangelogPanel from './panels/ChangelogPanel';
import RecentSessionsPanel from './panels/RecentSessionsPanel';
import ErrorBoundary from '../common/ErrorBoundary';
import { StatCard, WarningBox } from '../ui';
import { formatSilver } from '../../utils/formatters';
import { getLastFetchTime } from '../../services/api';

type CraftType = 'refining' | 'crafting' | 'butcher' | 'cooking' | 'farming' | 'flipping' | 'other';
export interface CraftEntry {
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

export default function Dashboard() {
  const [craftHistory] = useState<CraftEntry[]>(() => loadCraftHistory());
  const [lastFetchAge, setLastFetchAge] = useState<number | null>(() => {
    const t = getLastFetchTime();
    return t ? Date.now() - t : null;
  });
  const [nowSnapshot] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      const cur = getLastFetchTime();
      setLastFetchAge(cur ? Date.now() - cur : null);
    };
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const totals = useMemo(() => {
    const grossProfit = craftHistory.reduce((a, e) => a + (e.revenue - e.cost), 0);
    const totalInvested = craftHistory.reduce((a, e) => a + e.cost, 0);
    const sessions = craftHistory.length;
    const margin = totalInvested > 0 ? (grossProfit / totalInvested) * 100 : 0;
    const cutoff = nowSnapshot - 7 * 86_400_000;
    const recent = craftHistory.filter(e => e.ts >= cutoff);
    const recentProfit = recent.reduce((a, e) => a + (e.revenue - e.cost), 0);
    return { grossProfit, totalInvested, sessions, margin, recentProfit };
  }, [craftHistory, nowSnapshot]);

  const stale = lastFetchAge !== null && lastFetchAge > 6 * 3_600_000;
  const noData = lastFetchAge === null;

  return (
    <div className="space-y-6">
      {/* 1. Hero / Welcome panel */}
      <HeroPanel />

      {/* Inline status row — uses real store data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Logged Sessions"
          value={totals.sessions}
          hint={totals.sessions === 0
            ? 'Log your first run in Profit History.'
            : `${formatSilver(totals.totalInvested)} invested.`}
          tone="gold"
        />
        <StatCard
          label="Lifetime Profit"
          value={
            <span className={totals.grossProfit >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
              {totals.grossProfit >= 0 ? '+' : ''}{formatSilver(totals.grossProfit)}
            </span>
          }
          hint={totals.sessions > 0 ? `${totals.margin.toFixed(1)}% margin` : 'From logged sessions.'}
          tone={totals.grossProfit >= 0 ? 'profit' : 'loss'}
        />
        <StatCard
          label="7-Day Profit"
          value={
            <span className={totals.recentProfit >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
              {totals.recentProfit >= 0 ? '+' : ''}{formatSilver(totals.recentProfit)}
            </span>
          }
          hint="Rolling 7-day from logged sessions."
        />
      </div>

      {/* Stale data warning */}
      {(stale || noData) && (
        <WarningBox tone={stale ? 'warning' : 'info'} title={stale ? 'Market data is stale' : 'No prices fetched yet'}>
          {stale && lastFetchAge !== null && (
            <>Last AODP fetch was {Math.floor(lastFetchAge / 3_600_000)}h ago. Open a calculator to force a refresh.</>
          )}
          {noData && (
            <>Open <Link to="/refining" className="underline">Refining</Link> or <Link to="/calculator" className="underline">Calculator</Link> to fetch live AODP prices.</>
          )}
        </WarningBox>
      )}

      {/* 2: News & Patch Notes — Garmoth-style card feed pulled from
              Steam Community Announcements. Wrapped in an error boundary
              because the proxy chain can fail and we don't want one bad
              fetch to take down the whole dashboard. */}
      <ErrorBoundary compact label="News feed">
        <NewsPanel />
      </ErrorBoundary>

      {/* 3. Quick Tools */}
      <QuickToolsPanel />

      {/* 4: Profit Opportunities */}
      <ProfitOpportunitiesPanel />

      {/* 4: Timers */}
      <TimersPanel />

      {/* Recent sessions ledger */}
      <RecentSessionsPanel rows={craftHistory.slice(0, 8)} />

      {/* 5: Changelog */}
      <ChangelogPanel />
    </div>
  );
}
