---
title: "Designing a Multi-Role HFT Research Platform"
date: "2026-06-28"
tags: ["system-design", "go", "python", "redis-streams", "hft"]
related: ["projects/quant-alpha", "research/order-book-imbalance-hft-signal"]
summary: "How I architected QuantAlpha Lab, a distributed research platform that bridges the gap between Python data science and Go backend engineering."
reading_time: "11 min"
---

In a modern quantitative trading firm, research is not a solo endeavor. It is a highly specialized pipeline involving three distinct roles:

1. **The Data Scientist:** Cleans raw tick data and engineers features (like Order Book Imbalance).
2. **The Quant Researcher:** Takes those features, trains machine learning models, and backtests trading signals.
3. **The Portfolio Manager:** Monitors active strategies, allocates capital, and manages risk limits.

When building **QuantAlpha Lab**, an academic High-Frequency Trading (HFT) research platform, the architectural challenge was creating a system that supported all three workflows simultaneously. It required bridging the fast, concurrent world of Go backend engineering with the heavy, blocking world of Python machine learning.

## The Architecture (Bridging Go and Python)

We needed a frontend dashboard (Angular 18) for the Portfolio Manager to monitor live strategies, a fast API (Go) to handle concurrent web traffic, and a heavy compute layer (Python/scikit-learn) for the Quants.

We glued them together using **Redis Streams**.

```mermaid
flowchart TB
    subgraph Frontend
        Web[Angular 18 SPA\nDashboard]
    end

    subgraph API Tier
        GoAPI[Go REST API\nGin Framework]
    end

    subgraph Compute Tier
        PyWorker1[Python ML Worker 1]
        PyWorker2[Python ML Worker 2]
    end

    subgraph Data Tier
        Redis[[Redis Streams\nJob Queue]]
        PG[(PostgreSQL\nResults & Weights)]
    end

    Web <-->|REST / JSON| GoAPI
    
    GoAPI -->|XADD train_jobs| Redis
    
    Redis -.->|XREADGROUP| PyWorker1
    Redis -.->|XREADGROUP| PyWorker2
    
    PyWorker1 -->|Write Model| PG
    PyWorker2 -->|Write Signal| PG
    
    GoAPI <-->|Read Results| PG

    classDef frontend fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px;
    classDef api fill:#f0fdf4,stroke:#86efac,stroke-width:2px;
    classDef compute fill:#fef08a,stroke:#fde047,stroke-width:2px;
    classDef db fill:#eff6ff,stroke:#93c5fd,stroke-width:2px;
    
    class Web frontend;
    class GoAPI api;
    class PyWorker1,PyWorker2 compute;
    class Redis,PG db;
```

### Why Redis Streams?

We could have exposed a Flask/FastAPI endpoint on the Python worker and had the Go API call it via HTTP. 

However, training a Random Forest on 30 minutes of tick data takes 10 to 45 seconds. An HTTP connection held open for 45 seconds wastes resources and is vulnerable to timeouts. 

Instead, we used Redis Streams to implement an asynchronous job queue with Consumer Groups. The Go API uses `XADD` to push a job payload (e.g., "Train model on VN30F2112 for 09:30-10:00"). The Python workers use `XREADGROUP` to reliably claim jobs. If a Python worker crashes mid-training, the job remains in the Pending Entries List (PEL) and is eventually reassigned.

## The Job Dispatch Flowchart

Here is how the system safely dispatches and tracks these heavy compute jobs.

```mermaid
flowchart TD
    Start([Quant clicks 'Train Model']) --> API[Go API receives request]
    API --> DB[Insert Job Status = PENDING in Postgres]
    API --> Redis[XADD job payload to Redis Stream]
    Redis --> Web[Return 202 Accepted & JobID to Angular]
    
    Web -.->|Polling /job/:id| API
    
    subgraph Python Worker
        Wait[XREADGROUP blocking wait] --> Claim[Claim Job]
        Claim --> Train[Train scikit-learn model]
        Train --> Upload[Save binary weights]
    end
    
    Redis --> Wait
    Upload --> UpdateDB[Update Job Status = SUCCESS in Postgres]
    
    UpdateDB -.-> API
```

## Designing for the Portfolio Manager

While the Python workers handle the heavy lifting, the Portfolio Manager needs real-time visibility into the system.

The Go API exposes a set of endpoints specifically for the PM dashboard:
- `GET /api/v1/jobs/active`: Which models are currently training?
- `GET /api/v1/strategies/:id/pnl`: What is the simulated profit/loss of strategy X?

Because the Go API directly queries PostgreSQL for these results, it can serve the PM dashboard instantly, completely decoupled from the CPU-heavy Python layer.

## Conclusion

QuantAlpha Lab demonstrates that you don't have to build monolithic systems in a single language. By using Redis Streams as an asynchronous boundary, we successfully combined Go's strengths (handling concurrent web requests and fast API routing) with Python's strengths (Pandas, scikit-learn, and data science tooling) into a cohesive, multi-role platform.
