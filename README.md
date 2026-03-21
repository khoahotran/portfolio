# Portfolio Engineering Lab

## Development

- `npm run dev`
- `npm run lint`
- `npm run typecheck`

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

## Content structure

- `content/blog`
- `content/research`
- `content/experiments`
- `content/system-design`

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
