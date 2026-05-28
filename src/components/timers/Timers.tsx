import { useEffect, useState } from 'react';
import { ALBION_TIMERS, formatTimerDuration } from '../../utils/albionTimers';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconBook } from '../shell/navIcons';

/**
 * Full timers page. Live countdowns for every deterministic Albion
 * recurring window, plus the exact UTC times and an explainer.
 */
export default function Timers() {
  usePageMeta({
    title: 'Albion Timers',
    description: 'Live countdowns to the next Albion Online daily reset (00:00 UTC), weekly reset (Tuesday 09:00 UTC), half-hour market refresh, and 24h laborer cycle. Albion runs on UTC — plan your focus, laborers and selling around these windows.',
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Show the user's local clock alongside UTC so they can map resets to
  // their own timezone at a glance.
  const now = new Date();
  const utcTime = now.toUTCString().slice(17, 25);
  const localTime = now.toLocaleTimeString();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference · Cycles"
        title="Albion Timers"
        description="Albion Online's server runs on UTC. Daily and weekly resets, the market data cadence, and your laborer refill all key off UTC midnight or a fixed weekday — so the countdowns below are the same for every player regardless of timezone."
        icon={IconBook}
      />

      <div className="medieval-panel p-4 flex items-center justify-between flex-wrap gap-3" data-tick={tick}>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Server time (UTC)</div>
          <div className="text-xl font-black tabular-nums text-gold-light">{utcTime}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Your local time</div>
          <div className="text-xl font-black tabular-nums text-zinc-300">{localTime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALBION_TIMERS.map(t => (
          <div key={t.title} className="medieval-panel p-5" data-tick={tick}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold/70">{t.title}</div>
            <div className="mt-2 text-4xl font-black tabular-nums text-zinc-100 leading-none">
              {formatTimerDuration(t.next())}
            </div>
            <div className="mt-2 text-xs text-[#a89175] leading-snug">{t.description}</div>
          </div>
        ))}
      </div>

      <ToolExplainer title="Albion's reset schedule">
        <p>
          Everything in Albion Online keys off UTC, so no matter where you
          live the resets happen at the same absolute moment. Knowing them
          lets you time your play for maximum value.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Daily Reset — 00:00 UTC.</strong> Daily quests refresh,
            gathering bonus zones rotate, and your focus continues to regen
            toward the daily cap. Spend down any focus you don't want to
            "waste" against the cap before this.
          </li>
          <li>
            <strong>Weekly Reset — Tuesday 09:00 UTC.</strong> Guild season
            scoring windows and weekly chest progress roll over. If you do
            weekly content, Monday night UTC is your last call.
          </li>
          <li>
            <strong>Market Refresh — every half hour.</strong> The Albion
            Online Data Project (the source of the prices on this site)
            updates on a rough half-hour cadence as players upload scans.
            Hitting Refresh on a calculator right after a tick gets you the
            freshest possible data.
          </li>
          <li>
            <strong>Laborer Cycle — 24h.</strong> Laborers (and the journals
            you hand them) complete on a 24-hour timer from when you last
            collected. Logging in at the same time each day keeps them on a
            clean once-a-day rhythm with no wasted hours — see the Laborer
            Calculator for the ROI math.
          </li>
        </ul>
        <p>
          World bosses, Mist portals and Roads events spawn on zone-local,
          non-fixed schedules that aren't published by Sandbox Interactive,
          so we deliberately don't show fake countdowns for them — only the
          deterministic cycles above.
        </p>
      </ToolExplainer>
    </div>
  );
}
