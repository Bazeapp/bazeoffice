---
title: "fix: Align realtime detail-sheet updates across boards"
date: 2026-07-29
type: fix
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# fix: Align realtime detail-sheet updates across boards

## Goal Capsule

Make every listed board/detail sheet refresh open-form fields from remote CDC the same way lavoratori gate 1/2 and payroll cedolini already do — without clobbering local dirty edits — and fix the specific section failures and local preview bugs called out in the audit.

**Authority:** this plan + `docs/realtime-board-pattern.md` + confirmed session defaults (keepDirtyValues protects dirty keys; clean fields resync even in edit mode; include textarea clipping; include chiusure badge recompute).

**Stop when:** each in-scope surface either reloads open detail on realtime (Pattern B / `reloadOpenDetail`) or correctly preserves/merges via Pattern A where cache is shared; characterization tests pin the bug-class behaviors; `npm run test` + tsc + lint green.

---

## Product Contract

### Summary

Operators editing open schede on CRM, ricerca, lavoratori (cerca + gates), rapporti, assunzioni/chiusure/variazioni, and contributi INPS should see remote field updates for clean fields while local dirty values stay protected. Cedolini is the working reference, not a redesign target.

Product Contract unchanged (bootstrap from session audit + confirmed call-out defaults).

### Requirements

- **R1.** Open detail/sheet fields refresh after another user’s remote change when the field is not locally dirty.
- **R2.** Locally dirty fields are not overwritten by remote defaults (`keepDirtyValues`); successful autosave must clear dirty so subsequent remote updates can land.
- **R3.** Edit-mode sections (e.g. assegnazione scheduling) still resync **clean** fields from remote; only dirty keys stay local.
- **R4.** Ricerca detail sidebar process/family/address fields refresh on remote change (board already works).
- **R5.** Lavoratori gate + cerca: indirizzo, esperienze (incl. under tipologia lavori), ricerche coinvolte, and documenti amministrativi refresh on relevant remote changes.
- **R6.** Debounced textareas in esperienze/referenze do not clip trailing characters while typing.
- **R7.** Rapporti, assunzioni, chiusure, variazioni, and contributi INPS open sheets refresh on realtime like cedolini / gate Pattern B.
- **R8.** Chiusure: after own `tipo_licenziamento` save, badge/preview (`tipoLabel` / color) updates immediately — not only after full remount.
- **R9.** Every feature-bearing unit ships characterization/integration tests that fail if the guard is removed.

### Actors

- **A1.** Operator with an open scheda on one client.
- **A2.** Peer operator (or same user on another tab) mutating the same record via CDC-published tables.

### Key Flows

- **F1.** Peer updates a clean field → open scheda shows new value within debounce + echo window.
- **F2.** Operator is mid-edit on field X (dirty) → peer updates X → local draft kept; peer updates Y → Y updates.
- **F3.** Operator saves dirty field → dirty clears → later peer update to that field lands.
- **F4.** Peer moves/updates board-related rows → kanban stays correct **and** open sheet fields stay current.

### Acceptance Examples

- **AE1.** Two browsers on same chiusura: change `tipo_licenziamento` in A → B’s open sheet + badge update; A’s badge updates after own save without reload.
- **AE2.** Ricerca detail sidebar: peer changes famiglia telefono → sidebar field updates while pipeline board still moves cards.
- **AE3.** Gate/cerca: peer changes worker address → address section updates; typing in esperienza note does not lose trailing chars after debounce.
- **AE4.** Assegnazione: with scheduling edit enabled, peer changes `stato_res` → field updates if not dirty locally.
- **AE5.** Contributi INPS open sheet: peer patches contributo → sheet fields refresh (cedolini-equivalent).

### Scope Boundaries

**In scope**

- Pattern B / `reloadOpenDetail` / detail ticks on: ricerca detail, CRM assegnazione, rapporti detail, assunzioni/chiusure/variazioni sheets, contributi INPS.
- Lavoratori related-table realtime + address reload path (gate + cerca).
- Debounced textarea clipping in esperienze/referenze.
- Chiusure `tipoLabel`/`tipoColor` recompute on local patch.
- CRM pipeline: verify post-autosave dirty clear so remote updates can land after save (not changing keepDirtyValues policy).

