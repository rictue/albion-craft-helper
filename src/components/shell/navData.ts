/**
 * Navigation data for the top header — mega dropdowns + simple link items.
 *
 * Each top-level entry is either:
 *  - { kind: 'link', to, label }     — direct link in the header
 *  - { kind: 'mega', label, sections } — opens a mega dropdown panel
 *
 * Mega dropdown sections group related tools under a column heading; each
 * tool has icon, title, one-line blurb, optional badge, and a link.
 * Items with `disabled: true` render as "coming soon" — they don't link
 * anywhere and have a Soon chip.
 */

import type { ReactNode } from 'react';
import {
  IconCog,
  IconShield,
  IconCrown,
  IconBook,
  IconScales,
  IconFurnace,
  IconSearch,
} from './navIcons';

export type Badge = 'NEW' | 'HOT' | 'POPULAR' | 'SOON' | 'BETA';

export interface MegaItem {
  to?: string;
  label: string;
  blurb: string;
  icon: ReactNode;
  badge?: Badge;
  /** Coming soon — disables click, applies muted style + Soon chip. */
  disabled?: boolean;
}

export interface MegaSection {
  title: string;
  items: MegaItem[];
}

export type HeaderEntry =
  | { kind: 'link'; to: string; label: string }
  | { kind: 'mega'; label: string; sections: MegaSection[]; minWidth?: number };

// Community lives in its own mega dropdown to the right of Guides —
// player / guild / killboard lookups are a distinct workflow from the
// economy tools, so giving them their own header chip keeps the main
// nav scannable while still surfacing them in one click.
export const COMMUNITY_DROPDOWN: MegaSection[] = [
  {
    title: 'Community',
    items: [
      { to: '/players',  label: 'Player Search', blurb: 'Look up player profile, kills, fame.',   icon: IconShield },
      { to: '/guilds',   label: 'Guild Search',  blurb: 'Guild composition, recent activity.',    icon: IconCrown },
      { to: '/killboard',label: 'Killboard',     blurb: 'Recent kill feed across the server.',    icon: IconShield },
      { to: '/top-fame', label: 'Top Kill Fame', blurb: 'Daily / weekly fame leaderboards.',      icon: IconCrown },
      { to: '/meta',     label: 'Meta Items',    blurb: 'Popular items reference.',               icon: IconBook },
    ],
  },
];

// Reference / data tables — pure look-up content (city bonuses, RR math,
// item values, fees). Distinct from Guides (long-form articles).
export const REFERENCE_DROPDOWN: MegaSection[] = [
  {
    title: 'Reference',
    items: [
      { to: '/reference/city-bonuses',     label: 'City Bonuses',      blurb: 'Crafting + refining specialization per city.', icon: IconCrown },
      { to: '/reference/return-rates',     label: 'Return Rates',      blurb: 'RR by city bonus + focus, the LPB math.',      icon: IconFurnace },
      { to: '/reference/resources-biomes', label: 'Resources & Biomes', blurb: 'Resource lines, home city, raw-per-tier.',    icon: IconFurnace },
      { to: '/reference/item-values',      label: 'Item Values',       blurb: 'Value by tier + enchant (station fee math).',  icon: IconBook },
      { to: '/reference/market-fees',      label: 'Market Tax & Fees', blurb: 'Sales tax, setup fee, direct-trade rates.',   icon: IconScales },
      { to: '/timers',                     label: 'Timers',            blurb: 'Daily / weekly reset + market refresh.',       icon: IconBook },
    ],
  },
];

// All tabs live directly in the header now — the old Tools mega
// dropdown got dissolved by user request. The first five entries are
// fixed in this order (most-used tabs at the start); secondary tools
// trail after Market, then Guides + Community sit at the right end.
export const HEADER: HeaderEntry[] = [
  { kind: 'link', to: '/calculator',    label: 'Crafting' },
  { kind: 'link', to: '/refining',      label: 'Refining' },
  { kind: 'link', to: '/cooking',       label: 'Cooking' },
  { kind: 'link', to: '/transmute',     label: 'Transmute' },
  { kind: 'link', to: '/market',        label: 'Market' },
  { kind: 'link', to: '/laborers',      label: 'Laborers' },
  { kind: 'link', to: '/portfolio',     label: 'Portfolio' },
  { kind: 'link', to: '/mastery',       label: 'Mastery' },
  { kind: 'link', to: '/gold',          label: 'Gold' },
  { kind: 'link', to: '/craft-history', label: 'History' },
  { kind: 'link', to: '/guides',        label: 'Guides' },
  { kind: 'mega', label: 'Reference', sections: REFERENCE_DROPDOWN, minWidth: 320 },
  { kind: 'mega', label: 'Community', sections: COMMUNITY_DROPDOWN, minWidth: 320 },
];

/** Profile + Settings live in the user/account dropdown on the right. */
export const ACCOUNT_DROPDOWN: MegaSection[] = [
  {
    title: 'Account',
    items: [
      { to: '/profile',  label: 'Profile',       blurb: 'Discord-linked profile + saved data.',   icon: IconShield },
      { to: '/settings', label: 'Settings',      blurb: 'Defaults, tax, server, focus, prices.',  icon: IconCog },
    ],
  },
];

export { IconSearch };
