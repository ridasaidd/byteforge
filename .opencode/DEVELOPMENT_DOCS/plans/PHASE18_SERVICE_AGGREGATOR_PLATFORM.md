# Phase 18: Service Aggregator Platform

Last updated: April 20, 2026
Status: Planned — discovery only, not yet started
Depends on: core SaaS maturity, stable public API contracts, tenant opt-in listing model
Recommended branch later: separate repo or `feature/phase18-service-aggregator`

---

## Problem Statement

There is a potential opportunity beyond the tenant CMS itself: a cross-tenant
service aggregator where guests discover businesses such as salons, barbers,
workshops, repair shops, and other service providers, then flow into the
tenant-owned booking or quote experience.

This is not the same kind of feature as a tenant add-on.

Unlike bookings, payments, or quotes, an aggregator is cross-tenant by nature.
It introduces discovery, search, ranking, moderation, public listings, and
possibly reviews or marketplace-style behavior.

That makes it a separate product surface, even if it is ultimately owned by the
same company and backed by the same platform data.

---

## Core Product Decision

This should be treated as a separate application or bounded context, not as a
tenant add-on inside the existing SaaS.

Why:

1. it is cross-tenant rather than tenant-local,
2. it serves guests and public discovery rather than tenant operators,
3. its ranking, SEO, moderation, and search concerns are distinct from CMS concerns,
4. it may evolve into a marketplace business with its own roadmap.

The correct relationship is:

1. the SaaS remains the source of truth for tenant-owned service data,
2. the aggregator consumes curated public data through APIs or a dedicated read model,
3. tenants opt in to visibility on the aggregator.

---

## Design Principles

1. Separate product boundary. The aggregator should not distort the tenant CMS data model just to satisfy discovery features.
2. Opt-in listing only. Tenants must choose whether they appear in aggregator results.
3. Curated public surface. Only explicitly public tenant data should be exposed.
4. Read-oriented integration. The aggregator should mostly consume data, not own tenant operational workflows.
5. SEO and performance matter. This product will likely need search indexing, caching, and dedicated public rendering concerns.
6. Do not block core SaaS maturity. This should not become a pre-launch dependency.

---

## What The Aggregator Actually Is

At minimum, this is a public directory and discovery layer for service-based
tenants.

Likely capabilities:

1. browse businesses by category and location,
2. search by service type,
3. view public business profiles,
4. follow through into booking, quote request, or external contact flows,
5. later support marketplace or lead-generation behavior.

This is closer to a directory or marketplace platform than to a tenant add-on.

---

## Suggested Architecture

### Separate Application

Recommended default:

1. separate frontend application,
2. separate public API or dedicated read API,
3. same company and platform ownership,
4. shared identity only if later justified.

It may live in the same monorepo later, but conceptually it should still be
treated as a separate system.

### Data Access Strategy

Prefer one of these two models:

1. a public read API exposed by the SaaS for aggregator-safe data,
2. a replicated read model or indexing pipeline fed from tenant public data.

The aggregator should not directly reuse internal tenant CMS APIs as-is.

---

## Public Data Boundary

Only curated public fields should be exposed.

Likely public listing fields:

1. tenant public display name,
2. city, area, or region,
3. business category,
4. description,
5. public contact or CTA links,
6. service summaries,
7. cover image or logo,
8. booking or quote-request availability flags,
9. optional public rating data if introduced later.

Likely non-public fields to exclude:

1. internal users and roles,
2. payment-provider configuration,
3. private analytics,
4. internal pricing drafts,
5. support or administrative data,
6. tenant-private media and documents.

---

## Integration With SaaS

The aggregator should consume SaaS data through explicit contracts.

Recommended future surfaces:

1. tenant public profile endpoint,
2. tenant public services endpoint,
3. tenant public quote-request capability flag,
4. tenant public booking capability flag,
5. opt-in listing settings endpoint for tenants.

If the aggregator later needs richer search, push data into a dedicated search
index instead of querying operational SaaS tables directly.

---

## What Should Not Happen

1. Do not make the aggregator a hidden global mode inside the tenant CMS.
2. Do not expose internal tenant APIs directly to public search consumers.
3. Do not treat every tenant as listed by default.
4. Do not let aggregator concerns dictate core SaaS launch priorities.
5. Do not merge public marketplace ranking logic into ordinary tenant product logic.

---

## Suggested Rollout Order

### 18.1 Discovery And Public Data Contract

1. define listing eligibility,
2. define tenant opt-in settings,
3. define public profile and public services schema,
4. define API or read-model boundary.

### 18.2 Aggregator MVP

1. public search and listing pages,
2. public business profile pages,
3. category and location browsing,
4. CTA into tenant booking or quote flow.

### 18.3 Marketplace Expansion If Justified

1. ranking and recommendation logic,
2. promoted listings or ads,
3. reviews,
4. lead routing or marketplace fees,
5. cross-tenant guest identity only if strategically necessary.

---

## Why This Is Probably Later Work

The aggregator is strategically interesting but should be treated as a second
business initiative, not a near-term add-on.

Reasons to defer:

1. the core SaaS has more immediate pre-launch and early-launch priorities,
2. the aggregator needs strong, stable public data contracts first,
3. the business model is broader than tenant operations alone,
4. it introduces search, SEO, moderation, and discovery complexity not needed for SaaS launch.

---

## Open Decisions

1. Should the aggregator live in a separate repo, or only a separate app boundary within the same repo?
2. Should listings be tenant-curated manually, or generated from tenant public content automatically?
3. Should bookings and quotes both be supported as CTA entry points from day one?
4. Should the aggregator be a neutral directory first, or a marketplace later?
5. Should monetization happen through SaaS subscriptions, promoted listings, lead fees, or not at first?

Recommended answers for first discovery:

1. treat it as a separate app first, regardless of repo choice,
2. require explicit tenant opt-in and curated public fields,
3. support booking and quote-request CTAs later if both exist in the platform,
4. start as a directory, not a full marketplace,
5. defer monetization decisions until listing demand is proven.