**Out of scope**

- Redesigning cedolini (reference only).
- Notifiche / commenti realtime.
- Anagrafiche AgGrid.
- FASE 6 BIS sync-engine / OCC / per-table write counters (`docs/realtime-bug-class-plan.md`).
- Forcing remote overwrite of dirty fields (rejected — keepDirtyValues stays).

### Deferred to Follow-Up Work

- Ricerca **open worker overlay** full Pattern B (selection scheda) — sidebar is in scope; overlay was previously intentionally one-shot (BAZ-19). Follow up if still stale after sidebar + pipeline work.
- Broadening echo-window / reconnect hardening (FASE 6 BIS).

---

## Planning Contract

### Key Technical Decisions

1. **Extend existing primitives — do not invent a sync engine.** `(session-settled: user-directed — chosen over greenfield sync layer: align with lavoratori gate / useRealtimeBoardSync)` Use `useRealtimeBoardSync` + Pattern A/B from `docs/realtime-board-pattern.md`.

2. **keepDirtyValues remains the dirty-field policy.** `(session-settled: user-approved — chosen over remote-wins/conflict UI: protect in-progress edits; clean fields still resync)` Concurrent same-field remote updates while dirty will not appear until dirty clears — this is intentional, not a bug, for CRM pipeline dirty keys.

3. **Edit mode must not freeze clean fields.** Assegnazione’s `isEditingScheduling` draft guard must be replaced or narrowed so clean fields follow remote card/defaults (prefer `useAutoSaveForm` like other sheets).

4. **Cedolini is the Pattern B twin for board sheets.** Mirror `use-payroll-board.ts` (`detailRefreshTick` via `reloadOpenDetail`) + selection effect deps — especially for contributi INPS, assunzioni/chiusure/variazioni, rapporti.

5. **Lavoratori tables must include related CDC sources for open scheda.** Today `LAVORATORI_REALTIME_TABLES = ["lavoratori"]` only — expand (or filter with `shouldReloadOpenDetail`) for `indirizzi`, experience/reference/document tables, and selection/process tables needed by ricerche coinvolte; reload address inside the Pattern B scheda path (today address is explicitly one-shot).

6. **Chiusure badge is a local merge bug, not only realtime.** `applyChiusuraPatchInColumns` patches `record.tipo_licenziamento` but leaves `tipoLabel`/`tipoColor` stale — recompute using the same metadata path as `mapChiusuraBoardCard`.

### High-Level Technical Design

```mermaid
sequenceDiagram
  participant Peer as Peer client
  participant DB as Supabase CDC
  participant Sync as useRealtimeBoardSync
  participant Board as Board query cache
  participant Detail as Open detail state / form defaults
  participant Form as useAutoSaveForm

  Peer->>DB: UPDATE row
  DB->>Sync: postgres_changes
  Sync->>Sync: debounce + echo/pending-write guards
  Sync->>Board: reload / invalidate
  Sync->>Detail: reloadOpenDetail / realtimeTick
  Detail->>Form: new defaults
  Form->>Form: reset(defaults, keepDirtyValues)
  Note over Form: dirty keys kept; clean keys take remote
```

Pattern choice per surface:

| Surface | Board realtime today | Gap | Fix |
|---|---|---|---|
| Lavoratori gate/cerca | Yes (`lavoratori`) | Related tables + address | Broaden tables + Pattern B address reload |
| Ricerca detail sidebar | Pipeline only | No process card reload | Subscribe + reload card (Pattern B) |
| CRM pipeline | A + reloadOpenDetail | Dirty after save / intentional keep | Verify dirty-clear; no policy change |
| CRM assegnazione | Board only | Edit-mode draft freeze | Form resync clean fields |
| Rapporti / Assunzioni / Chiusure / Variazioni / Contributi | Board (+A where noted) | No open-sheet tick | Cedolini-style `reloadOpenDetail` |
| Chiusure badge | — | Patch omits label/color | Recompute on patch |

### Assumptions

