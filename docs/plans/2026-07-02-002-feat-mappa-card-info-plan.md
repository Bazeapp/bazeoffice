---
title: "feat: Card lavoratore sulla mappa — nazionalità, disponibilità e altre ricerche (BAZ-29)"
date: 2026-07-02
type: feat
linear: BAZ-29
branch: feat/baz-27-28-29-mappa-ricerca
status: planning
---

# feat: Card lavoratore sulla mappa — nazionalità, disponibilità, altre ricerche (BAZ-29)

## Summary

Enrich the worker card shown on the ricerca map (the hover/click popup, rendered by the shared `LavoratoreCard`) with **Nazionalità**, **disponibilità / turni-giorni**, and the **"altre ricerche" status dots** ("pallini") plus their drill-down popover. The dots + popover already exist in `LavoratoreCard`; the map just never populated `otherActiveSelections`. Reuses the board's one-shot summary builder so the popover details are pre-populated (no lazy callback wiring). Single repo (`bazeoffice`), no backend changes expected.

---

## Problem Frame

The map worker card shows too little to judge a profile without opening the full sheet (segnalato: recruiter). It currently omits nationality, availability/shift-days, and any signal that the worker is already engaged in **other** ricerche. The pipeline card already shows the "altre selezioni" dots; the map card sets `otherActiveSelections: null` and its body renders neither nazionalità nor disponibilità nor turni.

---

## Requirements

- **R1** — Show **Nazionalità** on the worker card (from `nazionalita`).
- **R2** — Show **disponibilità** and **turni/giorni disponibili** (from `disponibilita` + `checkLavoriAccettabili`).
- **R3** — Show the **"altre ricerche" dots** for the worker's other selezioni, with the detail popover (family, stato selezione/ricerca, recruiter, orario, zona, note) — for **all** loaded map workers.
- **R4** — "Altre ricerche" excludes the **current** ricerca process (they are *other* searches).
- **NG1** — Display goes on the **shared** `LavoratoreCard` (confirmed), rendered **conditionally** so views that don't populate a field show no empty row.
- **NG2** — No backend/RPC changes (reuse existing RPCs + `anagrafiche-api` helpers).

---

## Key Technical Decisions

- **KTD1 — Pre-populate `otherActiveSelections.details` via the board's one-shot builder, not the pipeline's lazy callback.** `buildRelatedSelectionsMap` (`src/hooks/use-lavoratori-data.ts`) builds `{count, dots, details}` in one pass from `lavoratori_selezioni_correlate` rows. `LavoratoreCard` already falls back to `otherSelections.details` when no lazy details are loaded, so pre-filling `details` makes the popover work with **no** `onLoadOtherActiveSelectionDetails` wiring. This avoids the pipeline view's heavy 4-fetch lazy callback (`ricerca-workers-pipeline-view.tsx`).
- **KTD2 — Export `buildRelatedSelectionsMap` for reuse** (it is currently module-private). Single source of truth for map + board; keeps dot/detail derivation identical across views.
- **KTD3 — Filter the current process out of "altre ricerche"** (R4). `lavoratori_selezioni_correlate` is worker-scoped (not process-scoped); filter rows where `processo_matching_id === processId` before building, so the current search isn't listed as an "other" one. Keep this filter a **pure, unit-tested** step.
- **KTD4 — Conditional display in the shared card** (NG1). Render Nazionalità / Disponibilità / turni only when the field is present/non-empty, so the pipeline/cerca cards (which may not populate all of them) gain no empty rows. `checkLavoriAccettabili` moves onto the base `LavoratoreListItem` type as an optional field.
- **KTD5 — `recruiterLabelsById` source.** `buildRelatedSelectionsMap` needs a recruiter-id→label map. Reuse the board's existing recruiter-label fetch/build (in `use-lavoratori-data.ts`); if it isn't exportable cleanly, fetch recruiter labels for the correlate rows' `recruiter_ricerca_e_selezione_id`s via the existing anagrafiche read path. Resolve the exact helper at the start of U2.

