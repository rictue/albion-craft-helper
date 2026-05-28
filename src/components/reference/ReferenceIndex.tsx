/**
 * Reference hub — links out to the individual data/reference pages.
 * Mirrors the structure of the Guides index so the two informational
 * sections feel consistent.
 */

import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../ui';
import { IconBook, IconCrown, IconFurnace, IconScales } from '../shell/navIcons';
import type { ReactNode } from 'react';

interface RefCard {
  to: string;
  title: string;
  blurb: string;
  icon: ReactNode;
}

const CARDS: RefCard[] = [
  {
    to: '/reference/city-bonuses',
    title: 'City Bonus Reference',
    blurb: 'Which royal city specializes in each weapon, armor piece, off-hand and refined resource.',
    icon: IconCrown,
  },
  {
    to: '/reference/return-rates',
    title: 'Return Rate Reference',
    blurb: 'Exact return rates for refining and crafting, with and without city bonus and focus.',
    icon: IconFurnace,
  },
  {
    to: '/reference/item-values',
    title: 'Item Value & Enchant',
    blurb: 'Item value by tier and enchant level — the number behind station fee / nutrition math.',
    icon: IconBook,
  },
  {
    to: '/reference/market-fees',
    title: 'Market Tax & Fees',
    blurb: 'Sales tax, setup fee, and direct-trade rates for every buy and sell route.',
    icon: IconScales,
  },
];

export default function ReferenceIndex() {
  usePageMeta({
    title: 'Reference Tables',
    description: 'Albion Online reference tables: city specialization bonuses, return rate math, item values by tier and enchant, and marketplace tax and fee rates. The data behind every calculator on AlbionCrafts.',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference"
        title="Reference Tables"
        description="Quick-lookup data tables that back the calculators — city bonuses, return rates, item values, and marketplace fees. Every number here is pulled from the same source the tools use, so it can never drift out of sync."
        icon={IconBook}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className="medieval-panel p-4 flex items-start gap-3 transition-colors hover:border-gold/40 group"
          >
            <div className="icon-frame h-10 w-10 rounded-md shrink-0 text-gold-light">{card.icon}</div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-100 group-hover:text-gold-light">{card.title}</h2>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{card.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