- CDC publication already includes the needed public tables (`supabase/migrations/20260523210000_enable_realtime_for_board_tables.sql`); if a related table is missing from publication, add a migration in the same unit that subscribes to it.
- Echo window (~2500ms) and pending-write defer remain correct — units must use `runTracked` for writes.
- Worker overlay BAZ-19 one-shot open behavior stays unless a follow-up explicitly expands it.

### Risks & Dependencies

- **Risk: over-broad lavoratori table subscription** → noisy full-list reloads. Mitigate with `shouldReloadBoard` / `shouldReloadOpenDetail` filters (list already filters by visible/selected ids).
- **Risk: toast storms on detail reload** (ricerca overlay history). Mitigate: silent reload; do not re-open overlays or re-fire loading toasts on tick.
- **Risk: Pattern A preserve hiding remote detail** if Pattern B omitted (payroll lesson). Always pair board preserve with open-detail tick when detail-only fields exist.
- **Dependency:** `docs/realtime-board-pattern.md`, write-tracking, `useAutoSaveForm` characterization docs.

### Alternatives Considered

- **Force remote overwrite of dirty fields** — rejected (session default).
- **New sync/OCC layer (FASE 6)** — deferred; too large vs aligning Pattern B.
- **Per-page one-off setState sync effects** — rejected; duplicates echo/debounce bugs; use shared `useRealtimeBoardSync`.

---

## Implementation Units

### U1. Lavoratori related-table realtime + address Pattern B

**Goal:** Gate 1/2 and cerca-lavoratori refresh indirizzo, esperienze, referenze, documenti, and ricerche coinvolte on relevant remote changes.

**Requirements:** R1, R5, R9

**Dependencies:** none

**Files:**
- `src/modules/lavoratori/lib/list-constants.ts` (or dedicated realtime constants)
- `src/modules/lavoratori/hooks/use-lavoratori-list.ts`
- `src/modules/lavoratori/hooks/use-selected-lavoratore-detail.ts`
- `src/modules/lavoratori/hooks/use-lavoratori-data.ts`
- Tests: `src/modules/lavoratori/hooks/__tests__/use-lavoratori-realtime-detail.integration.test.tsx` (new or extend existing detail/list tests)

**Approach:**
- Extend subscribed tables beyond `lavoratori` for open-detail relevance; keep board reload filtered so unrelated inserts do not thrash the list.
- Include address refetch in `reloadSelectedWorkerScheda` / Pattern B path (remove “address bootstrap only” gap).
- Ensure esperienze/referenze/documenti/related-search loaders depend on the same `realtimeTick` (or equivalent) as the worker scheda.

**Patterns to follow:** `use-lavoratori-list.ts` + `use-selected-lavoratore-detail.ts`; filtering via `shouldReloadOpenDetail`.

**Execution note:** Add characterization coverage before widening tables — pin that address/related loaders re-run on tick.

**Test scenarios:**
- Happy: selected worker open; simulated CDC on `indirizzi` for that worker → address defaults update.
- Happy: CDC on experience/document row for selected worker → section data refreshes.
- Happy: CDC on selezione/process affecting ricerche coinvolte → groups refresh.
- Edge: CDC for a different worker id → open detail does not reload.
- Integration: board list still reloads only for visible/selected membership events (existing filter contract preserved).

**Verification:** Open gate/cerca with two clients; change address and an esperienza remotely → clean fields update; list does not full-reload on every unrelated experience insert.

---

### U2. Fix esperienze/referenze textarea debounce clipping

**Goal:** Typing in esperienza/referenza textareas no longer loses trailing characters after debounce/resync.

**Requirements:** R6, R9

**Dependencies:** none (can parallel U1)

**Files:**
- `src/hooks/use-debounced-save.ts` (contract review)
- `src/components/forms/field-components.tsx` / experience form call sites under `src/modules/lavoratori/components/experience-references-*.tsx`
- Tests: `src/modules/lavoratori/components/__tests__/experience-references-textarea.integration.test.tsx` (new) or extend existing experience card tests

