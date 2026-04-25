/**
 * Two-column layout: sticky config sidebar + scrollable main panel.
 *
 * Used by SimpleRefine, IslandPlanner, and (post-overhaul) Cooking. The
 * sidebar collapses on mobile (< lg) so config and results stack
 * vertically instead of fighting for width.
 */

import type { ReactNode } from 'react';

interface Props {
  /** Optional accent breadcrumb shown above the layout */
  breadcrumb?: ReactNode;
  /** Sidebar content — usually a stack of <surface p-4> step cards */
  sidebar: ReactNode;
  /** Main content — calculator output, results, etc. */
  children: ReactNode;
  /** Sidebar width in pixels (default 340) */
  sidebarWidth?: number;
}

export default function SidebarLayout({ breadcrumb, sidebar, children, sidebarWidth = 340 }: Props) {
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-10">
      {breadcrumb && (
        <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-[0.22em] text-zinc-600 font-semibold">
          {breadcrumb}
        </div>
      )}
      <div
        className="grid grid-cols-1 gap-5 items-start"
        style={{ gridTemplateColumns: `1fr` }}
      >
        <div className="lg:grid lg:gap-5 lg:items-start" style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}>
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 mb-5 lg:mb-0">
            {sidebar}
          </aside>
          <div className="space-y-3 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
