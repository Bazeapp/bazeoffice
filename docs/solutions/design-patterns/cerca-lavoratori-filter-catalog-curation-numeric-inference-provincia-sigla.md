---
title: "cerca-lavoratori filter catalog: curation, numeric type inference, and provincia enum-sigla wiring"
date: 2026-07-16
category: design-patterns
module: "lavoratori filter catalog (src/modules/lavoratori/hooks/use-lavoratori-data.ts; src/components/data-table/data-table-filters.ts)"
problem_type: design_pattern
component: filters
severity: medium
applies_when:
  - "Curating which columns appear as filters in /cerca-lavoratori (and, by sharing, gate1/gate2)"
  - "Deciding a filter's operator set from its name when there is no live column schema to sample"
  - "Wiring a filter whose UI value differs from the raw column (a dropdown emitting a code that maps to a related entity)"
  - "Serializing a multi-select filter value whose labels can contain the delimiter"
  - "Reasoning about persisted saved views after a filter field is renamed"
tags: [filters, cerca-lavoratori, lavoratori, catalog, curation, numeric-inference, provincia, provincia-sigla, multi_enum, wire-contract, saved-views, gate1, gate2, design-pattern]
---

# cerca-lavoratori filter catalog: curation, numeric type inference, and provincia enum-sigla wiring

## Context

BAZ-37 fixed the broken `/cerca-lavoratori` filters. The bug's root cause was server-side (the province fast-path compared a SIGLA against the denormalized full-name column, and the `multi_enum` matcher split JSON on comma) — that story lives in `backend-supabase`. This doc is the **frontend half**: the filter *catalog* the filter-builder renders, why it is hand-curated, and the three non-obvious wiring decisions that make it match what the RPC matcher expects.

Since FASE 4 BIS there is no live column schema behind these filters — the old `table-query includeSchema=true` round-trip was removed. The filter field list is now a **static, hand-maintained catalog** in `use-lavoratori-data.ts`. The catalog is not private to `/cerca-lavoratori`: it feeds the same `useLavoratoriData` hook that also powers the gate1 and gate2 workers-pipeline views, so every curation decision here is a **global** one.

## Guidance

### 1. One curated catalog, shared by three surfaces

`WORKER_FILTER_FIELD_NAMES` (`use-lavoratori-data.ts:100`) mirrors the edge function's `ALLOWED_FIELDS['lavoratori']` allow-list exactly — it is the universe of filterable columns. Two derived structures shape it into the offered list:

- `HIDDEN_WORKER_FILTER_FIELDS` (`use-lavoratori-data.ts:140`) — a `Set` of fields removed from the **filter** UI: tracking (`utm_*`, `fbclid`, `gclid`), PII (`email`, `telefono`, `iban`, `id_stripe_account`), free text (`descrizione_*`, `feedback_recruiter`, `riassunto_profilo_breve`), blobs (`foto`, `availability_final_json`), orphan FKs (`referente_*_id`), and meta (`id`, `creato_il`, `aggiornato_il`, `ultima_modifica`). Note `id`/`creato_il`/`aggiornato_il` stay in `WORKER_SORTABLE_FIELDS` (`:59`) — hiding is filter-only, sorting is a separate list.
- `WORKER_SCHEMA_COLUMNS` (`use-lavoratori-data.ts:161`) = `WORKER_FILTER_FIELD_NAMES` minus the hidden set, each mapped to a `TableColumnMeta` via `inferWorkerFilterType`.

Because `useLavoratoriData` is the single hook behind cerca **and** gate1/gate2, adding a name to `HIDDEN_WORKER_FILTER_FIELDS` hides that field in **all three** — a deliberate global choice, not a per-view toggle. There is no per-surface override; if a field must be filterable in one view but not another, this catalog is the wrong layer for that distinction.

### 2. Numeric type inference so range operators appear

There is no column schema to sample, so a filter's operator set is inferred from its **name** in `inferWorkerFilterType` (`use-lavoratori-data.ts:145`):

- `id` → `"id"`.
- Any name in `NUMERIC_WORKER_FILTER_FIELDS` (`:143`) OR prefixed `anni_` → `"number"` (unlocks range operators like between/≥/≤).
- Date-like names (`data_*`, `*scadenza*`, `*deadline*`, `creato_il`, `aggiornato_il`) not ending in `_id` → `"date"`.
- Everything else → `"text"`.

`NUMERIC_WORKER_FILTER_FIELDS` exists because the numeric ratings and `paga_oraria_richiesta` are **not** `anni_`-prefixed, so the prefix heuristic alone would render them as text. The set is a deliberate exception list. **Do not add `rating_corporatura`** — it is stored as free text in the DB, so range operators would be meaningless; its exclusion is asserted in `use-lavoratori-data.filters.test.ts` (`:28`). `filterType` is later overridden to `enum`/`multi_enum` for lookup-backed fields (see §3/§4), so `inferWorkerFilterType` only needs to settle id/number/date/text.

### 3. provincia → `provincia_sigla`: the value/field indirection

The province filter is a special case in `buildWorkerFilterFields` (`use-lavoratori-data.ts:357`). The column in the catalog is `provincia`, but the RPC matches on the canonical `indirizzi.provincia_sigla` of the worker's residence, **not** on the denormalized full-name `lavoratori.provincia`. So the built filter field diverges from every other field:

