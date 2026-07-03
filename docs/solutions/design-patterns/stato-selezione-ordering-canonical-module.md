---
title: "stato_selezione display order: canonical rank module (vs data-insertion order)"
date: 2026-07-03
category: design-patterns
module: "src/features/ricerca/stati-selezione.ts"
problem_type: design_pattern
component: ricerca
severity: low
applies_when:
  - "Ordering / grouping selections (selezioni_lavoratori) by stato_selezione in the UI"
  - "Adding a new stato_selezione and wondering where its display position is defined"
  - "Touching «Ricerche coinvolte» on the worker detail page"
tags: [stato-selezione, ordering, rank, ricerche-coinvolte, lavoratori, pure-module]
---

# stato_selezione display order: canonical rank module

## Context

BAZ-24: in «Ricerche coinvolte» (worker detail page, `src/components/lavoratori/lavoratori-cerca-view.tsx`), the `stato_selezione` groups rendered in **data-insertion order** (Map iteration), so the huge "non selezionato" bucket surfaced first and buried relevant groups.

## Solution

The display order of `stato_selezione` groups now lives in a **pure, testable module**: `src/features/ricerca/stati-selezione.ts` (`getSelectionStateRank`, `sortSelectionGroupsByRank`). A 3-tier semantic scheme:

1. **`no match`** → top (checked **before** the archive bucket, or it would fall into it).
2. **Active funnel** (middle): candidati → da colloquiare → colloqui/prove → post-colloquio positivi (selezionato / inviato al cliente / match).
3. **Archive** (bottom): `non selezionato`, `archivio`, `nascosto - oot`. Unknown / `Senza stato` land just before archive (graceful degradation for new states).

Comparison is on a **normalized token** — it reuses `normalizeInvolvementToken` from `src/features/lavoratori/lib/involvement-utils.ts` (don't re-implement the normalization). Sorting is **stable** (`Array.prototype.sort`, ES2019+), so same-rank groups keep their input order.

To change the order, edit the ordered buckets in `stati-selezione.ts` — not the component.

## Gotchas / follow-ups

- **`stato_selezione` ≠ `stato_ricerca`.** The worker detail PAGE groups «Ricerche coinvolte» by `stato_selezione` (the candidacy state: prospetto, non selezionato, no match…). The **pipeline modal** (`src/components/ricerca/worker-pipeline-summary-cards.tsx`, `RelatedActiveSearchesBlock`) groups by `stato_ricerca` (the process state) — a different field. They look similar but are not the same list; BAZ-24 is page-only for this reason.
- **Duplicated macro-group knowledge (follow-up).** `src/hooks/use-ricerca-workers-pipeline.ts` independently encodes the same CANDIDATI / DA_COLLOQUIARE / COLLOQUI / ARCHIVIO membership (as private classifier fns). `stati-selezione.ts` deliberately does NOT refactor the pipeline hook to consume it (scope containment). A future task could unify the two into one source of `stato_selezione` grouping/order.
