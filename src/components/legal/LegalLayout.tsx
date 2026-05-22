import type { ReactNode } from 'react';

interface Props {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

/**
 * Shared layout for the four legal/info pages (About, Privacy, Terms,
 * Contact). Constrains line-length to ~70ch for readability and applies
 * the same typography rhythm so the pages feel cohesive — important
 * because these are the pages AdSense reviewers actually read.
 */
export default function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <article className="max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <header className="mb-6 pb-4 border-b border-zinc-800">
        <h1 className="medieval-title text-3xl sm:text-4xl mb-2">{title}</h1>
        {lastUpdated && (
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
            Last updated: {lastUpdated}
          </p>
        )}
      </header>
      <div className="prose-legal space-y-5 text-zinc-300 leading-relaxed text-[15px]">
        {children}
      </div>
    </article>
  );
}
