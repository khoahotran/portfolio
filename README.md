# Portfolio Engineering Lab

## Development

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run preview` — serve the production build locally at the real `/portfolio/` base path
- `npm run check:responsive` — browser regression check (overflow + console/page errors) across every route and 7 viewport widths; requires `npm run preview` (or `dev`) running first

## Build pipeline

- `npm run build:search-index`: generate
  - `public/search-index.json`
  - `public/sitemap.xml`
  - `public/robots.txt`
  - `public/feed.xml`
  - `public/feed.json`
  - `public/feeds/*.xml` and `public/feeds/*.json` by collection
  - `public/og/*.svg` and `public/og-default.svg`
- `npm run build`: run index generation, then Vite build
- `npm run predeploy` (runs before `npm run deploy`): typecheck, then lint, then build — a type or lint error blocks deploy

## Content structure

- `content/blog`
- `content/research`
- `content/experiments` — pairs with an interactive lab at `/labs/<id>` (see `src/labs/registry.ts`)
- `content/system-design`
- `content/field-notes`
- `content/projects` — flagship project case studies, listed at `/projects`

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
- Collection RSS: `/feeds/blog.xml`, `/feeds/research.xml`, `/feeds/experiments.xml`, `/feeds/system-design.xml`
- Collection JSON Feed: `/feeds/blog.json`, `/feeds/research.json`, `/feeds/experiments.json`, `/feeds/system-design.json`

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`/`dev`: typecheck, lint, build, then the
responsive regression check against a local preview server.
