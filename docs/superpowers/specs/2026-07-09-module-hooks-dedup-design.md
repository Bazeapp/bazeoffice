---
date: 2026-07-09
topic: module-hooks-dedup
type: refactor
status: approved
origin: brainstorming session — shared hooks and lib extraction across module hooks
---

# refactor: Module hooks deduplication — shared lib + hooks

## Summary

Extract duplicated logic from `src/modules/*/hooks/` into shared **`src/lib/`** pure utilities and two thin **`src/hooks/`** helpers. Migrate board hooks, worker section editors, and data hooks to consume the shared layer. Behavior unchanged; existing characterization tests must stay green.

Chosen scope: **Option D** — all clusters (board hooks, worker editors, value/lookup utils) in one coordinated pass, delivered as **four PRs** (Approach A from brainstorming).

## Problem

36 hook files under `src/modules/*/hooks/` contain significant copy-paste despite existing shared infrastructure (`use-board-mutations`, `use-realtime-board-sync`, `use-auto-save-form`, `use-debounced-save`).

### Duplication inventory

| Pattern | Copies | Example files |
|---------|--------|---------------|
| `toStringValue` | 11 hooks | `use-assunzioni-board`, `use-ricerca-board`, `use-crm-assegnazione` |
| `normalizeToken` / comparable token | 8 hooks | gestione-contrattuale board hooks, payroll boards |
| `readLookupColor` | 9 hooks | board hooks, `use-anagrafiche-data` |
| `buildStageMetadata` (defaults + lookup) | 7 hooks | assunzioni, variazioni, chiusure, payroll, contributi-inps, ricerca-board (+ support-tickets variant) |
| `setBoardData` + `invalidateBoard` | ~12 hooks | all kanban-style hooks |
| `updateCard` column algebra | 4 hooks | assunzioni (rehome), variazioni/riattivazioni/chiusure (in-place) |
| `moveCard` optimistic column move | 8 hooks | same remove → prepend pattern in `applyOptimistic` |
| Worker section draft lifecycle | 6 hooks | skills, job-search, documents, experience, availability, address |
| Lookup color/options maps | 2 implementations | `use-anagrafiche-data` vs `lavoratori/lib/lookup-utils` |

Canonical implementations already exist but are not used consistently:

- `crm/lib/value-utils.ts` — `toStringValue`, `formatItalianDate`, array helpers
- `lavoratori/lib/lookup-utils.ts` — `normalizeLookupColors`, `normalizeLookupOptions`, `readLookupColor` (private)
- `ricerca/lib/pipeline-stage-metadata.ts` — `buildStageMetadata` for workers pipeline (different entity than `use-ricerca-board`)

## Target architecture

```
src/lib/
  value-utils.ts          ← expand: canonical value coercion/formatting
  lookup-stage-metadata.ts ← new: parameterized stage metadata builders
  board-column-utils.ts   ← new: pure column/card transforms

src/hooks/
  use-board-query-cache.ts    ← new: setBoardData + invalidateBoard
  use-worker-section-draft.ts ← new: editor draft lifecycle

src/modules/*/hooks/
  use-*-board.ts          ← thinner: domain fetch/map + wire shared pieces
  use-worker-*-editor.ts  ← thinner: domain patch/CRUD + useWorkerSectionDraft
```

Module hooks retain **domain-specific** concerns: fetch functions, card mappers, mutation tables/fields, deferred column loading, detail enrichment, support-ticket validation.

## Layer 1 — `src/lib/value-utils.ts` (expand)

Add functions currently copy-pasted across module hooks. Source of truth merges `crm/lib/value-utils.ts` into `src/lib/value-utils.ts`.

| Function | Notes |
|----------|-------|
| `toStringValue` | Trim strings; coerce number/boolean |
| `normalizeLookupToken` | `trim().toLowerCase()` |
| `normalizeComparableToken` | Unicode NFD strip + punctuation collapse (board `normalizeToken`) |
| `readLookupColor` | Read `metadata.color` from lookup row |
| `formatItalianDate` | `it-IT`, `Europe/Rome`, returns `"-"` on invalid |
| `formatItalianDateTime` | Same locale + time |
| `getFirstArrayValue` | First non-empty array element as string |
| `getStringArrayValue` | Array or single → string[] |
| `toBooleanValue` | Italian yes/no tokens |

Keep existing `isUuidValue`, `getSortableTimestamp` unchanged.

**Shim:** `crm/lib/value-utils.ts` re-exports from `@/lib/value-utils` so CRM module consumers need no immediate path changes.

**Migration targets (hooks):** all 11 hooks with local `toStringValue`; CRM/ricerca/support/payroll hooks with `formatItalianDate`.

## Layer 2 — `src/lib/lookup-stage-metadata.ts` (new)

### `buildStageMetadataFromDefaults`

For boards with hardcoded `DEFAULT_STAGE_DEFINITIONS` enriched by lookup rows:

