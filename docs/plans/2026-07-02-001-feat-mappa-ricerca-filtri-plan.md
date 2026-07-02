---
title: "feat: Filtri Mappa Ricerca (BAZ-27)"
date: 2026-07-02
type: feat
linear: BAZ-27
origin: docs/brainstorms/2026-07-02-baz-27-mappa-ricerca-filtri-requirements.md
branch: feat/baz-27-28-29-mappa-ricerca
status: planning
---

# feat: Filtri Mappa Ricerca (BAZ-27)

## Summary

Add 4 faceted filters — **Genere, Automuniti, Nazionalità, Età** — to the search map, plus a collapsible filter bar (toggle button with a blue dot when non-default) and a Reset button. Pure-frontend, single repo (`bazeoffice`); the data is already fetched. Reuses the map's existing chip-filter pattern and extracts the new filter logic into a pure, unit-tested module.

Origin: `docs/brainstorms/2026-07-02-baz-27-mappa-ricerca-filtri-requirements.md`.

---

## Problem Frame

The map (`src/components/ricerca/ricerca-workers-map-view.tsx`) has only two filter groups (Stato, Giorni). Recruiters must hover every profile to find workers by gender, car, nationality, or age. High daily operational cost. This plan adds the missing filters directly on the map.

---

## Requirements

Traced from the origin requirements doc:

- **R1** — Genere filter: 2 chips (Donna, Uomo) from `sesso`; "Preferisco non dire"/missing pass through (never hidden by Genere).
- **R2** — Automuniti filter: 2 chips (Automunito, Non automunito), derived — automunito ⇔ `come_ti_sposti` includes `"Ho la patente e la macchina"`; missing `come_ti_sposti` passes through.
- **R3** — Nazionalità filter: searchable multiselect; default none selected = no constraint; with a selection active, a worker passes iff its `nazionalita` is in the selection.
- **R4** — Età filter: 5 chips (18–29 / 30–39 / 40–49 / 50–59 / 60+) from `eta`; missing `eta` passes through.
- **R5** — Collapsible filter bar: toggle (lucide `list-filter`), bar expanded by default; **blue dot** on the toggle when the filter state ≠ default.
- **R6** — Reset button restores **all** filter groups (existing Stato/Giorni + the 4 new) to their defaults.
- **R7** — Filters combine in AND with each other, with Stato/Giorni, and with the text search; results update immediately.
- **NG1** — No backend / edge-function changes (data already returned by `lavoratori_by_ids`).
- **NG2** — `nazionalita` lookup cleanup is out of scope (see Scope Boundaries).
- **NG3** — Mezzo di trasporto filter NOT added (covered by Automuniti).

---

## Key Technical Decisions

