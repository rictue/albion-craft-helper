import { SectionDivider } from '../../ui';

interface ChangelogEntry {
  version: string;
  date: string;
  /** Bullet items grouped by kind. */
  changes: Array<{
    kind: 'added' | 'changed' | 'removed' | 'fixed';
    text: string;
  }>;
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: 'v1.3.0',
    date: '2026-05-13',
    changes: [
      { kind: 'added',   text: 'New companion-site layout: top nav with mega dropdowns.' },
      { kind: 'added',   text: 'Dashboard rebuilt: hero search, profit opportunities, timers, changelog.' },
      { kind: 'added',   text: 'Laborer Calculator with house upgrade ROI compare.' },
      { kind: 'added',   text: 'Settings page for defaults, tax, and local-data management.' },
      { kind: 'removed', text: 'Scan-based calculators (Flipper, BM Runner, Suggested) — AODP data gaps.' },
      { kind: 'removed', text: 'Beast & Field section (Mounts, Farm & Breed, Island, Farming).' },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-04-22',
    changes: [
      { kind: 'changed', text: 'Cooking calculator rewrite — canonical recipe counts, enchant variants.' },
      { kind: 'added',   text: 'Constants single-source-of-truth (taxes, LPB, weights, mounts).' },
      { kind: 'fixed',   text: 'Focus cost formula: enchant multiplier + cross-tier spec sum.' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-04-19',
    changes: [
      { kind: 'added',   text: 'Refining: transport weight card + mount selector.' },
      { kind: 'added',   text: 'Discord sell mode (no tax, −5%).' },
      { kind: 'changed', text: 'Sticky city selection in price picker across tier/enchant.' },
    ],
  },
];

const KIND_STYLE: Record<ChangelogEntry['changes'][number]['kind'], string> = {
  added:   'text-emerald-300 border-emerald-500/35 bg-emerald-500/8',
  changed: 'text-amber-300 border-amber-500/35 bg-amber-500/8',
  removed: 'text-rose-300 border-rose-500/35 bg-rose-500/8',
  fixed:   'text-sky-300 border-sky-500/35 bg-sky-500/8',
};

export default function ChangelogPanel() {
  return (
    <section className="space-y-3">
      <SectionDivider label="Updates" hint="Recent site changes & releases" />
      <div className="medieval-panel p-4 space-y-4 max-h-[440px] overflow-y-auto">
        {ENTRIES.map(entry => (
          <div key={entry.version}>
            <div className="flex items-baseline gap-2 mb-2 pb-1.5 border-b border-[color:var(--color-border)]">
              <span className="medieval-title text-[14px] text-gold-light">{entry.version}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">
                {entry.date}
              </span>
            </div>
            <ul className="space-y-1.5">
              {entry.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
                  <span className={`shrink-0 text-[8.5px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded border ${KIND_STYLE[c.kind]}`}>
                    {c.kind}
                  </span>
                  <span className="text-[#bba485] flex-1">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
