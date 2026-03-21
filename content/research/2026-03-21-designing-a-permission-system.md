---
title: "Designing a Permission System"
date: "2026-03-21"
tags: ["authorization", "rbac", "policy"]
summary: "How to evolve from role checks to maintainable policy-based authorization."
reading_time: "8 min read"
---

# Designing a Permission System

## Problem

Role-only checks became brittle when feature-level permissions expanded.

## Context

The platform had admin, owner, and staff roles but needed granular scope control across resources.

## Architecture

We introduced a policy engine with `subject`, `resource`, `action`, and `context` evaluation.

### Policy Evaluation Flow

1. Resolve principal role and org scope.
2. Load policy rules for resource/action.
3. Evaluate dynamic constraints (time, ownership, status).

## Trade-offs

Policy engines add flexibility but can hide logic if rules are not observable.

## Performance

Policy decision cache reduced authorization overhead to sub-5ms in hot paths.

## Lessons learned

Log every denied decision with rule id to keep support and debugging fast.