- **KTD1 — Extract a pure filter module** `src/components/ricerca/ricerca-workers-map-filters.ts` for the 4 new filters: static option constants, derivations (`deriveAutomuniti`, `deriveEtaBucket`), per-filter predicates, a default-state factory, `hasActiveAdvancedFilters`, and `deriveNazionalitaOptions`. This follows `src/components/payroll/cedolini-filters.ts` (BAZ-36 / bazeoffice#40) and the learnings `learning/filtri-toolbar-checkboxchip.md` + `learning/cedolini-derivazioni-pure-badge-filtro.md` (badge↔filter parity; keep derivations in one testable place). The existing in-file Stato/Giorni filters stay as they are.
- **KTD2 — Keep `string[]` state, not `Set`.** The map's existing filters use `React.useState<string[]>` + the in-file `toggleFilterValue` helper. The 4 new chip/multiselect groups use the same `string[]` shape for consistency; do **not** import the `Set`-based cedolini state shape (mismatch). The pure module takes `readonly string[]` selections.
- **KTD3 — Custom pass-through predicates, not `hasAnyNormalizedValue`.** The existing `hasAnyNormalizedValue` hides a worker whose value isn't in the selected set — that would wrongly hide "Preferisco non dire"/null-age/no-transport workers. The new predicates instead pass through a worker when its value is *outside the offered option set or unknown*, and only exclude when the worker is positively classifiable into a **deselected** option. Guiding rule: *missing/unknown data never hides a worker* (the sole exception is an active Nazionalità selection, where unknown nationality cannot match).
- **KTD4 — Nazionalità options = nationalities present among loaded map workers**, derived in the worker `useMemo` (`deriveNazionalitaOptions`), sorted. Not the full 144-value lookup: it is dirty (duplicates/case) and filtering by a nationality absent from the current map is meaningless. Alternative (full lookup list) rejected on UX + data-quality grounds.
- **KTD5 — Values are labels.** Entity fields store lookup **labels** (per CLAUDE.md, post `restore_lookup_value_labels`), so options compare against labels: Genere `["Donna","Uomo"]`, Automuniti derived from the label `"Ho la patente e la macchina"`, Nazionalità against stored `nazionalita` labels — consistent with the existing Stato filter comparing `["Qualificato","Idoneo","Certificato"]`.
- **KTD6 — Blue dot / Reset span all groups.** `filtersActive` = `hasActiveAdvancedFilters(advanced)` OR Stato ≠ all OR Giorni ≠ its search-derived default (`defaultWorkDaysFromSearch(weeklyDays)`). Giorni's default is dynamic, so that comparison stays in the component; the new-filter part is pure. Blue dot renders a `size-2 rounded-full bg-blue-600` marker on the toggle; Reset restores every group.

---

## Implementation Units

### U1. Expose `sesso` / `nazionalita` / `comeTiSposti` on the map worker item

**Goal:** Make the three raw fields available on the worker card object the map filters read. No backend — `lavoratori_by_ids` already `select *`s them.

**Requirements:** R1, R2, R3.

**Dependencies:** none.

**Files:**
- `src/components/lavoratori/lavoratore-card.tsx` (~50-81) — add to `LavoratoreListItem`: `sesso?: string | null`, `nazionalita?: string | null`, `comeTiSposti?: string[]`.
- `src/components/ricerca/ricerca-workers-map-view.tsx` (`buildDiscoveryWorkerListItem`, ~278-360) — map `worker.sesso` → `sesso`, `worker.nazionalita` → `nazionalita`, `worker.come_ti_sposti` → `comeTiSposti` (coerce to `string[]`, default `[]`), mirroring the existing `eta: getAgeFromBirthDate(worker.data_di_nascita)` mapping.

**Approach:** `MapWorkerListItem = LavoratoreListItem & { checkLavoriAccettabili: string[] }` inherits the new optional fields automatically. Use the file's `asString` / array-coercion helpers for null-safety.

**Patterns to follow:** the existing field mappings in `buildDiscoveryWorkerListItem`.

**Test scenarios:** `Test expectation: none` — pure type + field mapping with no branching; exercised end-to-end through the U2 predicate tests (which consume `sesso`/`nazionalita`/`comeTiSposti` on fixtures).

**Verification:** typecheck passes; the three fields are populated on worker items (spot-check via the filters working in U3).

---

### U2. Pure filter module + unit tests

**Goal:** All new-filter logic in one pure, testable module.

**Requirements:** R1, R2, R3, R4, R5, R6.

**Dependencies:** U1 (type shape).

**Files:**
- `src/components/ricerca/ricerca-workers-map-filters.ts` (new).
- `src/components/ricerca/ricerca-workers-map-filters.test.ts` (new).

**Approach — module surface (directional, names may adjust in `ce-work`):**
- Constants: `GENERE_OPTIONS = ["Donna","Uomo"]`; `AUTOMUNITI_OPTIONS = ["Automunito","Non automunito"]`; `ETA_BUCKETS` = ordered `{ key, label, min, max }` for 18–29 / 30–39 / 40–49 / 50–59 / 60+ (last is `min:60, max:Infinity`); `AUTOMUNITO_TRANSPORT_LABEL = "Ho la patente e la macchina"`.
- Derivations: `deriveAutomuniti(comeTiSposti?: string[]): "Automunito" | "Non automunito" | null` (null when list missing/empty → pass-through); `deriveEtaBucket(eta?: number | null): string | null` (null when eta null or below the first band).
- State: `type MapAdvancedFilters = { genere: string[]; automuniti: string[]; nazionalita: string[]; eta: string[] }`; `createDefaultAdvancedFilters()` → genere/automuniti/eta = all options, nazionalita = `[]`.
- Predicates: `matchesGenere`, `matchesAutomuniti`, `matchesEta` (each: value outside offered options / unknown → true; empty selection → true; else selection-includes-derived-value); `matchesNazionalita` (empty selection → true; else `worker.nazionalita != null && selection.includes(worker.nazionalita)`); `workerMatchesAdvancedFilters(worker, filters)` = AND of the four.
- Helpers: `hasActiveAdvancedFilters(filters)` (genere/automuniti/eta differ from full option set, or nazionalita non-empty); `deriveNazionalitaOptions(workers)` → sorted distinct non-null `nazionalita`.

**Patterns to follow:** `src/components/payroll/cedolini-filters.ts` (option arrays, default factory, immutable/pure predicates + derivations).

**Test scenarios** (mirror `src/components/payroll/cedolini-filters.test.ts`):
- `createDefaultAdvancedFilters` selects all chip options and empty nazionalità.
- **Età boundaries:** 18→"18–29", 29→"18–29", 30→"30–39", 59→"50–59", 60→"60+", 85→"60+"; `null`→null (pass-through); 16→null (below first band).
- **Automuniti derivation:** `["Ho la patente e la macchina"]`→"Automunito"; `["Mi sposto con i mezzi"]`→"Non automunito"; `["Ho la patente e la macchina","Mi sposto con i mezzi"]`→"Automunito"; `[]`/`undefined`→null.
- **Genere pass-through:** sesso "Donna" hidden when only "Uomo" selected; sesso "Preferisco non dire" and `null` pass under any selection; empty selection passes all.
- **Nazionalità match:** empty selection passes all (incl. null nazionalità); selection `["Italiana"]` passes "Italiana", hides "Romania" and `null`.
- **`workerMatchesAdvancedFilters` AND:** worker passing all four passes; failing any one is excluded; default filters pass every worker.
- **`hasActiveAdvancedFilters`:** false at default; true when a chip is deselected or a nationality is selected.
- **`deriveNazionalitaOptions`:** dedupes, drops null, sorts; empty input → `[]`.

**Verification:** `npm run test:unit` green for the new file; every scenario above present and exercising real inputs (not asserting `true`).

---

### U3. Wire the 4 filters into the map view

**Goal:** New filter state, apply the predicate in the worker loop, render the 3 chip groups + the Nazionalità multiselect in the toolbar.

**Requirements:** R1, R2, R3, R4, R7.

**Dependencies:** U1, U2.

**Files:**
- `src/components/ricerca/ricerca-workers-map-view.tsx`.

**Approach:**
- State (near ~893-898): `const [advancedFilters, setAdvancedFilters] = React.useState<MapAdvancedFilters>(createDefaultAdvancedFilters)`; a `toggleAdvanced(group, value)` using the existing `toggleFilterValue` per group, and `setNazionalita` for the multiselect.
- Apply (worker `useMemo`, ~945-952): in the same for-loop, add `if (!workerMatchesAdvancedFilters(item.worker, advancedFilters)) continue`. Add `advancedFilters` to the memo deps.
- Nazionalità options: compute `nazionalitaOptions = deriveNazionalitaOptions(...)` from the loaded workers (in/near the same memo) so the dropdown reflects the current map.
- Render (toolbar container ~1142-1191): add 3 `MapFilterGroup`s (Genere, Automuniti, Età) with `CheckboxChip` (mirror the Stato group exactly), and one `MapFilterGroup label="Nazionalità"` wrapping the Base UI multiselect combobox.

**Patterns to follow:** the existing Stato group (`ricerca-workers-map-view.tsx:1143-1158`) for the chip groups; `src/components/ui/combobox.tsx` multi-select parts (`Combobox multiple` + `ComboboxChips`/`ComboboxChipsInput`/`ComboboxChipsTrigger` + `ComboboxContent`/`ComboboxSearch`/`ComboboxList`/`ComboboxItem`) for Nazionalità.

**Test scenarios:** `Test expectation: none` at the view level (heavy map component; behavior is covered by U2's predicate tests and the `deriveNazionalitaOptions` test). Verified by typecheck + manual (U4 verification covers the interactive pass).

**Verification:** the 4 filters appear on the map; toggling any narrows the pins; combines with Stato/Giorni/search; no console errors.

---

### U4. Collapsible bar + toggle + blue dot + Reset

**Goal:** Wrap the filter row in a collapsible controlled by a toggle button; blue dot when non-default; Reset restores all groups.

**Requirements:** R5, R6.

**Dependencies:** U3.

**Files:**
- `src/components/ricerca/ricerca-workers-map-view.tsx`.

**Approach:**
- Wrap the filter container (~1142-1191) in `Collapsible` (`src/components/ui/collapsible.tsx`), `open` state defaulting to `true`.
- Toggle button = the issue's `list-filter` button (lucide `ListFilter`), toggles the Collapsible; render a `size-2 rounded-full bg-blue-600` marker (absolute, top-right) when `filtersActive`.
- `filtersActive` = `hasActiveAdvancedFilters(advancedFilters)` OR `selectedStatuses` ≠ `STATUS_FILTER_OPTIONS` OR `selectedWorkDays` ≠ `defaultWorkDaysFromSearch(weeklyDays)`.
- Reset button (inside the bar, mirror `crm-pipeline-famiglie-view.tsx:800-817`): sets `selectedStatuses` → `[...STATUS_FILTER_OPTIONS]`, `selectedWorkDays` → `defaultWorkDaysFromSearch(weeklyDays)`, `advancedFilters` → `createDefaultAdvancedFilters()`.

**Patterns to follow:** `crm-pipeline-famiglie-view.tsx` `hasActiveFilters` (353-361) + conditional reset button (800-817); the issue's button HTML for the toggle styling.

**Test scenarios:** `Test expectation: none` at the view level — the pure part (`hasActiveAdvancedFilters`, default restoration via `createDefaultAdvancedFilters`) is tested in U2. Manual verification below covers collapse + reset wiring.

**Verification:** bar visible by default; toggle hides/shows it; blue dot appears once any group is non-default and clears after Reset; Reset restores every group (Stato/Giorni + the 4 new) and re-shows all pins.

---

## Scope Boundaries

**In scope:** the 4 filters, the collapsible bar, the blue dot, and Reset — all in `bazeoffice`.

### Deferred to Follow-Up Work
- **Nazionalità lookup cleanup** — 144 `lavoratori.nazionalita` labels with case/duplicate inconsistencies (`italia`/`Italiana`, `perù`/`Peruviana`, `Filippine`/`Filippino`, `Moldavia`/`Moldova`, …) make exact-match filtering leaky. Recommend a dedicated Linear issue (data-cleanup) — out of scope here.

### Out of scope
- Backend / edge-function changes (data already available).
- Worker-card actions/info on the map — **BAZ-28**, **BAZ-29** (same branch, planned separately).
- Mezzo di trasporto filter (covered by Automuniti).

---

## Risks & Dependencies

- **`come_ti_sposti` / `sesso` / `nazionalita` shape.** Assumed `string[]` / `string|null` labels per `lavoratore.ts` and the `select *` RPC. If any arrives in an unexpected shape (e.g. a comma-joined string), the derivations coerce defensively; confirm during `ce-work`.
- **Base UI combobox multiselect** is present but has no existing multi-select instance in-repo to copy 1:1; budget a little time to wire `Combobox multiple` correctly (search + chips + count).
- **Filter dirtiness (Nazionalità)** — known limitation, accepted (see Deferred).

---

## Sources & Research

- Origin: `docs/brainstorms/2026-07-02-baz-27-mappa-ricerca-filtri-requirements.md`.
- Learnings: `learning/filtri-toolbar-checkboxchip.md`, `learning/cedolini-derivazioni-pure-badge-filtro.md`. Precedent PR: bazeoffice#40 (BAZ-36).
- Verified integration points: `ricerca-workers-map-view.tsx` (`MapFilterGroup` 816-831; state 893-898; helpers 237-276; predicate 247-256; apply loop 945-952; builder 278-360; toolbar 1142-1191; `fetchLookupValues` in `useDiscoveryWorkers` ~623); `lavoratore-card.tsx:50-81`; `types/entities/lavoratore.ts` (`come_ti_sposti` 28, `nazionalita` 104, `sesso` 122); `ui/combobox.tsx` (multiselect parts); `payroll/cedolini-filters.test.ts` (test shape); `crm/crm-pipeline-famiglie-view.tsx` (353-361, 800-817).