```ts
type StageDefinition = { id: string; label: string; color: string }
type StageMetadata = { definitions: StageDefinition[]; aliases: Map<string, string> }

function buildStageMetadataFromDefaults(options: {
  defaultStages: StageDefinition[]
  lookupRows: LookupValueRecord[]
  entityTable: string
  entityField: string
  legacyAliases?: Record<string, string>
}): StageMetadata
```

**Consumers after migration:**

| Hook | entityTable | entityField | legacyAliases |
|------|-------------|-------------|---------------|
| `use-assunzioni-board` | `processi_matching` | `stato_assunzione` | — |
| `use-variazioni-board` | `variazioni_contrattuali` | `stato` | — |
| `use-chiusure-board` | `chiusure_contratti` | `stato` | — |
| `use-payroll-board` | `mesi_lavorati` | `stato_mese_lavorativo` | `LEGACY_STAGE_ALIASES` |
| `use-contributi-inps-board` | `contributi_inps` | `stato` | — |

### `buildStageMetadataFromLookupRows`

For boards where stages come entirely from lookup (no hardcoded defaults):

```ts
function buildStageMetadataFromLookupRows(options: {
  lookupRows: LookupValueRecord[]
  entityTable: string
  entityField: string
}): StageMetadata
```

**Consumer:** `use-ricerca-board` (`processi_matching.stato_res`).

### Explicitly out of scope

`use-support-tickets-board` — custom validation against `SUPPORT_TICKET_STATUSES`, ticket-row alias merging, sort-by-default-index. Stays module-local in `support/hooks/use-support-tickets-board.ts`.

`use-riattivazioni-board` — already uses `support/lib/riattivazioni-stage.ts` for stage definitions.

## Layer 3 — `src/lib/board-column-utils.ts` (new)

Pure functions for column/card cache updates. No React, no QueryClient.

| Function | Behavior | Used by |
|----------|----------|---------|
| `updateCardInColumns` | Map cards in place by `card.id` | variazioni, riattivazioni, chiusure |
| `updateCardAndRehome` | Remove card, apply updater, re-insert in column matching `card.stage` | assunzioni |
| `applyOptimisticCardMove` | Remove from source column, prepend to target; optional `patchCard` callback | all `useMoveMutation.applyOptimistic` |

Type constraints:

```ts
type BoardColumn<TCard> = { id: string; cards: TCard[] }
type IdentifiedCard = { id: string }
type StagedCard = IdentifiedCard & { stage: string }
```

Board hooks pass board-specific `patchCard` when the optimistic card needs extra fields (e.g. riattivazioni updates `record.stato_riattivazione_famiglia`).

## Layer 4 — `src/hooks/use-board-query-cache.ts` (new)

```ts
function useBoardQueryCache<TData>(queryKey: QueryKey): {
  setBoardData: (updater: (prev: TData | undefined) => TData | undefined) => void
  invalidateBoard: () => void
}
```

Wraps the identical `useQueryClient` + `setQueryData` + `invalidateQueries` pair found in ~12 hooks. Does **not** wrap `useQuery` — fetch shapes and query keys differ per board.

## Layer 5 — `src/hooks/use-worker-section-draft.ts` (new)

Encapsulates the repeated lifecycle in six lavoratori section editor hooks:

```ts
function useWorkerSectionDraft<TDraft>(options: {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  isEditing: boolean
  buildDraft: (row: LavoratoreRecord | null, ...args: unknown[]) => TDraft
  buildDraftArgs?: unknown[]
}): {
  draft: TDraft
  setDraft: React.Dispatch<React.SetStateAction<TDraft>>
  setIsEditing: (value: boolean) => void  // passed through from caller's useState
}
```

**Built-in effects:**

1. Resync draft from `selectedWorkerRow` when `!isEditing && activePatchesRef.current === 0`.
2. Reset `isEditing` to `false` on `selectedWorkerId` change.

**Consumers:** `use-worker-skills-editor`, `use-worker-job-search-editor`, `use-worker-documents-editor`, `use-worker-experience-editor`, `use-worker-availability-editor`, `use-worker-address-editor`.

**Unchanged:** `use-worker-header-editor` (presentation only, no draft pattern).

Each section hook keeps its own `patch*Field`, CRUD, and `updating*` flags — address/experience/availability are too domain-specific for a generic patch layer.

## Layer 6 — Data hook cleanup

### `use-anagrafiche-data`

Replace local `buildLookupColorMap`, `buildLookupOptionsMap`, `readLookupColor`, `normalizeLookupToken` with:

- `normalizeLookupColors` → convert to `LookupColorMap` shape expected by anagrafiche types
- `normalizeLookupOptions` from `@/modules/lavoratori/lib/lookup-utils`

If type shapes differ slightly, add a thin adapter in `anagrafiche/lib/` rather than duplicating logic.

## Per-hook migration notes

### Board hooks

