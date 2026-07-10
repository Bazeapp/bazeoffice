---
title: "Scheda-lavoratore 'Ricerche coinvolte' cards are fed by Postgres RPCs, not table-query — expose fields by editing the right RPC"
date: 2026-07-10
category: docs/solutions/integration-issues
module: Scheda lavoratore "Ricerche coinvolte" cards (ricerca, lavoratori)
problem_type: integration_issue
component: frontend
symptoms:
  - "A field you added to the table-query ALLOWED_FIELDS allow-list never appears on these cards"
  - "The family 'giorni' (numero giorni settimanali) rendered as '-' forever in RicercaActiveSearchCard"
  - "tsc stays green even though the mapping reads a key the RPC never emits"
root_cause: wrong_data_source_assumption
resolution_type: rpc_field_exposure
severity: medium
related_components: [lavoratore_scheda_rpc, selezioni_lookup_rpc, backend-supabase]
tags: [rpc, related-searches, table-query, selezioni-lookup, lavoratore-scheda, ricerche-coinvolte, phantom-key, record-unknown, tier-3]
---

# Scheda-lavoratore "Ricerche coinvolte" cards are fed by Postgres RPCs, not table-query

## Problem

The cards in the scheda lavoratore **"Ricerche coinvolte"** section do **not** read through the `table-query` gateway. Two different RPCs feed the two card variants, so exposing a new `selezioni_lavoratori` / `processi_matching` field to them means editing the **right RPC** (or nothing at all), never the `table-query` `ALLOWED_FIELDS` allow-list. A latent bug lived here too: the family "giorni" always rendered `-`. (BAZ-25)

## Symptoms

- Adding a column to `table-query` `ALLOWED_FIELDS` does nothing for these cards.
- `RicercaActiveSearchCard`'s family "giorni" token was always `-` (e.g. `30h | -`).
- `tsc` stays green while the mapping reads a non-existent key — because the rows are `Record<string, unknown>`.

## Data feeds (the key facts)

- **`RicercaActiveSearchCard`** (scheda, both "Ricerche coinvolte" tabs) ← the **`lavoratore_scheda`** RPC → `related_searches`, built with an **explicit `jsonb_build_object` projection**. To surface a new field: add it to that `jsonb_build_object` in a **new migration in `backend-supabase`** (`CREATE OR REPLACE FUNCTION lavoratore_scheda`, never edit the baseline), then read it in the mapping in `src/modules/lavoratori/components/lavoratori-cerca-view.tsx`. This is a **Tier-3 cross-repo change** (backend migration + frontend), promoted `dev → staging → main`.
- **`RelatedActiveSearchCard`** (compact: workers-pipeline + the `lavoratore-card` popover) ← the **`selezioni_lookup`** RPC, which **`RETURNS SETOF public.selezioni_lavoratori`** → every column is already present. Reading a `selezioni_lavoratori` field here needs **no backend change** — just map it in the loaders (`fetchAllSelectionsForWorker` in `ricerca-workers-pipeline-view.tsx`; the list/map popover fallback `buildRelatedSelectionsMap` in `use-lavoratori-data.ts`).
- The authoritative backend is **`backend-supabase`**; the `bazeoffice/supabase/` folder is obsolete — never trace an RPC from there.

## The phantom-key bug (why "giorni" was always "-")

`lavoratori-cerca-view.tsx` mapped `giorniSettimanali` from `processRow.giorni_a_settimana` — a key the RPC never emits **and** a column that does not exist. The real column is `processi_matching.numero_giorni_settimanali`. Because `related_searches` rows are typed `Record<string, unknown>`, `tsc` never flagged the typo; the read silently resolved to `undefined → "" → "-"`.

## Solution

- **Backend** (`backend-supabase`): a new migration `CREATE OR REPLACE FUNCTION lavoratore_scheda` that adds the wanted keys to `related_searches` (here: `intervista_giorni_lavoro`, `intervista_orario_e_giorni`, and the missing `numero_giorni_settimanali`).
- **Frontend**: read the new keys in the mapping and correct `giorni_a_settimana → numero_giorni_settimanali`. Guard display on **trimmed text**, not `null` — these are `TEXT` columns and can hold `""`/whitespace, not just `NULL`.

## Prevention

- When a scheda/board card doesn't show a field you expect, **trace its real feed first**: is it a scheda/board RPC (explicit `jsonb` projection) or a `SETOF` RPC (all columns) — it is often **not** `table-query`. `grep` the RPC definition in `backend-supabase/supabase/migrations/`.
- RPC payload rows are `Record<string, unknown>`, so **string-key typos are invisible to `tsc`**. `grep`-sweep the string keys you read against the keys the RPC actually emits. (Same failure class as hand-written entity types + non-type-checked select strings.)
- Exposing a field to a **scheda-RPC-fed** card is a **Tier-3** change (backend migration + frontend deploy gate); exposing one to a **`SETOF`-RPC-fed** card is frontend-only. Know which before you scope the task.
