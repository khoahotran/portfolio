---
title: "Field Note: What My Own Git Log Proves About Spec-Driven Development"
date: "2026-09-07"
tags: ["spec-driven-development", "testing", "trade-offs"]
related: ["projects/pfm", "field-notes/measuring-contrast-instead-of-guessing"]
summary: "PFM's governance docs claim every business rule traces from spec to test to code. A plain git log, not the docs, is what actually proves it — and it also shows two honest cases of deliberately not fixing something."
---

[The PFM case study](/projects/pfm) describes a spec-first workflow: an SRS, an SDS, a constitution
of non-negotiable engineering rules, all version-controlled and kept in lockstep with the code. That's
a claim about process, and a write-up asserting its own rigor is exactly the kind of claim this site's
own audits (see [Measuring Contrast Instead of Guessing at It](/field-notes/measuring-contrast-instead-of-guessing))
have learned not to take on faith. So instead of describing the workflow again, this note checks it
against the one artifact that can't be rewritten after the fact to look more disciplined than it was:
`git log`.

## The commit shape, unedited

Working with Claude Code as an AI pair under that governance layer, a feature branch for almost every
user story in PFM's history follows the same four-commit shape, in the same order:

```text
docs(design): plan ua-us-04 manage user roles
test(users): add ua-us-04 manage user roles test cases and automation
feat(user): let an authenticated admin manage a user's role
Merge branch 'feature/ua-us-04-manage-user-roles' into develop
```

That is not one example cherry-picked to make a point — the same four-step pattern (plan, then test,
then implement, then merge) appears for revoke-pending-invitation, reset-password, change-email, and
a custom date-range report, each on its own branch, each merged separately. A docs-first commit that
exists *before* the feature commit is a genuinely different artifact than a docs commit added
alongside or after the code — the former is only possible if the spec was actually written first, the
latter is retroactive documentation wearing the same commit message. `git log --oneline` is a place
that ordering can't be faked without deliberately backdating commits, which is more effort than just
doing the thing honestly.

## Two honest non-fixes, not two fixes

The more interesting evidence isn't the pattern holding — it's what a real audit pass under this same
discipline chose *not* to touch, and said so.

**A componentization sweep** (documented in PFM's own `documents/roadmap.md`) extracted a shared
`Pagination` and `CardHeader` component only after confirming the duplicated markup was byte-for-byte
identical across the files that used it — not "looks similar," the same bar this portfolio's own
`TagPill` extraction used. The much larger duplication the same sweep found — nearly identical
field-rendering JSX repeated across three entity forms, 260+ lines — was **deliberately left alone**,
because those three forms are the most heavily-tested code paths in the entire app; a rushed
extraction there traded a real, present maintenance cost for a regression risk on every E2E suite the
app has. The bigger number was the more tempting fix and the one that got scoped out.

**A contrast-checking pass** flagged a button rendering at 58.7% opacity as a contrast failure, then
concluded it wasn't one: the automated scan had sampled the page mid-`transition-all` fade between a
disabled button's full and 50%-opacity states, and WCAG's own normative text exempts disabled controls
from the contrast requirement in the first place. The finding was recorded as **"not a bug, no fix
applied"** rather than silently dropped, specifically so a future pass wouldn't waste time
rediscovering and misdiagnosing the same transient artifact as a real design-token defect.

> [!NOTE]
> Neither of those is a story about a tool catching a bug. They're both stories about a review that
> could name a real cost and still choose not to pay it — the harder discipline, and the one a
> pattern of commit messages alone can't demonstrate.

## What this does and doesn't prove

It proves the plan-before-code ordering is real at the commit-history level, across enough separate
stories that it isn't a one-off. It does not prove the resulting code is good — a disciplined process
can still ship a bug, and this portfolio's own most recent full re-audit (`.ai/decision-log.md`
Decision 21) found four real defects in code that had already passed review once, on this site, not
PFM. What a consistent git log adds isn't a guarantee of correctness; it's that when something does
need fixing later, there's a real paper trail — an SRS line, an SDS decision, a test written before
the feature — to fix it against, instead of only a working system and no record of why it works the
way it does.
