import type { ReactNode } from 'react';

interface Props {
  /** Short section heading, e.g. "About the Crafting Calculator". */
  title: string;
  children: ReactNode;
}

/**
 * Long-form explanation block placed below the interactive part of a
 * tool page. The interactive UI stays at the top so power users aren't
 * pushed down; the explanation is for new players AND for search-engine
 * crawlers — most of the SEO content on the site lives in these blocks.
 *
 * Typography here intentionally matches the legal pages (~70ch, looser
 * line-height, slightly larger body text) so it reads like a guide
 * rather than another panel of UI.
 */
export default function ToolExplainer({ title, children }: Props) {
  return (
    <section className="mt-10 pt-6 border-t border-zinc-800 max-w-3xl mx-auto">
      <h2 className="medieval-title text-2xl mb-4">{title}</h2>
      <div className="prose-legal space-y-4 text-zinc-400 leading-relaxed text-[14px]">
        {children}
      </div>
    </section>
  );
}
