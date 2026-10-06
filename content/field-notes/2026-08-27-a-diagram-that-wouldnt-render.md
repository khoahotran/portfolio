---
title: "Field Note: A Diagram That Wouldn't Render"
date: "2026-08-27"
tags: ["frontend-architecture", "testing"]
related: ["projects/pfm"]
summary: "A sequence diagram in a new case study failed to parse. The cause wasn't the character I suspected first — and the fix I tried second broke the same way for a different reason."
---

Writing the [PFM case study](/projects/pfm), I added a sequence diagram showing a database transaction: `Go->>PG: BEGIN; update wallet balance; COMMIT`. It failed to parse. The prerender build caught it — that's a story in itself, see [The SPA Google Never Saw](/blog/the-spa-google-never-saw) — with a line number and an unhelpful grammar dump.

My first guess was the semicolons. This site's own documentation already warned about them, sort of — the existing note said semicolons are safe in flowchart and C4 node labels. I hadn't noticed it never actually claimed they were safe in a *sequence diagram message*, because nothing had tested that combination before. Isolating the diagram in a standalone HTML page and rendering it with the real Mermaid build confirmed it: a semicolon terminates a sequence message mid-sentence, even inside what reads like plain prose, and no amount of quoting saves it.

Fine — swap the semicolons for an em dash: `BEGIN — update balance — COMMIT`. Still broken. Same line, same kind of error.

The em dash I'd typed had been auto-converted to an HTML entity, `&mdash;`, somewhere in my editing pipeline — and a sequence-diagram message ships to Mermaid as the literal fenced-code-block text. It never passes through Markdown's HTML-decoding step the way a rendered node label would. So `&mdash;` reached the parser as seven raw characters, and the bare `&` broke the grammar for an entirely different reason than the semicolon had. Two failures, one line, and testing the fix in isolation is what caught the second one before it shipped — testing the sentence I'd written, not the sentence I thought I'd written.

The actual fix was to stop reaching for punctuation entirely: `BEGIN, then update wallet balance, then COMMIT`. Boring, and it parses.

> [!TIP]
> When a fix for a parse error also fails, don't assume it's the same bug persisting — check what
> actually reached the parser, not what you typed. An editor's autocorrect sits between the two more
> often than it looks.

Both hazards are now documented in `content/README.md`'s "Mermaid syntax hazards" section, verified against the real renderer rather than assumed — the same discipline that section already held itself to before this. A documentation section is only as good as what's actually broken something; this is the second real bug it's caught, not the first.
