---
title: "Scaling Background Jobs"
date: "2026-03-21"
tags: ["queues", "workers", "scaling"]
summary: "Operational patterns for scaling async jobs while keeping failure rates predictable."
reading_time: "10 min read"
---

# Scaling Background Jobs

## Problem

Daily quest jobs caused spikes and uneven queue lag during campaign windows.

## Context

Traffic increased in narrow time windows, making static worker counts expensive or insufficient.

## Architecture

A queue-driven worker pool with adaptive concurrency and dead-letter routing.

### Worker Control Loop

- Monitor queue lag and worker success rate.
- Increase worker replicas when lag crosses threshold.
- Reduce replicas when lag recovers and error budget depletes.

## Trade-offs

Autoscaling improves cost/performance but adds control-loop tuning complexity.

## Performance

Queue lag p95 improved from 18m to 3m after adaptive scaling.

## Lessons learned

Retries must be bounded and observable, otherwise queue depth lies.
