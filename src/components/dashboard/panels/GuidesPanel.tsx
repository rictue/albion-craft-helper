import { SectionDivider } from '../../ui';

interface Guide {
  title: string;
  excerpt: string;
  tags: Array<{ label: string; tone?: 'gold' | 'green' | 'red' | 'neutral' }>;
  readMinutes?: number;
  /** Coming soon — show placeholder card without link. */
  comingSoon?: boolean;
}

const GUIDES: Guide[] = [
  {
    title: 'Refining return rate, focus and city bonuses',
    excerpt: 'Why LPB matters more than raw RR %, and how to pick the right city for your specialty.',
    tags: [{ label: 'Beginner', tone: 'green' }, { label: 'Refining' }],
    readMinutes: 7,
    comingSoon: true,
  },
  {
    title: 'Reading AODP data — when to trust it',
    excerpt: 'Stale slices, thin orderbooks, premium tax flips: pitfalls for new flippers.',
    tags: [{ label: 'Intermediate', tone: 'gold' }, { label: 'Market' }],
    readMinutes: 9,
    comingSoon: true,
  },
  {
    title: 'Laborer ROI: when to upgrade your house',
    excerpt: 'T6 → T7 → T8 payback math, factoring journal price and happiness upkeep.',
    tags: [{ label: 'Intermediate', tone: 'gold' }, { label: 'Income' }],
    readMinutes: 6,
    comingSoon: true,
  },
  {
    title: 'Focus budget allocation across resources',
    excerpt: 'Where 30K daily focus earns the most silver — and when it doesn\'t.',
    tags: [{ label: 'Advanced', tone: 'red' }, { label: 'Focus' }],
    readMinutes: 10,
    comingSoon: true,
  },
];

const TONE_CLASS: Record<NonNullable<Guide['tags'][number]['tone']>, string> = {
  gold:    'text-gold-light bg-gold/10 border-gold/30',
  green:   'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  red:     'text-rose-300 bg-rose-500/10 border-rose-500/30',
  neutral: 'text-zinc-400 bg-zinc-700/20 border-zinc-600/30',
};

export default function GuidesPanel() {
  return (
    <section className="space-y-3">
      <SectionDivider label="Guides" hint="Coming soon — economy & crafting deep dives" />
      <div className="space-y-2">
        {GUIDES.map(g => (
          <article key={g.title} className="tool-card p-4 rounded-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {g.tags.map(t => (
                  <span
                    key={t.label}
                    className={`text-[9px] uppercase tracking-[0.16em] font-bold px-1.5 py-0.5 rounded border ${TONE_CLASS[t.tone ?? 'neutral']}`}
                  >
                    {t.label}
                  </span>
                ))}
                {g.comingSoon && (
                  <span className="text-[9px] uppercase tracking-[0.16em] font-bold px-1.5 py-0.5 rounded border text-zinc-400 bg-zinc-700/40 border-zinc-600/50">
                    Soon
                  </span>
                )}
                {g.readMinutes !== undefined && (
                  <span className="ml-auto text-[10px] text-zinc-500">{g.readMinutes} min read</span>
                )}
              </div>
              <h3 className="medieval-title text-[14px] leading-snug">{g.title}</h3>
              <p className="mt-1 text-[12px] text-[#a89175] leading-relaxed">{g.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
