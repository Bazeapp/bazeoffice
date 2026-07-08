---
date: 2026-07-08
topic: hooks-export-cleanup
type: refactor
status: approved
origin: brainstorming session — unnecessary hook re-exports
---

# refactor: Module hooks export cleanup

## Summary

Clean up `src/modules/*/hooks/` so hooks folders export **only React hooks** (and hook-specific types). Move pure helpers, constants, and board mappers to each module's `lib/`. Slim barrel `index.ts` files, fix cross-module imports, delete dead code, and add a regression guard.

Chosen scope: **Option C** — full separation + dead code removal, one PR per module (Approach A).

## Problem

Several hook files and barrel `index.ts` files export symbols that do not belong in `hooks/`:

1. **Passthrough re-exports** — hook files re-export symbols already defined in `lib/` (CRM, ricerca, lavoratori).
2. **Pure helpers in hook files** — board mappers, field-binding constants, `preserveMissingFields`, stage resolvers live in `use-*-board.ts` and are re-exported through barrels.
3. **Bloated barrels** — `gestione-contrattuale`, `payroll`, and `rapporti` barrels export 10+ non-hook symbols but have **zero consumers**.
4. **Dead code** — `src/modules/lavoratori/hooks/worker-editor/` (10 duplicate files, zero imports).

This violates AGENTS.md module anatomy (`lib/` for pure utils, `hooks/` for React hooks) and encourages cross-module imports of non-hook symbols via `@/modules/<dominio>/hooks`.

## Target rule

| Subfolder | Owns |
|-----------|------|
| `hooks/` | `use*.ts` files; `index.ts` exports only `use*` hooks and hook-specific types (params, return shapes, form drafts tied to a hook API) |
| `lib/` | Pure functions, constants, mappers, field bindings, stage resolvers |
| `types/` | Domain types not tied to a single hook |

**`hooks/index.ts` must not export:** constants, mappers, `preserveMissingFields`, lib passthroughs, or utility functions.

## Per-module extraction map

### lavoratori

| Action | Detail |
|--------|--------|
| Delete | `hooks/worker-editor/` (10 duplicate files, 0 imports) |
| Move to `lib/worker-editor/` | `draft-builders.ts`, `editor-utils.ts`, `patch-worker-field.ts` (pure; currently under `hooks/`) |
| Stop re-exporting | `buildRelatedSelectionsMap` from `use-lavoratori-data.ts` — already lives in `lib/worker-list-mapper.ts` |
| Unexport | `resolveGateViewProps` / `ResolvedGateViewProps` in `use-gate1-view.ts` (internal only) |
| Slim barrel | `useLavoratoriData`, `useSelectedWorkerEditor`, `useGate1View`, `useLavoratoriCercaDetail` only |

### crm

| Action | Detail |
|--------|--------|
| Remove passthroughs | Delete re-exports from `use-crm-pipeline-preview.ts` (`mapCardData`, `normalizeLookupPatchLabels`, `serializeCrmPipelineFilters`, field bindings) — all already in `lib/` |
| Slim barrel | `useCrmPipelinePreview`, `useCrmAssegnazione` only |
| Tests | `use-crm-pipeline-preview.test.ts` imports from `lib/` |

### ricerca

| Action | Detail |
|--------|--------|
| Remove passthroughs | Delete re-exports from `use-ricerca-workers-pipeline.ts` (`mergeGroupedPipelineColumns`, `fetchWorkersPipelineData`, `applyRicercaWorkersPipelineMoveOptimistic`, status utils) |
| Barrel | Already hooks-only — no change |
| Tests | `use-ricerca-workers-pipeline.integration.test.tsx` imports pure helpers from `lib/` |

### gestione-contrattuale

| Action | Detail |
|--------|--------|
| Create `lib/assunzioni-board.ts` | `RAPPORTO_FIELD_BINDINGS`, `ASSUNZIONE_FIELD_BINDINGS`, `LAVORATORE_ASSUNZIONE_FIELD_BINDINGS`, `RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS`, `preserveMissingFields`, `mapAssunzioniBoardCard` |
| Create `lib/chiusure-board.ts` | `CHIUSURA_*_FIELD_BINDINGS`, `preserveMissingFields`, `mapChiusuraBoardCard` |
| Create `lib/variazioni-board.ts` | `VARIAZIONE_*_FIELD_BINDINGS`, `preserveMissingFields`, `mapVariazioneBoardCard` |
| Slim barrel | `useAssunzioniBoard`, `useChiusureBoard`, `useVariazioniBoard`, `useAssunzioniDetailSheet` only |
| Tests | Colocated `*.test.ts` import from `lib/` |

Note: three board files each have their own `preserveMissingFields` copy. **Do not unify** in this pass — semantics differ slightly (column-keyed). Unification is a follow-up after characterization tests live on `lib/`.

### rapporti