---

## Implementation Units

### U1. Export the related-selections summary builder

**Goal:** Make the board's pure summary builder reusable by the map.

**Requirements:** R3.

**Dependencies:** none.

**Files:**
- `src/hooks/use-lavoratori-data.ts` — add `export` to `buildRelatedSelectionsMap` (and, if needed, to the recruiter-labels helper it depends on / that the board builds).

**Approach:** Pure re-export; no behavior change. If `buildRelatedSelectionsMap` reads module-local helpers (`formatRelatedFamilyName`, `formatRelatedSearchLabel`, `formatRelatedZona`, `getDotColorClassName`, `resolveLookupColorByStatusToken`), confirm they're importable where used (they already live in shared libs per the board); only the builder itself needs exporting.

**Test scenarios:** `Test expectation: none` — pure export, no behavior change; exercised via U2's tests.

**Verification:** typecheck passes; board still builds its summaries unchanged.

---

### U2. Populate `otherActiveSelections` for map workers (with current-process filter)

**Goal:** Fetch each loaded worker's other selezioni and inject the summary into the map worker items, excluding the current process.

**Requirements:** R3, R4.

**Dependencies:** U1.

**Files:**
- `src/components/ricerca/ricerca-workers-map-view.tsx` — thread `processId` into `useDiscoveryWorkers`; in its load, after resolving worker ids + `lookupColorsByDomain`, fetch correlate rows + recruiter labels, filter out the current process, run the exported builder, and pass the resulting `Map<workerId, summary>` into `buildDiscoveryWorkerListItem` (replace `otherActiveSelections: null`).
- `src/lib/anagrafiche-api.ts` — reuse `fetchLavoratoriSelezioniCorrelate(workerIds)` (verify row shape at impl start; add a thin row adapter only if the standalone RPC's shape differs from what `buildRelatedSelectionsMap` reads).
- `src/components/ricerca/ricerca-workers-map-filters.test.ts` **or** a new `src/hooks/…related-selections.test.ts` — see test scenarios (test the pure filter+build, not the component).

**Approach:**
- Verify first: does `fetchLavoratoriSelezioniCorrelate` return rows with `lavoratore_id`, `processo_matching_id`, `stato_selezione`, `stato_res`, `famiglia_nome`, `famiglia_cognome`, `numero_ricerca_attivata`, `recruiter_ricerca_e_selezione_id`, `orario_di_lavoro`, `note_selezione`? If not, adapt (KTD1 target shape).
- Extract the "filter current process → build summaries" into a **pure helper** (e.g. `buildMapRelatedSelections(rows, processId, lookupColors, recruiterLabels)`) so it's unit-testable and keeps the component thin.
- Merge nuance: `buildDiscoveryWorkerListItem` currently returns `otherActiveSelections: null`; give it the summaries map (or set post-build). Note the existing `displayWorker` merge (`{...item.worker, ...pipeline.card.worker}`) — ensure a pipeline card's own `otherActiveSelections` doesn't clobber the map's with something inconsistent; prefer the freshly-built map summary as the source of truth for the map.

**Test scenarios** (pure helper):
- Rows for a worker across 2 other processes + 1 row for the current `processId` → summary has `count: 2`, current process excluded, dots ≤ 4, details for the 2 others.
- Worker with only current-process rows → no summary (or count 0) → card shows no dots.
- Empty rows / worker with no correlate rows → no entry in the map.
- Dot color derives from `stato_selezione` via lookup; missing recruiter label → empty string, no crash.
- Dedup: two rows same `processo_matching_id` → one detail/dot.

**Verification:** on the map, workers engaged in other ricerche show the dots + count; opening the popover lists the other searches (family/stato/recruiter/orario/zona); the current search is never listed.

---

### U3. Display Nazionalità, Disponibilità and turni on the shared card

**Goal:** Render the three info items in `LavoratoreCard`, conditionally.

**Requirements:** R1, R2, NG1.

**Dependencies:** none (independent of U1/U2; can land first).

**Files:**
- `src/components/lavoratori/lavoratore-card.tsx` — add `checkLavoriAccettabili?: string[]` to the base `LavoratoreListItem` type; in the default-variant body (`RecordCard.Body`, after the roles/work-types badges), add conditional rows/badges for Nazionalità (from `nazionalita`), Disponibilità (badge colored via `disponibilitaColor`), and turni/giorni (from `checkLavoriAccettabili`, compact — e.g. "N giorni" chips or a joined label).

**Approach:**
- Mirror the existing badge idiom (`getBadgeClassName` / `getStatusSoftClassName`, `text-2xs` rows with lucide icons) already used for roles, work types, location, phone.
- Guard each item on presence: `worker.nazionalita ? … : null`, `worker.disponibilita ? … : null`, `checkLavoriAccettabili?.length ? … : null` — so pipeline/cerca cards that don't populate a field show nothing new (NG1). The `gate1` variant has its own body and is untouched.
- `checkLavoriAccettabili` is already populated on the map's `MapWorkerListItem`; other builders leave it undefined → not shown.

**Test scenarios:** `Test expectation: none` at the component level (heavy shared card; happy-dom render of the full card is high-cost/low-value here). Verified manually across map + pipeline; guarded by the conditional-rendering rule (a worker with the fields shows them, one without shows no empty row). If a lightweight render test is cheap to add for the "no empty row when fields absent" guard, add it.

**Verification:** map card shows nazionalità + disponibilità + turni when present; pipeline/cerca cards are visually unchanged for workers lacking those fields.

---

## Scope Boundaries

**In scope:** the three info items on the shared card (conditional) + populating the map's "altre ricerche" dots/popover, all in `bazeoffice`.

### Deferred to Follow-Up Work
- Wiring the lazy `onLoadOtherActiveSelectionDetails` callback for the map (not needed — details are pre-populated via KTD1). Only revisit if correlate payloads become too large to fetch eagerly for all loaded workers.

### Out of scope
- Backend/RPC changes.
- Changing the pipeline/board "altre selezioni" behavior (only the shared card's display gains conditional info rows).
- BAZ-27 (filters) and BAZ-28 (card actions) — already done on this branch.

---

## Risks & Dependencies

- **Correlate row-shape mismatch** — the standalone `lavoratori_selezioni_correlate` RPC may not return exactly the fields `buildRelatedSelectionsMap` reads (the board consumes them embedded in `lavoratori_board`). Mitigation: verify at U2 start; add a thin adapter if needed. Handled as the first U2 step.
- **Eager fetch cost** — fetching correlate + recruiter labels for all loaded workers adds a round-trip on map load. Acceptable (worker sets are radius-bounded batches); the fetch runs in the existing `Promise.all` load path.
- **Shared-card blast radius** — conditional rendering (KTD4) keeps pipeline/cerca cards unchanged for workers lacking the new fields; verify manually that views which *do* populate `disponibilita` don't gain an unwanted badge (if they do and it's unwanted, gate the new rows behind a card prop instead — fallback, not default).

---

## Sources & Research

- Grounding (this session): `LavoratoreCard` dots/popover + fallback (`src/components/lavoratori/lavoratore-card.tsx` ~313-321, 435-472, 477-549); base type (~50-81); `buildRelatedSelectionsMap` (`src/hooks/use-lavoratori-data.ts` ~599-679); fetch helpers (`src/lib/anagrafiche-api.ts` `fetchLavoratoriSelezioniCorrelate` ~1019, `fetchRicercaWorkerRelatedSelectionSummaries` ~931); pipeline lazy callback to avoid (`src/components/ricerca/ricerca-workers-pipeline-view.tsx` ~1589); map builder + load (`src/components/ricerca/ricerca-workers-map-view.tsx` ~278-360, ~607-668).
- Product decisions resolved interactively with the user (shared-card display; full-detail pallini for all loaded workers). No upstream brainstorm doc for BAZ-29.
