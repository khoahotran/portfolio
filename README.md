# Portfolio Engineering Lab

## Development

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run preview` — serve the production build locally at the real `/portfolio/` base path
- `npm run check:responsive` — browser regression check (overflow + console/page errors) across every route and 7 viewport widths; requires `npm run preview` (or `dev`) running first

## Build pipeline

- `npm run build:search-index`: generate
  - `public/content-index.json` — lean index (no article body text), fetched by every list page, detail page, and related-articles lookup
  - `public/search-index.json` — full index (includes searchable body text, with code/Mermaid/HTML stripped), fetched only by `/search`
  - `public/sitemap.xml`, `public/robots.txt`
  - `public/feed.xml`, `public/feed.json`
  - `public/feeds/*.xml` and `public/feeds/*.json` by collection
  - `public/og/*.png` (social preview images, rasterized at build time) and `public/og/*.svg` (the rasterization source, kept alongside)
  - Fails the build if any article's `related:` frontmatter references a slug that doesn't exist
- `npm run prerender`: after `vite build`, loads every route in headless Chromium and writes the
  rendered DOM to `dist/<route>.html`, so each page ships with its own `<title>`, description,
  canonical, `og:image` and JSON-LD instead of the shell defaults. Also emits a real prerendered
  `dist/404.html` and static redirect documents for the legacy `/experiments/<labId>` paths.
  Fails the build if any route is missing its own metadata. Requires Chromium
  (`npx playwright install chromium`). See `.ai/decision-log.md` Decision 6.
- `npm run build`: index generation, then Vite build, then prerender
- `npm run predeploy` (runs before `npm run deploy`): typecheck, then lint, then build — a type or lint error blocks deploy

## Content structure

- `content/blog`
- `content/research`
- `content/experiments` — pairs with an interactive lab at `/labs/<id>` (see `src/labs/registry.ts`)
- `content/system-design`
- `content/field-notes`
- `content/projects` — flagship project case studies, listed at `/projects`

See `content/README.md` for the frontmatter schema.

## Interactive labs

Nine interactive React demos under `src/pages/experiments/`, routed at `/labs/<id>` via the single
source of truth in `src/labs/registry.ts`. Old `/experiments/<id>` URLs redirect to `/labs/<id>`
except where the id collides with an article slug (see the registry's `collidesWithArticleSlug`
comment) — those keep `/experiments/<slug>` resolving to the article instead.

## Web vitals

Set optional endpoint to receive vitals payloads:

```bash
VITE_VITALS_ENDPOINT=https://your-endpoint.example/vitals
```

In dev console:

- `window.__PORTFOLIO_VITALS__`
- `window.__printVitalsReport__()`

## Feeds

- Global RSS: `/feed.xml`
- Global JSON Feed: `/feed.json`
- Collection RSS: `/feeds/blog.xml`, `/feeds/research.xml`, `/feeds/experiments.xml`, `/feeds/system-design.xml`, `/feeds/field-notes.xml`, `/feeds/projects.xml`
- Collection JSON Feed: `/feeds/blog.json`, `/feeds/research.json`, `/feeds/experiments.json`, `/feeds/system-design.json`, `/feeds/field-notes.json`, `/feeds/projects.json`

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`/`dev`: typecheck, lint, build, then the
responsive regression check against a local preview server.