- `value: "provincia_sigla"` (not `"provincia"`) — this is the **field name sent to the RPC**, aligning cerca with the gate1/gate2 dedicated province filter, which already emitted `provincia_sigla` (`buildGate1RpcFilters` `:242`, `buildGate1RpcFilterGroup` `:277`).
- `type: "enum"`, `options: provincieOptions` — `useProvincieOptions` (`src/hooks/use-provincie.ts`) maps the `provincie` table to `{ value: row.sigla, label: row.sigla }`, so the dropdown **emits the SIGLA** (`"MI"`), which is exactly what the RPC compares against `provincia_sigla`.

This is the frontend counterpart to the backend fix: the old catalog emitted field `provincia` with a SIGLA value, which the RPC compared against the full-name column → zero matches. Renaming the emitted field to `provincia_sigla` is what closes that gap. Asserted in `use-lavoratori-data.filters.test.ts` (`:98`).

### 4. The multi_enum wire contract: serialize as JSON, and test it where it lives

For lookup-backed `enum`/`multi_enum` fields, `buildWorkerFilterFields` (`:372`) uses the lookup **label** as the option value (the DB stores labels, not keys), with `tipo_lavoro_domestico` further normalized via `normalizeDomesticRoleDbLabel`. The multi-select control then serializes the chosen labels through `serializeFilterList` (`data-table-filters.ts:289`), called from `data-table-filter-builder.tsx:232`.

`serializeFilterList` is **`JSON.stringify(list)`** — and it must stay JSON. The labels contain commas and slashes (`"Colf / Pulizie"`, `"Assistenza Domestica / Badante"`), so a comma-join would be ambiguous on the read side. This is a **wire contract**: the frontend `JSON.stringify` must round-trip against the backend `parse_filter_value_list` (JSON-array-string first, comma fallback). It was moved into `data-table-filters.ts` specifically so the contract could be pinned by a unit test — `data-table-filters.test.ts` asserts the JSON round-trip and that commas/slashes survive, alongside `splitFilterList` (the case-preserving reader) fallback branches. Keep the two files' formats in lockstep; changing one silently breaks the matcher.

### 5. Saved views degrade gracefully but silently mis-match

Persisted saved views (`localStorage` key `lavoratori.cerca.saved-views`, `:50`) store filter conditions by field name. A view saved before BAZ-37 holds the old field `provincia` with a SIGLA value. After the rename, that condition still loads without error — but it is sent to the RPC as field `provincia` (which the matcher enriches only as `provincia_sigla`), so it **silently matches nothing**. There is no migration and no warning. The remedy is operational: recreate any province-bearing saved view so it re-emits `provincia_sigla` (a team-comms note, not a code change).

## Why This Matters

With no live schema, this static catalog *is* the filter contract. Three things have to line up or filters silently return zero: the **name-based type inference** (so numeric fields get range operators), the **provincia value/field indirection** (so the dropdown's SIGLA reaches `provincia_sigla`, matching gate1/gate2), and the **JSON wire format** (so multi-select labels with commas/slashes survive to `parse_filter_value_list`). "Silently" is the theme — a wrong field name or a comma-joined list produces empty results, not an error, which is exactly how BAZ-37 hid for so long. Pinning the two brittle seams (`inferWorkerFilterType` + `buildWorkerFilterFields` in `use-lavoratori-data.filters.test.ts`; `serializeFilterList`/`splitFilterList` in `data-table-filters.test.ts`) turns those invisible contracts into executable specs.

## When to Apply

- Editing the filter catalog: change `WORKER_FILTER_FIELD_NAMES` only to track `ALLOWED_FIELDS['lavoratori']`; use `HIDDEN_WORKER_FILTER_FIELDS` to curate the UI, remembering it hides across cerca **and** gate1/gate2.
- Making a name-inferred column numeric: add it to `NUMERIC_WORKER_FILTER_FIELDS` **only if it is truly numeric in the DB** (not `rating_corporatura`).
- Any filter whose UI value differs from its raw column: emit the field name the matcher expects as `value` and source options from the authoritative lookup (the provincia/`provincia_sigla` pattern).
- Any multi-select whose option labels can contain the delimiter: serialize as JSON and pin the round-trip against the backend parser in a test.
- Renaming a filter field: expect persisted saved views to keep the old name and silently mis-match — plan a recreate/communication step, since there is no auto-migration.

## Examples

```ts
// provincia is the only field whose emitted `value` differs from its catalog name:
// dropdown emits the SIGLA, field sent to the RPC is provincia_sigla.
if (column.name === "provincia") {
  return {
    label: toReadableColumnLabel("provincia"),
    value: "provincia_sigla",          // ← field the matcher compares against
    type: "enum",
    options: provincieOptions,         // useProvincieOptions → { value: sigla, label: sigla }
  } satisfies FilterField
}
```

```ts
// Multi-select wire contract: JSON, because labels carry commas/slashes.
export function serializeFilterList(values: string[]) {
  return JSON.stringify(values)   // must round-trip against backend parse_filter_value_list
}
```

Related: the multiselect pass-through/strict semantics and option-sourcing decisions in `design-patterns/map-filters-pass-through-semantics.md`; the lookup-label-as-value rule noted in `bazeoffice/CLAUDE.md` (Data Layer). The server-side half of BAZ-37 (province LEFT JOIN LATERAL on `indirizzi`, `parse_filter_value_list`) lives in `backend-supabase`.
