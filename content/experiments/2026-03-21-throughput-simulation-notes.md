---
title: "Throughput Simulation Notes"
date: "2026-03-21"
tags: ["experiment", "throughput", "capacity"]
summary: "Experiment notes on balancing worker count and tail latency under failure pressure."
reading_time: "5 min read"
---

# Throughput Simulation Notes

## Problem

Capacity planning often relies on averages and misses tail behavior.

## Context

We needed a quick way to reason about throughput and p95 latency under varying worker counts.

## Architecture

A client-side simulator models workers, processing latency, and failure rate.

## Trade-offs

Fast iteration and no backend dependency, but simplified assumptions.

## Performance

The simulator computes instantly and supports interactive tuning.

## Lessons learned

Simple models are useful if assumptions are explicit and validated against production traces.