**Approach:**
- `FieldTextarea` already forwards `identity` to `DebouncedTextarea` — pin call sites in `experience-references-edit.tsx` / `experience-references-forms.tsx` (and referenze equivalents) with `identity={rowId}` so committed-value resync from autosave/realtime does not reset mid-keystroke for the same row.
- Do not redesign `field-components`; avoid weakening keepDirtyValues.

**Patterns to follow:** `DebouncedInput`/`DebouncedTextarea` `identity` prop; `docs/solutions/best-practices/characterization-testing-rhf-realtime-false-greens.md` (drive with real change events).

**Test scenarios:**
- Happy: type continuously past debounce → final value includes last characters; save sees full string.
- Edge: remote defaults change on a **different** field while typing → textarea keeps in-progress text.
- Edge: switch to another experience row (`identity` change) → textarea shows the other row’s committed value.
- Error: failed save does not leave clipped local buffer inconsistent with form dirty state.

**Verification:** Manual type-fast in esperienza note on cerca + gate tipologia subsection; no clip after autosave.

---

### U3. Ricerca detail sidebar Pattern B

**Goal:** `/ricerca/:processId` sidebar fields refresh on remote process/family/address changes.

**Requirements:** R1, R4, R9

**Dependencies:** none

**Files:**
- `src/modules/ricerca/hooks/use-ricerca-detail-view.ts`
- Possibly thin helper for tables / reload in `src/modules/ricerca/lib/`
- Tests: `src/modules/ricerca/hooks/__tests__/use-ricerca-detail-realtime.integration.test.tsx` (new)

**Approach:**
- Subscribe via `useRealtimeBoardSync` (or shared rows) on process/family/address tables relevant to the open process.
- On event: silent reload of `loadRicercaDetailCard` (bump tick / `reloadVersion` equivalent) without geocode side effects.
- `editForm` already uses `useAutoSaveForm` — new defaults will resync clean fields.

**Patterns to follow:** Gate `reloadOpenDetail`; do **not** reintroduce overlay toast loops (BAZ-19). Pipeline board sync stays as-is.

**Test scenarios:**
- Happy: CDC on `famiglie` for open process’s family → sidebar telefono/email defaults update when clean.
- Happy: dirty sidebar field kept; sibling field updates.
- Edge: event for another process id → no reload.
- Integration: workers pipeline invalidate still independent.

**Verification:** Two clients on same ricerca detail URL; peer edits famiglia → sidebar updates; pipeline cards still move.

---

### U4. CRM assegnazione edit-mode resync + pipeline dirty-clear check

**Goal:** Assegnazione “stato e assegnazione” updates while editing enabled for clean fields; pipeline dirty fields remain protected but become updateable after successful autosave.

**Requirements:** R1, R2, R3, R9

**Dependencies:** none

**Files:**
- `src/modules/crm/hooks/use-crm-assegnazione.ts`
- `src/modules/crm/components/assegnazione-detail-sheet.tsx` (and related)
- CRM onboarding/stato cards / autosave dirty-clear path as needed
- Tests: extend `src/modules/crm/hooks/use-crm-assegnazione.test.ts` and onboarding card integration tests under `src/modules/crm/components/cards/__tests__/`

**Approach:**
- Replace `isEditingScheduling` + `schedulingDraft` freeze with `useAutoSaveForm` driven by card defaults so dirty keys are RHF dirty (not a boolean edit-mode latch). Half-merging remote into local draft while `isEditing` stays true is not enough.
- Add `reloadOpenDetail` if open sheet holds a snapshot that board invalidate does not replace.
- Pipeline: confirm autosave clears dirty via `keepValues` reset after save; fix any field that remains dirty forever (false freeze). Do not change keepDirtyValues policy for in-progress edits.

**Patterns to follow:** `useAutoSaveForm` / gate forms; CRM `reloadOpenDetail` in `use-crm-pipeline-preview.ts`.

**Test scenarios:**
- Happy: editing enabled; remote `stato_res` change → UI updates when local field clean.
- Happy: local dirty `stato_res` → remote change ignored until save clears dirty.
- Happy (pipeline): after autosave of field X, remote change to X applies on next detail reload.
- Edge: only recruiter previously resynced — stato/date must too.

