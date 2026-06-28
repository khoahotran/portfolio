import { Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-xs font-semibold uppercase tracking-wide transition ${
    isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-900'
  }`;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-12 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <NavLink
          to="/"
          aria-label="Go to home"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-teal-400 hover:text-teal-600"
        >
          <Home size={16} />
        </NavLink>

        <nav className="flex items-center gap-3 sm:gap-5">
          <NavLink to="/about" className={navClass}>
            About
          </NavLink>
          <NavLink to="/graph" className={navClass}>
            Ecosystem
          </NavLink>
          <NavLink to="/blog" className={navClass}>
            Blog
          </NavLink>
          <NavLink to="/research" className={navClass}>
            Research
          </NavLink>
          <NavLink to="/experiments" className={navClass}>
            Experiments
          </NavLink>
          <NavLink to="/system-design" className={navClass}>
            System Design
          </NavLink>
          <NavLink to="/field-notes" className={navClass}>
            Field Notes
          </NavLink>
          <NavLink to="/search" className={navClass}>
            Search
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
