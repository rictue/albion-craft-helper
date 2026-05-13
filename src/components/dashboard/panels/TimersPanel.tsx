import { useEffect, useState } from 'react';
import { SectionDivider } from '../../ui';

/**
 * Cycle / timer panel. Albion runs on UTC, with several well-known recurring
 * windows: daily reset (00:00 UTC), market refresh cadence, journal cycle,
 * etc. We compute the next occurrence relative to "now" so the user can see
 * what's coming up.
 */

interface Timer {
  title: string;
  description: string;
  /** Returns ms until the next firing. */
  next: () => number;
}

function nextDailyResetUtc(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.getTime() - now.getTime();
}

function nextWeeklyResetUtc(): number {
  // Albion's weekly reset is Tuesday 09:00 UTC (Albion Season-style).
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilTuesday = (2 - day + 7) % 7;
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilTuesday,
    9, 0, 0
  ));
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  }
  return next.getTime() - now.getTime();
}

function nextHalfHour(): number {
  const now = new Date();
  const minutes = now.getUTCMinutes();
  const target = minutes < 30 ? 30 : 60;
  const next = new Date(now);
  next.setUTCMinutes(target, 0, 0);
  return next.getTime() - now.getTime();
}

const TIMERS: Timer[] = [
  { title: 'Daily Reset',       description: 'Focus regen, daily quests, gathering bonuses.', next: nextDailyResetUtc },
  { title: 'Weekly Reset',      description: 'Crystal League seasons, weekly chests.',         next: nextWeeklyResetUtc },
  { title: 'Market Refresh',    description: 'AODP fetch cadence — half-hour ticks.',         next: nextHalfHour },
  { title: 'Laborer Cycle',     description: '24h refill — line up to your daily login.',      next: nextDailyResetUtc },
];

function formatDuration(ms: number): string {
  if (ms < 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h ${m}m`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function TimersPanel() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="space-y-3">
      <SectionDivider label="Timers & Cycles" hint="Albion is UTC — plan around the next window" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIMERS.map(t => (
          <div key={t.title} className="stat-card">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold/70">
              {t.title}
            </div>
            <div
              className="mt-2 text-2xl font-black tabular-nums text-zinc-100 leading-none"
              data-tick={tick}
            >
              {formatDuration(t.next())}
            </div>
            <div className="mt-1.5 text-[10px] text-[#a89175] leading-snug">
              {t.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
