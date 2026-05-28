/**
 * Deterministic Albion Online recurring windows. The game runs on UTC,
 * so every reset is computed relative to UTC midnight / a fixed weekday.
 *
 * We intentionally only include cycles with a KNOWN, fixed schedule —
 * daily reset, weekly reset, the half-hour market cadence, and the 24h
 * laborer refill. World bosses and Mist/portal events spawn on
 * zone-local, non-public schedules, so we don't fake countdowns for
 * those.
 */

export interface AlbionTimer {
  title: string;
  description: string;
  /** ms until the next firing. */
  next: () => number;
}

export function nextDailyResetUtc(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.getTime() - now.getTime();
}

export function nextWeeklyResetUtc(): number {
  // Albion's weekly reset is Tuesday 09:00 UTC.
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilTuesday = (2 - day + 7) % 7;
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilTuesday, 9, 0, 0,
  ));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 7);
  return next.getTime() - now.getTime();
}

export function nextHalfHour(): number {
  const now = new Date();
  const minutes = now.getUTCMinutes();
  const target = minutes < 30 ? 30 : 60;
  const next = new Date(now);
  next.setUTCMinutes(target, 0, 0);
  return next.getTime() - now.getTime();
}

export const ALBION_TIMERS: AlbionTimer[] = [
  { title: 'Daily Reset',    description: 'Focus regen, daily quests, gathering bonuses.', next: nextDailyResetUtc },
  { title: 'Weekly Reset',   description: 'Guild season scoring, weekly chests.',          next: nextWeeklyResetUtc },
  { title: 'Market Refresh', description: 'AODP fetch cadence — half-hour ticks.',         next: nextHalfHour },
  { title: 'Laborer Cycle',  description: '24h refill — line up to your daily login.',     next: nextDailyResetUtc },
];

export function formatTimerDuration(ms: number): string {
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
