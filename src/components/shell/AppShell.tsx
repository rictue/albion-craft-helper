import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import TopNav from './TopNav';

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  return (
    <div className="app-shell min-h-screen bg-bg">
      <TopNav />
      <main className="min-w-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1500px] mx-auto">
          {children}
        </div>
      </main>
      <footer className="border-t border-[color:var(--color-border)] mt-6 px-4 sm:px-6 lg:px-8 py-5 text-[11px] leading-relaxed text-zinc-500 max-w-[1500px] mx-auto">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-zinc-400 font-semibold">
          <Link to="/guides" className="hover:text-gold-light">Guides</Link>
          <Link to="/about" className="hover:text-gold-light">About</Link>
          <Link to="/privacy" className="hover:text-gold-light">Privacy</Link>
          <Link to="/terms" className="hover:text-gold-light">Terms</Link>
          <Link to="/contact" className="hover:text-gold-light">Contact</Link>
          <a
            href="https://github.com/rictue/albion-craft-helper"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold-light"
          >
            GitHub
          </a>
        </nav>
        <p className="text-zinc-600">
          Albioncrafts is an unofficial companion tool and is not affiliated with
          Sandbox Interactive or Albion Online. Market data sourced from the{' '}
          <a
            href="https://www.albion-online-data.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 underline"
          >
            Albion Online Data Project
          </a>{' '}
          — accuracy depends on community uploads. News and patch notes via the
          Steam Web API.
        </p>
      </footer>
    </div>
  );
}
