const e=`---
title: "Interactive Event Sourcing Replay"
date: "2026-06-28"
tags: ["architecture", "event-sourcing", "cqrs", "interactive-demo"]
summary: "An interactive visualization of how application state is derived from an immutable, append-only event log."
reading_time: "5 min"
---

In traditional CRUD applications, database records are mutable. When a user deposits $500 into their bank account, the application runs an \`UPDATE\` statement, overwriting the previous balance. The history of *how* the account reached that balance is lost forever, unless you meticulously maintain separate audit logs.

**Event Sourcing** flips this paradigm. Instead of storing the *current state*, you store the *events that caused the state to change*. The database becomes an append-only log of immutable facts.

To figure out the current state (the "Read Projection"), the system replays the events from the beginning of time.

I built this interactive lab to visualize exactly how this replay mechanism works.

<a href="/experiments/event-sourcing-replay" class="not-prose inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 hover:shadow-md transition-all mt-4 mb-8">
  Launch Interactive Lab
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>

### Why use Event Sourcing?

As demonstrated in the lab, this architecture provides several unique benefits:

1. **Perfect Auditability:** Because state is derived from events, the audit log is not an afterthought—it *is* the source of truth.
2. **Time Travel:** You can rebuild the exact state of the system at any given timestamp by stopping the replay at a specific event version.
3. **CQRS Enablement:** You can build multiple, entirely different read-projections from the exact same event log (e.g., one projection for Account Balances, and a completely different projection for Fraud Analysis).

Try the lab and watch the projection derive state from the event stream in real-time.
`;export{e as default};