**Verification:** Assegnazione sheet with edit on; peer changes stato → updates. Pipeline: dirty mid-edit still protected; after save, peer edit lands.

---

### U5. Gestione-contrattuale sheets Pattern B + chiusure badge recompute

**Goal:** Assunzioni, chiusure, and variazioni open sheets refresh on realtime; chiusure tipo badge updates after own edit and remote edit.

**Requirements:** R1, R7, R8, R9

**Dependencies:** none

**Files:**
- `src/modules/gestione-contrattuale/hooks/use-assunzioni-board.ts`
- `src/modules/gestione-contrattuale/hooks/use-assunzioni-detail-sheet.ts`
- `src/modules/gestione-contrattuale/hooks/use-chiusure-board.ts`
- `src/modules/gestione-contrattuale/hooks/use-chiusure-detail-sheet.ts`
- `src/modules/gestione-contrattuale/lib/chiusure-board.ts` (`applyChiusuraPatchInColumns`)
- `src/modules/gestione-contrattuale/hooks/use-variazioni-board.ts`
- `src/modules/gestione-contrattuale/hooks/use-variazioni-detail-sheet.ts`
- Tests: extend board hook tests + new detail-sheet realtime integration tests under `src/modules/gestione-contrattuale/hooks/` / `lib/`

**Approach:**
- Wire `reloadOpenDetail` (or selection `detailRefreshTick`) so open `selectedFreshCard` / sheet state re-fetches after board realtime — mirror cedolini selection deps.
- Keep Pattern A bindings; do not rely on A alone for open sheets.
- Extend `applyChiusuraPatchInColumns` signature to accept the same `tipoMetadata` used by `mapChiusuraBoardCard`; when `tipo_licenziamento` / `tipo_decesso` is in the patch, recompute `tipoLabel`/`tipoColor` and update call sites. Mirror in sheet `applyCardChange` if it patches cards outside that helper.

**Patterns to follow:** `use-payroll-board.ts` + `use-cedolini-board-selection.ts`; Pattern A bindings already in assunzioni/chiusure/variazioni libs.

**Test scenarios:**
- Happy: open chiusura; remote patch motivazione → sheet field updates when clean.
- Happy: local change `tipo_licenziamento` → badge `tipoLabel` updates without remount.
- Happy: remote tipo change → sheet badge + form defaults update when clean.
- Happy: same for assunzioni/variazioni open sheets on their primary tables.
- Edge: Pattern A still preserves detail-only fields on board refetch.

**Verification:** AE1 on chiusure; open assunzioni/variazioni sheets update across two clients.

---

### U6. Rapporti detail + contributi INPS Pattern B (cedolini twin)

**Goal:** Rapporti lavorativi detail sections and contributi INPS sheet refresh on realtime like cedolini.

**Requirements:** R1, R7, R9

**Dependencies:** none (parallel to U5)

**Files:**
- `src/modules/rapporti/hooks/use-rapporti-lavorativi-data.ts`
- `src/modules/rapporti/hooks/use-rapporto-detail-panel.ts`
- `src/modules/payroll/hooks/use-contributi-inps-board.ts`
- `src/modules/payroll/hooks/use-contributi-inps-selection.ts`
- `src/modules/payroll/hooks/use-contributi-inps-detail.ts`
- Tests: new/extend integration tests beside those hooks

**Approach:**
- Rapporti: add `reloadOpenDetail` that re-runs `loadSelectedRapporto` + section loaders (or bump a tick in their deps). Consider related-table subscriptions only if section data lives outside `rapporti_lavorativi` and must refresh without a parent-row event.
- Contributi: add `detailRefreshTick` via `reloadOpenDetail` exactly like payroll board; put tick in selection/detail effect deps (remove “avoid re-fetch on every board refresh” for the open card only).

**Patterns to follow:** `use-payroll-board.ts`, `use-cedolini-board-selection.ts`, `use-cedolino-detail.ts`.

