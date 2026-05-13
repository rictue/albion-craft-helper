import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell min-h-screen bg-bg">
      <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />
      <div className="flex">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <main className="flex-1 min-w-0">
          <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
      <footer className="border-t border-[color:var(--color-border)] mt-6 px-4 sm:px-6 lg:px-8 py-4 text-[10px] leading-relaxed text-zinc-600">
        Albioncrafts is an unofficial companion tool and is not affiliated with
        Sandbox Interactive or Albion Online. Market data sourced from the
        Albion Online Data Project — accuracy depends on community uploads.
      </footer>
    </div>
  );
}