| Hook | Shared lib | Shared hook | Local only |
|------|-----------|-------------|------------|
| `use-assunzioni-board` | value-utils, lookup-stage-metadata, board-column-utils | useBoardQueryCache | deferred columns, `getPreviousCard` merge |
| `use-variazioni-board` | all above | useBoardQueryCache | `createVariazione`, rapporto options |
| `use-chiusure-board` | all above | useBoardQueryCache | `createChiusura`, `patchChiusura`, `linkRapporto` |
| `use-riattivazioni-board` | value-utils, board-column-utils | useBoardQueryCache | stage from `riattivazioni-stage` lib |
| `use-ricerca-board` | value-utils, lookup-stage-metadata (lookup-only), board-column-utils | useBoardQueryCache | deferred columns, `loadDeferredColumn` |
| `use-payroll-board` | all above | useBoardQueryCache | `patchCard`, `enrichCardFromDetail`, `detailRefreshTick` |
| `use-contributi-inps-board` | all above | useBoardQueryCache | quarter filtering, INPS-specific patches |
| `use-support-tickets-board` | value-utils only | useBoardQueryCache | local `buildStageMetadata`, ticket type filtering |

Also adopt `useBoardQueryCache` in: `use-crm-assegnazione`, `use-crm-pipeline-preview`, `use-prove-colloqui-data`, `use-rapporti-lavorativi-data`, `use-ricerca-workers-pipeline`, `use-lavoratori-list` (already use realtime sync).

### Worker editors

Replace duplicated `useEffect` pairs with `useWorkerSectionDraft`. Keep `patchWorkerField` / `applyAddressPatch` / experience CRUD local.

## PR sequence

| PR | Scope | Est. LOC | Depends on |
|----|-------|----------|------------|
| **PR1** | `src/lib/value-utils` expand, `lookup-stage-metadata`, `board-column-utils` + unit tests | ~350 | — |
| **PR2** | Board hooks migration (gestione-contrattuale, support, ricerca, payroll) + `useBoardQueryCache` | ~400 | PR1 |
| **PR3** | `useWorkerSectionDraft` + 6 worker editor hooks | ~300 | PR1 |
| **PR4** | `use-anagrafiche-data` lookup cleanup + CRM value-utils shim + remaining hook imports | ~200 | PR1 |

PR2 and PR3 can run in parallel after PR1 lands (no shared files).

## Testing

| Layer | Test file | Cases |
|-------|-----------|-------|
| `value-utils` | `src/lib/value-utils.test.ts` (extend) | toStringValue, tokens, formatItalianDate, arrays |
| `lookup-stage-metadata` | `src/lib/lookup-stage-metadata.test.ts` (new) | defaults merge, legacy aliases, lookup-only, empty lookup |
| `board-column-utils` | `src/lib/board-column-utils.test.ts` (new) | in-place update, rehome, optimistic move, card not found |
| `useBoardQueryCache` | `src/hooks/use-board-query-cache.integration.test.tsx` (new) | setBoardData updater, invalidateBoard |
| `useWorkerSectionDraft` | `src/hooks/use-worker-section-draft.integration.test.tsx` (new) | activePatchesRef guard, worker change reset, editing guard |

**Regression:** existing board characterization tests must pass unchanged (import path updates only):

- `use-assunzioni-board.test.ts`
- `use-variazioni-board.test.ts`
- `use-chiusure-board.test.ts`
- `use-payroll-board.test.ts`
- `use-contributi-inps-board.test.ts`
- `use-selected-worker-editor.integration.test.tsx`

**Gate:** `npm run test`, `npm run lint`, `npx tsc -b` on every PR.

No new E2E — behavior-preserving refactor.

## Out of scope

- Splitting monolithic hooks (`use-crm-pipeline-preview`, `use-gate1-view`, `use-support-tickets-board` body).
- Unifying `preserveMissingFields` across board lib files (separate follow-up per `2026-07-08-hooks-export-cleanup-design.md`).
- `useKanbanBoard` mega-hook (rejected in brainstorming — too heterogeneous).
- Bulk-migrating legacy components outside `src/modules/*/hooks/`.
- Moving board mappers out of hooks (covered by separate hooks-export-cleanup spec if not already done).

## Success criteria

- Zero local `toStringValue` / `normalizeToken` / `readLookupColor` in module hook files (except support-tickets local stage builder).
- Six board hooks use `buildStageMetadataFromDefaults`; ricerca-board uses `buildStageMetadataFromLookupRows`.
- Four hooks use `updateCardInColumns` or `updateCardAndRehome` instead of inline column maps.
- ~12 hooks use `useBoardQueryCache`.
- Six worker editor hooks use `useWorkerSectionDraft`.
- `use-anagrafiche-data` imports lookup helpers from `lavoratori/lib/lookup-utils`.
- Estimated **800–1,200 lines** of duplication removed; all existing tests green.

## Relationship to other specs

Complements `docs/superpowers/specs/2026-07-08-hooks-export-cleanup-design.md` (move pure helpers from hooks to module `lib/`). This spec addresses **cross-module** duplication that module-local `lib/` cannot solve. Both can proceed independently; board lib extractions from 07-08 should land before or alongside PR2 to avoid merge conflicts in the same hook files.