**Test scenarios:**
- Happy: open rapporto; remote patch → panel form defaults update when clean.
- Happy: open contributo; remote patch → detail fields update.
- Edge: no selected card → `reloadOpenDetail` is no-op.
- Integration: echo window still suppresses self-write reload storm.

**Verification:** AE5; rapporti detail two-client field update.

---

### U7. Cross-surface characterization net + docs checklist

**Goal:** Pin bug-class guards with fails-without-the-fix tests; update the realtime pattern checklist if new conventions appear.

**Requirements:** R9

**Dependencies:** U1–U6 (each of U1–U6 must ship its own listed scenarios before merge; this unit is cross-surface only)

**Files:**
- Tests colocated with units above
- `docs/realtime-board-pattern.md` — update the chiusure “no separate detail loader” note; open sheets need Pattern B
- Optionally note progress against `docs/realtime-bug-class-plan.md` FASE gaps (no bulk rewrite)

**Approach:**
- Do not defer U1–U6 scenarios here. U7 adds one cross-surface mutation-verify (remove tick / `reloadOpenDetail` → open sheet stays stale) plus docs checklist.
- RHF tests use real change events, not bare `setValue`.
- Pure helpers (chiusure label recompute) in `*.test.ts`.
- Prefer landing one cedolini-twin wiring first (contributi or chiusure) as the template before copying Pattern B across remaining boards.

**Patterns to follow:** `docs/solutions/best-practices/characterization-testing-rhf-realtime-false-greens.md`, `use-realtime-board-sync.integration.test.tsx`, payroll/lavoratori existing nets.

**Test scenarios:**
- Meta: each U1–U6 scenario that was deferred lands here if not already present.
- Mutation-verify: remove tick from detail effect deps → remote event no longer refreshes open sheet (one representative surface).

**Verification:** `npm run test` green; spot-check matrix in Verification Contract.

---

## Verification Contract

**Automated**

- `npm run test` (Vitest unit + integration)
- `npx tsc -b --pretty false` (or project’s typecheck script used in CI)
- `npm run lint`

**Manual matrix (two browsers / two accounts on same staging data)**

| Surface | Check |
|---|---|
| Gate + cerca | Address + esperienza + documenti + ricerche coinvolte remote update; textarea no clip |
| Ricerca detail | Sidebar fields update; pipeline still moves |
| Pipeline | Clean fields update; dirty protected; after save, remote lands |
| Assegnazione | Clean scheduling fields update while editing enabled |
| Rapporti detail | Section fields update |
| Assunzioni / Chiusure / Variazioni | Open sheet updates; chiusure badge after own tipo change |
| Contributi INPS | Open sheet updates |
| Cedolini | Smoke: still works (no regression) |

---

## Definition of Done

- [ ] U1–U7 complete with listed tests
- [ ] Manual matrix above passes on staging/local against real Supabase realtime
- [ ] No new bypass of `runTracked` on writes in touched paths
- [ ] keepDirtyValues policy unchanged; edit-mode clean-field resync works on assegnazione
- [ ] CI gate (`test` + `tsc` + `lint`) green
- [ ] No bulk migration of unrelated legacy code

---

## Appendix

### Research breadcrumbs

- Reference Pattern B: `src/modules/lavoratori/hooks/use-lavoratori-list.ts`, `use-selected-lavoratore-detail.ts`
- Reference Pattern A+B twin: `src/modules/payroll/hooks/use-payroll-board.ts`, `use-cedolini-board-selection.ts`
- Pattern docs: `docs/realtime-board-pattern.md`, `docs/realtime-bug-class-plan.md` (FASE 5/6 remaining)
- Learnings: `docs/solutions/best-practices/board-card-display-field-realtime-binding-decision.md`, `characterization-testing-rhf-realtime-false-greens.md`
- Chiusure badge gap: `applyChiusuraPatchInColumns` in `src/modules/gestione-contrattuale/lib/chiusure-board.ts` vs `mapChiusuraBoardCard` label computation

### Confirmed session defaults

1. Protect dirty local values (`keepDirtyValues`).
2. Resync clean fields even when a section is in edit mode.
3. Include textarea debounce clipping fix.
4. Include chiusure preview-badge stale-after-own-edit.

