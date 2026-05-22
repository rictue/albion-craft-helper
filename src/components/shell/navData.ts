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

// All tabs live directly in the header now — the old Tools mega
// dropdown got dissolved by user request. The first five entries are
// fixed in this order (most-used tabs at the start); secondary tools
// trail after Market.
export const HEADER: HeaderEntry[] = [
  { kind: 'link', to: '/calculator',    label: 'Crafting' },
  { kind: 'link', to: '/refining',      label: 'Refining' },
  { kind: 'link', to: '/cooking',       label: 'Cooking' },
  { kind: 'link', to: '/transmute',     label: 'Transmutation' },
  { kind: 'link', to: '/market',        label: 'Market' },
  { kind: 'link', to: '/laborers',      label: 'Laborers' },
  { kind: 'link', to: '/portfolio',     label: 'Portfolio' },
  { kind: 'link', to: '/gold',          label: 'Gold' },
  { kind: 'link', to: '/craft-history', label: 'History' },
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
