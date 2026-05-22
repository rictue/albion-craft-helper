import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  intro: string;
  /** Optional minute estimate shown next to the title (e.g. "8 min read"). */
  readTime?: string;
  /** Optional last-updated date for credibility — these guides go stale fast. */
  lastUpdated?: string;
  children: ReactNode;
}

/** Layout shared by every long-form guide. Constrains line length, applies
 *  consistent heading + paragraph rhythm, and links back to the guides
 *  index so readers can jump between articles. */
export default function GuideLayout({ title, intro, readTime, lastUpdated, children }: Props) {
  return (
    <article className="max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link to="/guides" className="hover:text-gold-light">← All guides</Link>
      </nav>
      <header className="mb-6 pb-4 border-b border-zinc-800">
        <h1 className="medieval-title text-3xl sm:text-4xl mb-3">{title}</h1>
        <p className="text-zinc-400 leading-relaxed text-[15px]">{intro}</p>
        <div className="flex items-center gap-4 mt-4 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
          {readTime && <span>{readTime}</span>}
          {lastUpdated && <span>Updated {lastUpdated}</span>}
        </div>
      </header>
      <div className="prose-legal space-y-5 text-zinc-300 leading-relaxed text-[15px]">
        {children}
      </div>
      <footer className="mt-10 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
        Cross-check any number you see in this guide against the in-game market
        before risking serious silver — the patches don't wait for the wiki.
      </footer>
    </article>
  );
}
