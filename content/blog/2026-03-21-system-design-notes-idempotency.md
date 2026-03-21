---
title: "System Design Notes: Idempotency"
date: "2026-03-21"
tags: ["idempotency", "api", "resilience"]
summary: "Practical patterns for making writes replay-safe under retries and partial failures."
reading_time: "6 min read"
---

# System Design Notes: Idempotency

## Why this matters

Retries are healthy, duplicate side effects are not.

## Pattern

Use an idempotency key scoped by actor and operation intent.

## Edge case

If payloads differ under the same key, fail fast with explicit conflict details.

## Rule of thumb

Make idempotency persistence durable before issuing side effects.
