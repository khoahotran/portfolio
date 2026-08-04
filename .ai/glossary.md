# Glossary

This glossary defines standard terminology used across the portfolio to ensure consistency in technical writing and communication.

## A
**Aggregate:** In Domain-Driven Design (DDD), a cluster of domain objects that can be treated as a single unit. E.g., an Account and its Transaction History.

**ADR (Architecture Decision Record):** A short text file capturing a significant architectural decision, the context, and the consequences.

## C
**CQRS (Command Query Responsibility Segregation):** An architectural pattern separating the paths for reading data (Queries) from the paths for writing data (Commands).

**Compensating Transaction:** In a Saga pattern, a transaction explicitly designed to undo the effects of a previous, successfully committed transaction if a subsequent step fails.

## E
**Event Sourcing:** Storing the state of a system as a sequence of immutable state-changing events.

**Eventual Consistency:** A consistency model used in distributed computing guaranteeing that, if no new updates are made to a given data item, eventually all accesses to that item will return the last updated value.

## I
**Idempotency:** The property of an operation whereby applying it multiple times yields the same result as applying it once. Critical for safe retries in distributed systems.

## O
**Outbox Pattern:** A pattern used to reliably publish events to a message broker (like Kafka) by first writing the event to a database table (the "outbox") in the same local transaction that updates the business entity.

## P
**Projection:** In Event Sourcing, the process of reading an event stream and computing a read-optimized view of the data (e.g., taking `Deposit` and `Withdrawal` events to compute a `Balance`).

## R
**Replay:** The act of running historical events from an Event Store through a projection engine to rebuild or compute new read models.

## S
**Saga:** A sequence of local transactions across multiple services. Each local transaction updates the database and publishes a message/event to trigger the next local transaction in the saga.

**Snapshot:** An optimization in Event Sourcing where the state of an aggregate is saved at a specific version (e.g., every 100 events) to prevent having to replay the entire history from event 0.
