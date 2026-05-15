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
  IconHammer,
  IconFurnace,
  IconLaborer,
  IconScales,
  IconLedger,
  IconCog,
  IconPouch,
  IconShield,
  IconFlame,
  IconCrown,
  IconBook,
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

export const TOOLS_DROPDOWN: MegaSection[] = [
  {
    title: 'Crafting',
    items: [
      { to: '/calculator', label: 'Crafting Calculator', blurb: 'Cost, return rate, focus and net profit for any item.', icon: IconHammer, badge: 'POPULAR' },
      { to: '/refining',   label: 'Refining Calculator', blurb: 'Raw → refined chain with city + focus + transport.',  icon: IconFurnace, badge: 'POPULAR' },
      { to: '/cooking',    label: 'Cooking Calculator',  blurb: 'Recipe-by-recipe meal profit with city bonus.',       icon: IconFlame },
    ],
  },
  {
    title: 'Economy',
    items: [
      { to: '/laborers',   label: 'Laborer Calculator',  blurb: 'House, journal, happiness and upgrade ROI.',                  icon: IconLaborer, badge: 'NEW' },
      { to: '/transmute',  label: 'Transmutation Profit', blurb: 'Auto-fill recipe cost, live profit/ROI, batch compare flips.', icon: IconFurnace, badge: 'NEW' },
      { to: '/portfolio',  label: 'Portfolio',           blurb: 'Track silver positions across items.',        icon: IconPouch },
    ],
  },
  {
    title: 'Market',
    items: [
      { to: '/market', label: 'Market Browser', blurb: 'Live AODP prices for every item, per city.', icon: IconScales },
      { to: '/gold',   label: 'Gold Prices',    blurb: 'Premium gold spot history and trends.',      icon: IconCrown },
    ],
  },
  {
    title: 'Records',
    items: [
      { to: '/craft-history', label: 'Profit History', blurb: 'Log finished runs to see real margin over time.', icon: IconLedger },
    ],
  },
];

export const HEADER: HeaderEntry[] = [
  { kind: 'link', to: '/calculator', label: 'Crafting' },
  { kind: 'link', to: '/refining',   label: 'Refining' },
  { kind: 'link', to: '/cooking',    label: 'Cooking' },
  { kind: 'link', to: '/laborers',   label: 'Laborers' },
  { kind: 'link', to: '/market',     label: 'Market' },
  { kind: 'mega', label: 'Tools',  sections: TOOLS_DROPDOWN,  minWidth: 880 },
];

/** Community + Account live in the user/account dropdown on the right. */
export const ACCOUNT_DROPDOWN: MegaSection[] = [
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
  {
    title: 'Account',
    items: [
      { to: '/profile',  label: 'Profile',       blurb: 'Discord-linked profile + saved data.',   icon: IconShield },
      { to: '/settings', label: 'Settings',      blurb: 'Defaults, tax, server, focus, prices.',  icon: IconCog },
    ],
  },
];

export { IconSearch };
