import { Link } from 'react-router-dom';
import { SectionDivider, RiskBadge } from '../../ui';
import type { RiskLevel } from '../../ui';
import { IconFurnace, IconHammer, IconLaborer, IconFlame } from '../../shell/navIcons';

/**
 * Curated strategy cards. These are evergreen plays in Albion — not live
 * market-derived signals (we don't have a reliable bulk-scan source). Each
 * card describes the play, points to the relevant calculator, and shows a
 * risk badge so the user can pick by appetite.
 */

interface Opportunity {
  title: string;
  blurb: string;
  to: string;
  risk: RiskLevel;
  icon: React.ReactNode;
  /** Headline number — purely indicative, real value depends on user prices. */
  headline: string;
  headlineLabel: string;
}

const OPPORTUNITIES: Opportunity[] = [
  {
    title: 'Refining loop in royal city',
    blurb: 'Wood/Fiber/Hide/Ore/Stone at your specialty city + focus.',
    to: '/refining',
    risk: 'low',
    icon: IconFurnace,
    headline: '8-15%',
    headlineLabel: 'typical net margin',
  },
  {
    title: 'Daily laborer journals',
    blurb: 'Empty journal → fill via crafting fame → sell filled.',
    to: '/laborers',
    risk: 'low',
    icon: IconLaborer,
    headline: '~2M',
    headlineLabel: '/day · T6 stack',
  },
  {
    title: 'Cooking meals for ZvZ',
    blurb: 'Pies and soups churn during prime time — bulk-cook in farm cities.',
    to: '/cooking',
    risk: 'medium',
    icon: IconFlame,
    headline: '15-25%',
    headlineLabel: 'margin in low-supply tiers',
  },
  {
    title: 'Targeted item craft',
    blurb: 'Pick a specific item, dial in fees + focus, sell to BM or city.',
    to: '/calculator',
    risk: 'medium',
    icon: IconHammer,
    headline: 'Varies',
    headlineLabel: 'item-by-item',
  },
];

export default function ProfitOpportunitiesPanel() {
  return (
    <section className="space-y-3">
      <SectionDivider label="Profit Opportunities" hint="Evergreen plays · your prices, your math" />
      <div className="space-y-2">
        {OPPORTUNITIES.map(o => (
          <Link
            key={o.to}
            to={o.to}
            className="tool-card flex items-start gap-3 p-3 rounded-md hover:-translate-y-0.5 transition-all"
          >
            <div className="icon-frame relative z-10 h-10 w-10 rounded-md text-gold-light shrink-0">{o.icon}</div>
            <div className="relative z-10 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="medieval-title text-[13px] leading-tight truncate">{o.title}</div>
                <RiskBadge level={o.risk} />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[#a89175]">{o.blurb}</p>
            </div>
            <div className="relative z-10 text-right shrink-0 pl-2">
              <div className="text-[15px] font-black tabular-nums text-gold-light leading-none">
                {o.headline}
              </div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-500 mt-1">
                {o.headlineLabel}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="text-[10px] text-zinc-500 px-1 pt-1 leading-relaxed">
        Numbers are indicative ranges; open each calculator for your actual price-driven result.
      </div>
    </section>
  );
}
