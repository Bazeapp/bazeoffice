# BAZ-27 — Filtri Mappa Ricerca (requirements)

> Linear: BAZ-27 · Tier 2 (bazeoffice only) · Branch `feat/baz-27-28-29-mappa-ricerca`
> Brainstorm date: 2026-07-02

## Problem

The mappa ricerca (`src/components/ricerca/ricerca-workers-map-view.tsx`) has only two filter groups (Stato, Giorni). To find workers by gender, car, nationality, or age, recruiters must hover every profile one by one. High daily operational cost (segnalato: Giulia, Francesco).

## Users & value

Internal recruiters shortlisting workers on the map. Value: narrow the map to matching profiles directly, without opening each card.

## Goals

- Add 4 faceted filters to the map: **Genere, Automuniti, Nazionalità, Età**.
- **Collapsible filter bar**: a toggle button (lucide `list-filter` icon) hides/shows the bar; bar visible by default; a **blue dot** on the toggle when the filter state is non-default.
- **Reset button** that restores all filters to their default.

## Non-goals / out of scope

- Backend / edge-function changes — not needed (see Dependencies).
- Cleaning the dirty `nazionalita` lookup (144 values with duplicates) — proposed as a **separate task**.
- Worker-card actions/info on the map — those are **BAZ-28** and **BAZ-29** (same branch, done after).

## Filters — behavior

Reuse the map's existing chip-filter pattern (`MapFilterGroup` + `CheckboxChip` + pure predicate `workerMatchesVisibleFilters`), default = **all flagged**, applied client-side in the existing filter `useMemo`, combined in **AND** with the existing Stato/Giorni filters and the text search. Keep all filter predicates in a **pure, unit-testable module** (per `filtri-toolbar-checkboxchip` and `cedolini-derivazioni-pure-badge-filtro`).

**Guiding rule for missing data:** *missing/unknown data never hides a worker* — the only exception is an active Nazionalità selection, where an unknown nationality naturally cannot match.

| # | Filter | Control | Source | Semantics |
|---|--------|---------|--------|-----------|
| 1 | **Genere** | 2 chips: Donna, Uomo | `sesso` | "Preferisco non dire" is **not** offered. Worker hidden only if its `sesso` is Donna/Uomo **and** that value is deselected; other/missing `sesso` passes through. |
| 2 | **Automuniti** | 2 chips: Automunito, Non automunito | derived from `come_ti_sposti` | Automunito ⇔ `come_ti_sposti` includes **"Ho la patente e la macchina"**. Missing `come_ti_sposti` → not considered (pass-through). Derivation lives in the shared pure module (badge↔filter parity). |
| 3 | **Nazionalità** | Searchable multiselect (combobox) | `nazionalita` (144 lookup labels) | Default = **none selected** = no constraint. With selections active, worker passes if its `nazionalita` ∈ selected set. Matches the stored value **as-is** (dirty duplicates → known gaps). |
| 4 | **Età** | 5 chips: 18–29, 30–39, 40–49, 50–59, 60+ | `eta` (already derived number) | Worker hidden only if its age falls in a **deselected** band; missing `eta` → pass-through. |

Note: **Mezzo di trasporto is intentionally NOT added.** It derives from the same field (`come_ti_sposti`) as Automuniti, which already covers the operationally-relevant distinction (has-car vs not). Only Automuniti ships from that field. `come_ti_sposti` is still exposed on the worker for the Automuniti derivation.

## Filter bar UX

- New filter groups are added to the existing filter row of the map toolbar.
- **Toggle** button (lucide `list-filter`, per the issue's HTML snippet) collapses/expands the whole filter bar; the bar is **expanded by default**.
- **Blue dot** on the toggle when the current filter state ≠ default (any chip deselected in any group, or any nationality selected).
- **Reset** button (inside the bar): restores **all** filter groups to their default — existing Stato → all, Giorni → its search-derived default (`defaultWorkDaysFromSearch`), and the 4 new groups → default. Reset turns the blue dot off.

## Success criteria

- Recruiter can narrow the map by any combination of the 4 new filters plus the existing ones; results update immediately.
- Filters combine in AND with each other and with text search.
- Blue dot correctly reflects non-default state; Reset clears it and restores defaults.
- Filter predicates are covered by unit tests on the pure module.

## Dependencies / assumptions

- **VERIFIED — no backend work.** The map loads workers via RPC `lavoratori_by_ids`, whose body is `select * from public.lavoratori` (`backend-supabase/.../20260608000000_baseline.sql`). So `sesso`, `nazionalita`, `come_ti_sposti`, `data_di_nascita` are **already on the client**; only the map builder `buildDiscoveryWorkerListItem` and the worker list type need to expose them. Tier 2, bazeoffice only, no edge-function deploy.
- Enum values confirmed against `lookup_values` (project `baze`): `sesso` = Donna/Uomo/Preferisco non dire; `come_ti_sposti` = 4 values; `nazionalita` = 144 active labels (dirty: `italia`/`Italiana`, `perù`/`Peruviana`, `Filippine`/`Filippino`, `Moldavia`/`Moldova`, `Sri Lanka`/`Shri Lanka`, …).

## Open questions

- **Nazionalità data cleanup** — 144 labels with case/duplicate inconsistencies make exact-match filtering leaky. Out of scope here; recommend a dedicated data-cleanup Linear issue.

## References

- **Learning:** `learning/filtri-toolbar-checkboxchip.md`, `learning/cedolini-derivazioni-pure-badge-filtro.md`. Precedent PR: bazeoffice#40 (BAZ-36 pipeline cedolini filtri).
- **Code:** `src/components/ricerca/ricerca-workers-map-view.tsx` (existing filters: options 58-66, predicate 247-256, state 893-898, apply 945-952, UI 1143-1190; builder `buildDiscoveryWorkerListItem` 278-360); `src/components/payroll/cedolini-filters.ts` (pure-module pattern); `src/components/lavoratori/lavoratore-card.tsx:50-81` (`LavoratoreListItem` type); `src/components/crm/crm-pipeline-famiglie-view.tsx:353` (`hasActiveFilters` pattern for the blue dot).
- **Grounding dossier:** `/tmp/compound-engineering/ce-brainstorm/baz-27/grounding.md`.