| Action | Detail |
|--------|--------|
| Create `lib/rapporti-board.ts` | `RAPPORTO_FIELD_BINDINGS`, `preserveMissingFields`, `mapRapportoBoardRow` |
| Slim barrel | `useRapportiLavorativiData` only |
| Tests | `use-rapporti-lavorativi-data.test.ts` imports from `lib/` |

### payroll

| Action | Detail |
|--------|--------|
| Create `lib/payroll-board.ts` | `TERMINAL_STAGE_IDS`, `PRESERVED_DETAIL_FIELDS`, `preserveDetailFields` |
| Create `lib/contributi-quarter.ts` | `getQuarterDateRange` |
| Slim barrel | `usePayrollBoard`, `useContributiInpsBoard` only |
| Tests | `use-payroll-board.test.ts` imports from `lib/` |

### support

| Action | Detail |
|--------|--------|
| Create `lib/riattivazioni-stage.ts` | `RIATTIVAZIONI_STAGE_DEFINITIONS`, `resolveStage`, `hasRiattivazioneStatus`, `shouldShowUnclassifiedChiusura`, `getChiusuraTipoLabel` |
| Slim barrel | `useRiattivazioniBoard`, `useProveColloquiData`, `useSupportTicketsBoard` only |
| Tests | `use-riattivazioni-board.test.ts` imports from `lib/` |

### anagrafiche

No changes — already exports only `useAnagraficheData`.

## Cross-module import fixes

| File | Current import | After |
|------|----------------|-------|
| `ricerca/components/ricerca-workers-map-view.tsx` | `@/modules/lavoratori/hooks` → `buildRelatedSelectionsMap` | `@/modules/lavoratori/lib` |
| `ricerca/components/ricerca-detail-view.tsx` | `@/modules/crm/hooks` → `normalizeLookupPatchLabels` | `@/modules/crm/lib` |
| `payroll/components/payroll-overview-view.tsx` | `../hooks/use-payroll-board` → `TERMINAL_STAGE_IDS` | `@/modules/payroll/lib` |
| `support/__tests__/use-riattivazioni-board.test.ts` | `@/modules/support/hooks` → stage helpers | `@/modules/support/lib` |
| `lavoratori/components/lavoratori-cerca-detail-panel.tsx` | `../hooks/draft-builders` → `WorkerAddressDraft` | `@/modules/lavoratori/lib` |

**Stays as hook import:** `ricerca/hooks/use-ricerca-worker-pipeline-overlay.ts` → `@/modules/lavoratori/hooks` `useSelectedWorkerEditor`.

## `lib/index.ts` updates

Each affected module's `lib/index.ts` must re-export the new symbols so cross-module consumers can import from `@/modules/<dominio>/lib` per AGENTS.md boundary rules.

CRM has no `lib/index.ts` today — create one exporting the existing lib surface (`field-bindings`, `lookup-utils`, `card-mapper`, `board-fetch` symbols needed cross-module).

## Regression guard

Extend `src/modules/__tests__/eslint-boundary.test.ts` (or add a dedicated Vitest file) to parse each `src/modules/*/hooks/index.ts` and assert every named export:

- starts with `use` (hook), or
- is a `type` export tied to a hook API.

Reject exports of `*FIELD_BINDINGS`, `map*`, `preserve*`, constants, or lib passthroughs.

## Documentation update

Update `docs/solutions/best-practices/characterization-testing-board-hook-contract-patterns.md`:

- Pure helpers are exported and tested from `lib/`, not from hook files.
- The "export from hook for characterization" pattern is retired in favor of `lib/` extraction.

## PR sequence

| # | Scope | Est. size |
|---|-------|-----------|
| 1 | `lavoratori` — delete `worker-editor/`, move editor pure files, slim barrel | ~200 LOC |
| 2 | `crm` + `ricerca` — remove passthrough re-exports, fix cross-imports | ~80 LOC |
| 3 | `gestione-contrattuale` — extract 3 board lib files | ~400 LOC |
| 4 | `rapporti` | ~150 LOC |
| 5 | `payroll` | ~150 LOC |
| 6 | `support` | ~120 LOC |
| 7 | `chore` — boundary test + docs update | ~60 LOC |

PRs 4–5 can run in parallel after PR 3 lands (no shared files).

## Testing

Each PR must keep green:

- `npm run test`
- `npm run lint`
- `npx tsc -b`

No behavior changes — move-only refactors. Existing characterization tests move import paths only.

## Out of scope

- Unifying duplicate `preserveMissingFields` implementations across modules.
- FASE 5 large-file hook splits (`use-gate1-view`, `use-crm-pipeline-preview`, etc.).
- Bulk-migrating components from `../hooks/use-*` direct imports to barrel `../hooks` imports.
- ESLint `no-restricted-exports` plugin (boundary Vitest guard is sufficient for v1).

## Success criteria

- Every `hooks/index.ts` exports only hooks (+ hook types).
- Zero non-hook exports from `use-*.ts` files (except unexported internals).
- Cross-module pure-symbol imports go through `lib/`, not `hooks/`.
- `worker-editor/` duplicate folder deleted.
- Regression guard prevents reintroduction.
