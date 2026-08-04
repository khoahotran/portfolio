# Writing Style Guide

This portfolio represents a Staff-level engineer. The tone must be authoritative, pragmatic, and highly technical without being arrogant.

## 1. Tone & Narrative Style
- **Perspective:** Use professional, first-person singular ("I built this") or first-person plural ("We scaled the system") depending on the context of the project. Default to "I" for personal projects and "We" for team-oriented case studies.
- **Pragmatism:** Always focus on the *why*. Acknowledge that all technical decisions are trade-offs. Never claim a tool is "perfect."
- **Confidence:** Be decisive. Say "PostgreSQL handles this efficiently" instead of "I think PostgreSQL might be good here."

## 2. Formatting Conventions
- **Markdown:** Use standard GitHub-flavored markdown. 
- **Headings:** Start with `#` for the main title, `##` for sections, and `###` for sub-sections. Never use H1 (`#`) more than once per file.
- **Emphasis:** Use bold (`**bold**`) for emphasizing key technical terms (e.g., **Event Sourcing**).
- **Code Explanations:** 
  - Keep code snippets short and focused. 
  - Do not dump 100 lines of code; extract the core algorithm. 
  - Always specify the language in the fenced code block (e.g., ```go).
- **Callouts:** The content engine supports GitHub-style blockquote alerts (e.g., `> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`). Use them for critical architectural constraints or "Lessons Learned."

## 3. Article Structure Template

When generating a new **Case Study** or **System Design** note, use this structure:

```markdown
---
title: "Article Title"
date: "YYYY-MM-DD"
tags: ["go", "architecture", "tag3"]
summary: "A 1-2 sentence compelling summary of the technical challenge and solution."
reading_time: "X min"
---

A brief introductory paragraph establishing the business context and the technical challenge.

## System Context (or Architecture)
[Include a Mermaid C4 diagram or Flowchart here]
Explain the high-level architecture visually.

## The Core Problem
Detail the specific engineering bottleneck (e.g., race conditions, database locks, memory bloat).

## The Implementation
Include targeted code snippets or sequence diagrams showing how the problem was solved. Explain the rationale.

## Trade-offs and Limitations
What are the downsides of this approach? What scale will cause this to break?

## Lessons Learned
> [!NOTE]
> A succinct summary of the biggest takeaway from building this system.
```

## 4. Comparison Table Conventions
When comparing tools (e.g., REST vs gRPC), use standard markdown tables. Keep them concise.

| Feature | Tool A | Tool B | Winner / Preference |
| :--- | :--- | :--- | :--- |
| **Throughput** | High | Low | Tool A |
