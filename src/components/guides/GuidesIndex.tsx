import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../ui';
import { IconBook } from '../shell/navIcons';

interface GuideMeta {
  slug: string;
  title: string;
  blurb: string;
  readTime: string;
  category: 'Crafting' | 'Refining' | 'Economy' | 'Markets';
}

const GUIDES: GuideMeta[] = [
  {
    slug: 'refining-city-guide',
    title: 'The complete Refining City guide',
    blurb: 'Which royal city refines which resource, what the +40 LPB bonus actually means in silver, and the only city you should refine in when stacked with focus.',
    readTime: '8 min read',
    category: 'Refining',
  },
  {
    slug: 'premium-vs-non-premium',
    title: 'Premium vs non-premium: is it worth the silver?',
    blurb: 'The math behind premium — laborer yield, tax breaks, learning point regen, and the gold-to-silver exchange rate. When premium pays for itself within a day and when it doesn\'t.',
    readTime: '6 min read',
    category: 'Economy',
  },
  {
    slug: 'focus-efficiency-guide',
    title: 'Where your 30k daily focus earns the most silver',
    blurb: 'Focus is the limiting factor in every serious crafting career. A walk through the silver-per-focus numbers for refining, crafting, cooking and laborer journals — and the answer changes per server.',
    readTime: '10 min read',
    category: 'Crafting',
  },
  {
    slug: 'transmutation-chain-strategy',
    title: 'Transmutation chain strategy: when low-enchant inputs beat the obvious play',
    blurb: 'Why chaining T5.2 → T5.3 → T6.3 can be more profitable than the direct T5.3 → T6.3 even when the math says otherwise — and the open-world drop logic that drives it.',
    readTime: '7 min read',
    category: 'Markets',
  },
];

const CATEGORY_STYLES: Record<GuideMeta['category'], string> = {
  Crafting: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Refining: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Economy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Markets: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export default function GuidesIndex() {
  usePageMeta({
    title: 'Albion Online Guides',
    description: 'Long-form Albion Online economy guides: refining city bonuses, premium ROI, focus efficiency, transmutation chain strategy, and more. Written for crafters, refiners and market players who want the math, not the meme.',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Long-form articles"
        title="Albion Online Guides"
        description="Practical economy and crafting guides written from real in-game numbers. Each article goes deep on one topic — no listicles, no SEO filler."
        icon={IconBook}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GUIDES.map(g => (
          <Link
            key={g.slug}
            to={`/guides/${g.slug}`}
            className="medieval-panel p-5 hover:border-gold/40 transition-colors group flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${CATEGORY_STYLES[g.category]}`}>
                {g.category}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{g.readTime}</span>
            </div>
            <h2 className="text-base font-bold text-zinc-100 group-hover:text-gold-light leading-snug">{g.title}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{g.blurb}</p>
            <div className="text-[10px] text-gold/70 group-hover:text-gold-light font-bold uppercase tracking-wider mt-auto">
              Read article →
            </div>
          </Link>
        ))}
      </div>

      <div className="text-[11px] text-zinc-500 leading-relaxed px-1 pt-2">
        Have a topic you want a guide on? Suggest it via the <Link to="/contact" className="text-gold hover:underline">Contact</Link> page —
        most articles here started as a community question that came up more than once.
      </div>
    </div>
  );
}
