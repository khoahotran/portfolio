# Content System

This portfolio uses markdown as source of truth.

## Collections

- `content/blog`
- `content/research`
- `content/experiments`
- `content/system-design`

## Required metadata

```md
---
title: "Article title"
date: "2026-03-21"
tags: ["tag-a", "tag-b"]
summary: "One sentence summary"
reading_time: "7 min read"
---
```

## Writing workflow

1. Add a markdown file with naming format: `YYYY-MM-DD-slug.md`.
2. Keep `npm run dev` running for hot reload.
3. Verify list page and detail page.
4. Push changes.
