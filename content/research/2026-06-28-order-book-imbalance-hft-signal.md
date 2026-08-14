---
title: "Order Book Imbalance (OBI) as a Signal for Short-Term Price Prediction"
date: "2026-06-28"
tags: ["machine-learning", "finance", "python", "hft", "research"]
related: ["projects/quant-alpha", "blog/designing-a-multi-role-hft-research-platform"]
summary: "Research notes on extracting Order Book Imbalance (OBI) features from Level-3 market data (VN30F2112) to train rolling-window ML classifiers for High-Frequency Trading."
reading_time: "10 min"
---

In High-Frequency Trading (HFT), price movements in the next 10 seconds are rarely driven by macroeconomic news. Instead, they are driven by micro-structural imbalances in the order book—specifically, the pressure difference between buyers (bids) and sellers (asks).

During the development of the **QuantAlpha Lab**, an academic HFT research platform, I focused heavily on engineering **Order Book Imbalance (OBI)** as the primary feature for our machine learning classifiers.

This article explores how we computed OBI from raw tick data and designed a rolling-window training pipeline to predict short-term price direction on the VN30F2112 futures contract.

## What is Order Book Imbalance?

At any given microsecond, an order book contains a queue of limit orders. 
- The **Bid** side represents buyers waiting for a price.
- The **Ask** side represents sellers waiting for a price.

Order Book Imbalance measures the relative volume pressure at the top of the book (Level 1).

$$ OBI = \frac{Volume_{bid} - Volume_{ask}}{Volume_{bid} + Volume_{ask}} $$

An OBI of `+1.0` means overwhelming buy pressure (everyone wants to buy, no one wants to sell). An OBI of `-1.0` indicates severe sell pressure.

### Beyond Level 1: Depth Imbalance

While Level 1 OBI is a strong signal, smart money often spoofs the top of the book while placing real liquidity at Levels 2 through 5. To capture this, our Python worker computed a weighted depth imbalance:

$$ OBI_{weighted} = \sum_{i=1}^{5} \left( \frac{V_{bid,i} - V_{ask,i}}{V_{bid,i} + V_{ask,i}} \times e^{-\alpha (i-1)} \right) $$

This equation decays the importance of the imbalance exponentially as we look deeper into the book.

## The Rolling Window Training Pipeline

Financial data is notoriously non-stationary. The market microstructure dynamics at 9:30 AM are completely different from the dynamics at 2:15 PM.

If you train a model on Monday's data and trade it on Tuesday, it will likely lose money. To counteract this, we designed a **Rolling Window Pipeline**.

```mermaid
timeline
    title Rolling Window ML Training (VN30F2112)
    09:00 : Market Open
    09:00 - 09:30 : Window 1 (Train) : Collect 30m of tick data, compute OBI
    09:30 - 09:40 : Window 1 (Trade) : Predict next 10s price direction
    09:10 - 09:40 : Window 2 (Train) : Train new model instance
    09:40 - 09:50 : Window 2 (Trade) : Switch to new model
```

Instead of a single global model, the QuantAlpha system trains hundreds of micro-models throughout the day using `scikit-learn` (specifically `RandomForestClassifier` and `GradientBoostingClassifier`). 

Every 10 minutes, the Python worker receives a job via **Redis Streams** from the Go API. It pulls the last 30 minutes of tick data, computes the OBI features, trains a fresh model, and pushes the serialized weights back to PostgreSQL.

## Predicting the Next 10 Seconds

Our target variable (`y`) was a trinary classification:
- `1`: Price moves UP by > 0.5 ticks in the next 10s.
- `-1`: Price moves DOWN by > 0.5 ticks in the next 10s.
- `0`: Price remains stable.

### Results and Challenges

The OBI feature, especially when combined with trade flow imbalance (the delta of market orders hitting the bids vs asks), proved highly predictive of the 10-second forward return.

However, the primary challenge wasn't model accuracy—it was **latency and slippage**. 

By the time our Python worker detected an OBI of `+0.8` and generated a `BUY` signal, the market had often already moved. The VN30F2112 contract is highly liquid, and competing HFT firms using FPGAs react to these imbalances in microseconds, whereas our Go/Python stack operated in milliseconds.

## Conclusion

Order Book Imbalance is a fundamental building block of quantitative market making and statistical arbitrage. While our Python-based rolling window architecture was too slow for production HFT execution, it successfully proved the statistical validity of the OBI signal on real-world Vietnamese derivatives data.
