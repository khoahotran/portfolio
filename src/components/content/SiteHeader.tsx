import { Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 text-xs font-semibold uppercase tracking-wide transition ${
    isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-900'
  }`;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-12 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-3 px-4 md:px-6">
        <NavLink
          to="/"
          aria-label="Go to home"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-teal-400 hover:text-teal-600"
        >
          <Home size={16} />
        </NavLink>

        {/* overflow-x-auto: with the full set of destinations this doesn't fit on narrow
            screens without wrapping the header to multiple lines, so it scrolls horizontally
            instead. Split into two labeled <nav> landmarks below (Primary, Explore) so a
            first-time reader — sighted or on a screen reader — gets a grouping cue instead of
            one flat wall of equally-weighted links, and reordered so Projects and Search, the
            two destinations most load-bearing for a first-time technical reader, land inside
            the visible window on the narrowest tested viewports (320-390px) without scrolling. */}
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto sm:gap-5">
          <nav className="flex shrink-0 items-center gap-3 sm:gap-5" aria-label="Primary">
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
            <NavLink to="/projects" className={navClass}>
              Projects
            </NavLink>
            <NavLink to="/search" className={navClass}>
              Search
            </NavLink>
            <NavLink to="/graph" className={navClass}>
              Ecosystem
            </NavLink>
          </nav>

          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-slate-200" />
          {/* Purely visual — the adjacent nav's own aria-label already announces this
              grouping to assistive tech, so this text is hidden from the a11y tree to
              avoid announcing "Explore" twice back to back. */}
          <span
            aria-hidden="true"
            className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-300"
          >
            Explore
          </span>

          <nav className="flex shrink-0 items-center gap-3 sm:gap-5" aria-label="Explore">
            <NavLink to="/blog" className={navClass}>
              Blog
            </NavLink>
            <NavLink to="/research" className={navClass}>
              Research
            </NavLink>
            <NavLink to="/experiments" className={navClass}>
              Experiments
            </NavLink>
            <NavLink to="/labs" className={navClass}>
              Labs
            </NavLink>
            <NavLink to="/system-design" className={navClass}>
              System Design
            </NavLink>
            <NavLink to="/field-notes" className={navClass}>
              Field Notes
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
