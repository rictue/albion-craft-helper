import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionDivider } from '../../ui';
import { ALBION_TIMERS, formatTimerDuration } from '../../../utils/albionTimers';

/**
 * Dashboard timer preview. The full breakdown + UTC explainer lives on
 * the dedicated /timers page; this panel is just the live countdowns.
 */
export default function TimersPanel() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionDivider label="Timers & Cycles" hint="Albion is UTC — plan around the next window" />
        <Link to="/timers" className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-gold-light font-bold">
          Full timers →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ALBION_TIMERS.map(t => (
          <div key={t.title} className="stat-card">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold/70">
              {t.title}
            </div>
            <div
              className="mt-2 text-2xl font-black tabular-nums text-zinc-100 leading-none"
              data-tick={tick}
            >
              {formatTimerDuration(t.next())}
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
