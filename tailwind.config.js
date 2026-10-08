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
import defaultTheme from 'tailwindcss/defaultTheme.js';

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

      /**
       * Before this there was no `fontFamily` key at all, so every piece of type on the site fell
       * back to the browser's default sans. That absence — not the colours, not the spacing — is
       * the main reason the site read as unstyled: nobody had ever chosen a typeface.
       *
       * `Variable` suffixes are what @fontsource-variable registers; the static names follow as a
       * fallback for the window between first paint and the woff2 arriving.
       */
      fontFamily: {
        sans: ['Inter Variable', 'Inter', ...defaultTheme.fontFamily.sans],
        display: ['Inter Tight Variable', 'Inter Tight', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },

      /**
       * A seven-step scale, replacing ad-hoc `text-4xl md:text-5xl` pairs scattered across pages.
       * Each step carries its own line-height and tracking, because those are not independent
       * choices: display sizes need tighter leading and negative tracking, body sizes need the
       * opposite, and leaving them to the call site is how two headings at the same size end up
       * looking different.
       *
       * Display steps use clamp() so they scale with the viewport instead of switching at a
       * breakpoint — the `md:` jump is what makes headings look oversized on a 768px tablet.
       */
      fontSize: {
        d1: ['clamp(2.5rem, 1.6rem + 4.5vw, 4.25rem)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        d2: ['clamp(1.875rem, 1.3rem + 2.8vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.022em' }],
        d3: ['clamp(1.375rem, 1.1rem + 1.3vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        lead: ['clamp(1.0625rem, 1rem + 0.35vw, 1.25rem)', { lineHeight: '1.6', letterSpacing: '-0.005em' }],
        body: ['1rem', { lineHeight: '1.65' }],
        meta: ['0.875rem', { lineHeight: '1.5' }],
        micro: ['0.75rem', { lineHeight: '1.45', letterSpacing: '0.04em' }],
        /* 10px, matching the 72 existing `text-[10px]` uses one for one so adopting the token
           changes nothing visually. Whether a badge should be 10px at all is a design question,
           and it belongs with the Badge component in P1 — not with a token migration, where it
           would hide a visual change inside a mechanical one. */
        nano: ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.06em' }],
      },

      /**
       * Three section rhythms, assigned by importance rather than by position. Every section
       * currently uses `py-24`, and that evenness is itself the problem the redesign names: when
       * nothing recedes, nothing stands out.
       */
      spacing: {
        'band-anchor': '8rem',
        'band-standard': '5rem',
        'band-quiet': '3rem',
      },

      /** Three radii by role, replacing the lg/xl/2xl/full mix currently used interchangeably. */
      borderRadius: {
        control: '0.5rem',
        card: '0.875rem',
        pill: '9999px',
      },

      /**
       * Two elevations. The current `shadow-lg shadow-slate-200` on filled buttons tints the
       * shadow with a palette colour, which inverts into a glow in dark mode; these are neutral
       * and stay shadows in both themes.
       */
      boxShadow: {
        raised: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        lifted: '0 4px 12px rgb(15 23 42 / 0.07), 0 2px 4px rgb(15 23 42 / 0.04)',
      },
    },
  },
  plugins: [],
};
