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
  IconParchment,
  IconShield,
  IconFlame,
  IconCrown,
  IconBook,
  IconHoof,
  IconIsland,
  IconCrate,
  IconAnvil,
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
      { to: '/planner',    label: 'Craft Planner',       blurb: 'Queue items + see aggregate material totals.',        icon: IconParchment },
    ],
  },
  {
    title: 'Economy',
    items: [
      { to: '/laborers',   label: 'Laborer Calculator',  blurb: 'House, journal, happiness and upgrade ROI.',                  icon: IconLaborer, badge: 'NEW' },
      { to: '/transmute',  label: 'Transmutation Profit', blurb: 'Auto-fill recipe cost, live profit/ROI, batch compare flips.', icon: IconFurnace, badge: 'NEW' },
      { to: '/capes',      label: 'Cape Converter',      blurb: 'Plain cape → faction cape upgrade margin.',   icon: IconShield },
      { to: '/portfolio',  label: 'Portfolio',           blurb: 'Track silver positions across items.',        icon: IconPouch },
    ],
  },
  {
    title: 'Market',
    items: [
      { to: '/prices',   label: 'Market Prices',  blurb: 'Browse live AODP prices, all cities, all enchants.', icon: IconScales },
      { to: '/history',  label: 'Price History',  blurb: 'Daily averages per item across the week.',           icon: IconLedger },
      { to: '/gold',     label: 'Gold Prices',    blurb: 'Premium gold spot history and trends.',              icon: IconCrown },
      { to: '/database', label: 'Custom Prices',  blurb: 'Override stale AODP data with your own numbers.',    icon: IconParchment },
    ],
  },
  {
    title: 'Records',
    items: [
      { to: '/craft-history', label: 'Profit History', blurb: 'Log finished runs to see real margin over time.', icon: IconLedger },
      { label: 'Tax Calculator',     blurb: 'Per-sale premium vs non-premium tax compare.',    icon: IconAnvil,    badge: 'SOON', disabled: true },
      { label: 'Return Rate Reference', blurb: 'RR by city, focus, and spec — quick lookup.',   icon: IconBook,     badge: 'SOON', disabled: true },
      { label: 'Favorites',          blurb: 'Pin your most-used tools and items.',              icon: IconCrown,    badge: 'SOON', disabled: true },
    ],
  },
];

export const GUIDES_DROPDOWN: MegaSection[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Economy Basics',  blurb: 'How silver flows in Albion — taxes, fees, premium.',     icon: IconBook,  badge: 'SOON', disabled: true },
      { label: 'Crafting Basics', blurb: 'Item value, return rate, station fees — first crafts.',  icon: IconHammer, badge: 'SOON', disabled: true },
      { label: 'Refining Basics', blurb: 'LPB, city bonuses, focus — the core daily loop.',        icon: IconFurnace, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Advanced Economy',
    items: [
      { label: 'Focus Usage Guide',  blurb: 'Where 30K daily focus earns the most silver.',     icon: IconFlame,    badge: 'SOON', disabled: true },
      { label: 'City Bonus Guide',   blurb: 'Which city for which weapon, armor or resource.',  icon: IconCrown,    badge: 'SOON', disabled: true },
      { label: 'Buy Order Strategy', blurb: 'Patient buying with order spreads + market depth.', icon: IconScales,   badge: 'SOON', disabled: true },
      { label: 'Transport Risk',     blurb: 'Mount choice, route weight, dirt-road tradeoffs.',  icon: IconShield,   badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Mounts & Farming',
    items: [
      { label: 'Swiftclaw Breeding', blurb: 'Kennel build, cub price, food math, sell margin.',  icon: IconHoof,  badge: 'SOON', disabled: true },
      { label: 'Direwolf Breeding',  blurb: 'T6 carnivore pipeline + cabbage feed budget.',      icon: IconHoof,  badge: 'SOON', disabled: true },
      { label: 'Animal Feed Guide',  blurb: 'Cheapest meat per silver across crops + butchers.', icon: IconCrate, badge: 'SOON', disabled: true },
      { label: 'Island Setup',       blurb: 'Plot allocation for kennels, farms, houses.',       icon: IconIsland, badge: 'SOON', disabled: true },
    ],
  },
];

export const HEADER: HeaderEntry[] = [
  { kind: 'link', to: '/calculator', label: 'Crafting' },
  { kind: 'link', to: '/refining',   label: 'Refining' },
  { kind: 'link', to: '/cooking',    label: 'Cooking' },
  { kind: 'link', to: '/laborers',   label: 'Laborers' },
  { kind: 'link', to: '/prices',     label: 'Market' },
  { kind: 'mega', label: 'Tools',  sections: TOOLS_DROPDOWN,  minWidth: 880 },
  { kind: 'mega', label: 'Guides', sections: GUIDES_DROPDOWN, minWidth: 760 },
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
