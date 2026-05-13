/**
 * Sidebar navigation structure for the new companion-site layout.
 *
 * Sections are rendered in order. Each section has a heading + a flat list of
 * routes. The icons are inline SVG paths (medieval / crafting motifs) so we
 * don't ship a dependency or extra HTTP request.
 */

import type { ReactNode } from 'react';
import {
  IconDashboard,
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
} from './navIcons';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Optional short hint shown in tooltips / detail rows. */
  hint?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/',          label: 'Dashboard',         icon: IconDashboard, hint: 'At-a-glance market + craft summary' },
    ],
  },
  {
    title: 'Crafting Hall',
    items: [
      { to: '/calculator', label: 'Crafting Calculator', icon: IconHammer,  hint: 'Per-item profit, fees, focus' },
      { to: '/refining',   label: 'Refining',            icon: IconFurnace, hint: 'Raw → refined with RR + focus' },
      { to: '/cooking',    label: 'Cooking',             icon: IconFlame,   hint: 'Recipe-by-recipe meal profit' },
      { to: '/laborers',   label: 'Laborers',            icon: IconLaborer, hint: 'House, journal, ROI on upgrade' },
    ],
  },
  {
    title: 'Market Watch',
    items: [
      { to: '/flipper',      label: 'Market Flipper',   icon: IconScales,    hint: 'City spread + ROI scanner' },
      { to: '/bm-runner',    label: 'BM Runner',        icon: IconPouch,     hint: 'Caerleon Black Market routes' },
      { to: '/suggested',    label: 'Suggested Crafts', icon: IconShield,    hint: 'Demand-driven craft picks' },
      { to: '/blackmarket',  label: 'Black Market',     icon: IconPouch,     hint: 'BM-only suggested crafts' },
      { to: '/transmute',    label: 'Transmutation',    icon: IconFurnace,   hint: 'Low-tier → high-tier resources' },
      { to: '/capes',        label: 'Cape Converter',   icon: IconShield,    hint: 'Faction cape upgrade margin' },
      { to: '/grind',        label: 'Grind Calcs',      icon: IconHammer,    hint: 'Enchanting, alchemy, etc.' },
      { to: '/prices',       label: 'Prices',           icon: IconParchment, hint: 'Browse live AODP prices' },
      { to: '/history',      label: 'Price History',    icon: IconLedger,    hint: 'Daily averages by item' },
      { to: '/gold',         label: 'Gold Prices',      icon: IconCrown,     hint: 'Premium gold spot history' },
    ],
  },
  {
    title: 'Records',
    items: [
      { to: '/craft-history', label: 'Profit History',  icon: IconLedger,    hint: 'Log past sessions' },
      { to: '/planner',       label: 'Craft Planner',   icon: IconParchment, hint: 'Queue + plan crafts' },
      { to: '/portfolio',     label: 'Portfolio',       icon: IconPouch,     hint: 'Track silver positions' },
      { to: '/database',      label: 'Custom Prices',   icon: IconLedger,    hint: 'Manual price overrides' },
    ],
  },
  {
    title: 'Community',
    items: [
      { to: '/players',  label: 'Players',       icon: IconShield,    hint: 'Player profile search' },
      { to: '/guilds',   label: 'Guilds',        icon: IconCrown,     hint: 'Guild profile search' },
      { to: '/killboard',label: 'Killboard',     icon: IconShield,    hint: 'Recent kill feed' },
      { to: '/top-fame', label: 'Top Kill Fame', icon: IconCrown,     hint: 'Fame leaderboard' },
      { to: '/meta',     label: 'Meta Items',    icon: IconBook,      hint: 'Popular items reference' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/profile',  label: 'Profile',  icon: IconShield, hint: 'Discord-linked profile' },
      { to: '/settings', label: 'Settings', icon: IconCog,    hint: 'Defaults & preferences' },
    ],
  },
];

/** Flat list of all routes that have a sidebar entry. */
export const ALL_NAV_ROUTES: string[] = SIDEBAR_SECTIONS.flatMap(s => s.items.map(i => i.to));
