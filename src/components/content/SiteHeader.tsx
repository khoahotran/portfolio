import { Moon, Search, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import CommandPalette from '../ui/CommandPalette';
import { useTheme } from '../../theme/useTheme';

/**
 * Four destinations, and nothing that scrolls.
 *
 * The previous header carried eleven equally weighted links in a horizontally scrolling strip. It
 * overflowed at 1440px — "Tags" rendered as a clipped "T" on a standard desktop — and at 390px a
 * reader saw four of the eleven with no affordance for the rest. The scroll-position fades added
 * for that strip were solving the wrong problem: the fault was never that the overflow was
 * unsignposted, it was that eleven peer destinations is a sitemap rather than a navigation.
 *
 * What the five writing collections cost here was the whole argument: Blog, Research, Experiments,
 * System Design and Field Notes are the author's taxonomy, and they now live as filters inside
 * Writing. Their routes are untouched — see WritingIndexPage.
 *
 * Four labels total about 210px at 320px wide, so the same markup serves every breakpoint: no
 * hamburger, no scroll strip, no fade. Cmd-K is an accelerator layered on top, never the way in —
 * the four labels stay visible for a reader who has never pressed it.
 */

const navClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-control px-1 py-1 text-micro font-medium transition-colors sm:px-2 sm:text-meta ${
    isActive ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'
  }`;

function SiteHeader() {
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-1 px-3 sm:gap-2 sm:px-4 md:px-6">
          {/* The wordmark doubles as the home link, which is what the house icon used to do with
              no label at all. A name is the right thing to lead a personal site with. */}
          {/* Initials below 640px. Four labels plus two controls plus the full wordmark measured
              411px against a 320px viewport — the gate caught it — and the name is the one element
              here that a reader can still identify from two letters. */}
          <NavLink
            to="/"
            aria-label="Khoa Tran, home"
            className="mr-auto shrink-0 font-display text-meta font-bold tracking-tight text-slate-900 transition-colors hover:text-teal-700 sm:text-body"
          >
            <span className="sm:hidden" aria-hidden="true">
              KT
            </span>
            <span className="hidden sm:inline" aria-hidden="true">
              Khoa Tran
            </span>
          </NavLink>

          <nav className="flex items-center gap-0.5 sm:gap-2" aria-label="Primary">
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
            <NavLink to="/projects" className={navClass}>
              Work
            </NavLink>
            <NavLink to="/writing" className={navClass}>
              Writing
            </NavLink>
            <NavLink to="/labs" className={navClass}>
              Labs
            </NavLink>
          </nav>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search the site"
            className="ml-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-slate-200 text-slate-600 transition hover:border-teal-400 hover:text-teal-700 sm:h-8 sm:w-8"
          >
            <Search size={15} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-slate-200 text-slate-600 transition hover:border-teal-400 hover:text-teal-700 sm:h-8 sm:w-8"
          >
            {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

export default SiteHeader;
