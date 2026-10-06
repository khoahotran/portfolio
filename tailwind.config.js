/**
 * Design tokens for the portfolio.
 *
 * Before this, `theme.extend` was empty and there were zero `dark:` variants in `src/` — despite
 * `.ai/constitution.md` §4 listing dark mode as something not to break. 885 colour classes across
 * 43 files hardcoded the palette, so adding `dark:` variants one by one was not realistic.
 *
 * Instead the palettes themselves are CSS variables, defined in `src/index.css` under `:root` and
 * `.dark`. `bg-slate-50`, `text-slate-900`, `border-slate-200` and the rest keep their names and
 * become theme-aware for free. The light values are the literal Tailwind v3 ramps, so light mode is
 * unchanged — that equivalence is the safety net for a change this wide.
 *
 * `<alpha-value>` is what keeps `/80`-style opacity modifiers working through the variable
 * indirection; without it `bg-slate-900/50` silently produces an invalid colour.
 */
const ramp = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [
      step,
      `rgb(var(--c-${name}-${step}) / <alpha-value>)`,
    ])
  );

export default {
  /**
   * `./content/**` matters more than it looks. The articles embed raw HTML for their
   * "View Interactive Benchmark" CTAs, and those class names live only in Markdown — so with the
   * previous globs Tailwind purged every one of them. `bg-teal-600` appears in 8 content files and
   * generated exactly zero CSS rules, which means every article's primary call to action had been
   * rendering as white text on the page background: invisible. Verified against the built CSS.
   */
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './content/**/*.md'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: ramp('slate'),
        teal: ramp('teal'),
        emerald: ramp('emerald'),
        sky: ramp('sky'),
        rose: ramp('rose'),
        amber: ramp('amber'),
        indigo: ramp('indigo'),

        /**
         * Role tokens for the cases a reversible ramp cannot express, because the same step is
         * doing two different jobs. These are named by role and rewritten at the call site.
         *
         * - `surface` — a raised card on the page background. Was `bg-white`, which had to be split
         *   from `text-white`: a card background must darken in dark mode, but the white text on a
         *   filled button must not.
         * - `inverse` — the primary filled button: maximum contrast against the page, so it flips
         *   from near-black in light mode to near-white in dark. Was `bg-slate-900 text-white`,
         *   which would have become white-on-white once slate-900 inverted.
         * - `panel` — a deliberately dark display surface (code-style cards, stack pills). Unlike
         *   `inverse` it stays dark in both themes; on a dark page it reads as a raised panel.
         * - `accent` / `danger` — filled colour buttons. In dark mode the fill brightens and the
         *   label goes dark, because white on teal-500 is about 2.6:1 and fails AA either way.
         */
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-fg': 'rgb(var(--c-surface-fg) / <alpha-value>)',
        inverse: 'rgb(var(--c-inverse) / <alpha-value>)',
        'inverse-fg': 'rgb(var(--c-inverse-fg) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        'panel-fg': 'rgb(var(--c-panel-fg) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--c-accent-fg) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'danger-fg': 'rgb(var(--c-danger-fg) / <alpha-value>)',

        /**
         * The code surface, exposed as utilities so a component rendering something code-shaped
         * (the event-store badges in the Event Sourcing lab, for instance) can sit on the same
         * fixed dark surface the `<pre>` blocks use. Identical in both themes — see the note beside
         * `--c-code-bg` in src/index.css for why a code block must not follow the inverting ramp.
         */
        code: 'rgb(var(--c-code-bg) / <alpha-value>)',
        'code-fg': 'rgb(var(--c-code-fg) / <alpha-value>)',
        'code-border': 'rgb(var(--c-code-border) / <alpha-value>)',
        'code-muted': 'rgb(var(--c-code-muted) / <alpha-value>)',
        'code-chrome': 'rgb(var(--c-code-chrome) / <alpha-value>)',
        'code-chrome-fg': 'rgb(var(--c-code-chrome-fg) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
