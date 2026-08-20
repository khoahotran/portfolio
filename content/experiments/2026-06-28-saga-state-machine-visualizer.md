---
title: "Interactive Saga State Machine Visualizer"
date: "2026-06-28"
tags: ["distributed-systems", "microservices", "saga-pattern", "interactive-demo"]
related: ["projects/core-banking"]
summary: "An interactive visualization of the Saga distributed transaction pattern, demonstrating automated compensating rollbacks."
reading_time: "5 min"
---

When moving from monoliths to microservices, you lose the ability to perform cross-table, atomic ACID transactions. You cannot simply `BEGIN TRANSACTION` and lock rows across an Order Database, a Payment Database, and an Inventory Database simultaneously.

The **Saga Pattern** is the microservice solution to this problem. It breaks a distributed transaction into a sequence of local transactions.

If a local transaction fails (e.g., the user's credit card is declined, or an item is out of stock), the Saga Orchestrator executes a series of **Compensating Transactions** in reverse order to undo the work that was already completed.

I built this interactive visualizer to demonstrate how this state machine behaves during happy paths and failure scenarios.

<a href="/labs/saga-state-machine" class="not-prose inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 hover:shadow-md transition-all mt-4 mb-8">
  Launch Interactive Lab
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>

### How to use the lab

1. **The Happy Path:** Run the visualizer without injecting any failures. Watch as the Orchestrator sequences the Order, Payment, and Inventory steps.
2. **Inject Payment Failure:** Simulate a declined credit card. You'll see the Payment step fail, and immediately trigger a "Cancel Order" compensation upstream.
3. **Inject Inventory Failure:** Simulate an out-of-stock item *after* the payment has succeeded. This is the critical scenario: the orchestrator must automatically fire a "Refund Payment" compensation, followed by a "Cancel Order" compensation, to restore consistency.

Try the lab and watch the timeline unfold.
