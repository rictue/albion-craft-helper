import { NavLink } from 'react-router-dom';

export default function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gold/20 text-gold border border-gold/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-light'
    }`;

  return (
    <header className="border-b border-surface-lighter bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gold tracking-wide">
            ALBION CRAFT HELPER
          </h1>
        </div>
        <nav className="flex gap-2">
          <NavLink to="/" className={linkClass}>Calculator</NavLink>
          <NavLink to="/suggested" className={linkClass}>Suggested</NavLink>
          <NavLink to="/planner" className={linkClass}>Planner</NavLink>
          <NavLink to="/database" className={linkClass}>Database</NavLink>
        </nav>
      </div>
    </header>
  );
}
