# Portfolio Completion TODO

    - [ ] Placeholder for Architecture diagrams (Architecture.tsx). See the dead-code note below
          before filling this in — Architecture.tsx may need to be wired into a page first.
    - [x] Project Screenshots — MarkdownContent now wraps a standalone `![alt](src)` image in
          a <figure> with lazy loading, a max-width constraint, and a <figcaption> from the alt
          text. The rendering capability is in place; adding actual screenshots to
          content/projects/*.md is still a content task.

## Dead code — decision needed

`src/components/Architecture.tsx`, `Metrics.tsx`, `Credibility.tsx`, and `Philosophy.tsx` currently
exist but are not imported or rendered by any page. They are being kept as-is for now, not deleted,
pending a decision on which of the following to do:

    - [ ] Integrate each component into a page (e.g. wire Architecture.tsx into PortfolioHome or
          AboutPage once diagram content exists), OR
    - [ ] Remove the ones that won't be used, per `.ai/constitution.md`'s "remove dead code" rule.

No decision has been made automatically — this is intentionally left open for you to resolve.
