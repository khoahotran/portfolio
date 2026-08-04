const e=`---
title: "Sub-300ms Store Discovery: Designing Geo-Search with Algolia"
date: "2026-06-28"
tags: ["system-design", "algolia", "search", "geolocation"]
summary: "How we leveraged Algolia to build a blazing fast, geo-aware store discovery engine for SeensioGO and Jujuja, achieving 150-300ms latency."
reading_time: "9 min"
---

In both the **SeensioGO** and **Jujuja** mobile applications, the core user journey starts with discovering physical retail stores nearby. 

Users expect to open the app and instantly see a ranked list of stores based on their current GPS coordinates, filtered by categories (e.g., "Coffee", "Retail"), and sorted by distance.

If this API takes more than a second to load, users abandon the app. If the search results are irrelevant, they lose trust.

To solve this, we moved the heavy lifting out of our primary database (Firestore) and built a dedicated search index using **Algolia**. Here is how we designed the integration to achieve 150-300ms search latency.

## The Architecture

Firestore is excellent for real-time document sync, but it is notoriously bad at complex, multi-field geospatial queries. You cannot easily say: *"Find me documents where Category == X AND Location is within 5km of (Lat, Lng) ORDER BY Distance."*

Algolia handles this natively.

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile App
    participant API as NestJS Backend
    participant DB as Firestore
    participant ALG as Algolia
    
    Note over API,ALG: 1. Data Ingestion Phase
    API->>DB: Save Store Data (Name, Category, Lat/Lng)
    API->>ALG: Sync Document to Index
    
    Note over Client,ALG: 2. Discovery Phase
    Client->>ALG: Direct Query: { lat: X, lng: Y, radius: 5000, filters: "category:Coffee" }
    ALG-->>Client: 150ms Response: [Store A, Store B]
    
    Client->>API: Fetch deeper store details if needed
\`\`\`

### 1. The Ingestion Pipeline

The source of truth remains Firestore. We used a Firebase Cloud Function (via our NestJS backend) to listen for \`onCreate\`, \`onUpdate\`, and \`onDelete\` events on the \`stores\` collection.

Whenever a store owner updates their profile, the Cloud Function transforms the document into an Algolia-optimized format and pushes it to the index.

\`\`\`json
// Algolia Indexed Record
{
  "objectID": "store_123",
  "name": "Highlands Coffee",
  "category": "Coffee",
  "_geoloc": {
    "lat": 10.762622,
    "lng": 106.660172
  },
  "rating": 4.8,
  "is_active": true
}
\`\`\`

The \`_geoloc\` field is a special reserved key in Algolia that automatically enables geospatial indexing.

### 2. Client-Side Search for Latency

Notice in the sequence diagram that the Mobile App queries Algolia **directly**, bypassing our NestJS backend entirely.

Why? Every network hop adds latency. If the mobile app calls our backend, and our backend calls Algolia, we suffer double the network transit time. 

By giving the mobile app a restricted, search-only API key, it can query Algolia's edge network directly. Algolia's distributed CDN ensures that a user in Ho Chi Minh City is querying an edge server physically close to them, resulting in response times consistently between 150ms and 300ms.

## Geospatial Ranking Strategy

Finding stores within a 5km radius is easy; ranking them correctly is hard. We configured Algolia's custom ranking formula to prioritize:

1. **Distance:** (Native Algolia geo-sorting).
2. **Promoted Status:** Did the store pay for a boost?
3. **Rating:** Higher-rated stores appear slightly higher.

Because Algolia computes this at the edge, the mobile client receives a perfectly ordered JSON array and simply renders the UI.

## Conclusion

By treating search as a separate concern from our transactional database, we achieved sub-300ms latency for our most critical user flow. Algolia acts as a highly optimized read-projection of our Firestore data, proving that sometimes the best way to scale a backend is to let the client query a specialized CDN directly.
`;export{e as default};
