# Module Hooks Export Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hooks folders export only `use*` hooks; pure helpers live in flat, prefixed `lib/*.ts` files; barrels and cross-module imports are corrected.

**Architecture:** Move-only refactors per module (7 PRs). Cut pure symbols out of `use-*-board.ts` / editor helper files into `lib/<prefix>-*.ts`. Slim `hooks/index.ts` to hooks only. Update colocated tests and cross-module consumers to import from `@/modules/<dominio>/lib`. Add a Vitest guard on hook barrels.

**Tech Stack:** TypeScript, Vitest, ESLint, Vite SPA module anatomy per `AGENTS.md`.

**Spec:** `docs/superpowers/specs/2026-07-08-hooks-export-cleanup-design.md`

**Gate after every PR:** `npm run test && npm run lint && npx tsc -b`

---

## File map (new lib files)

| Module | Create | Source |
|--------|--------|--------|
| lavoratori | `lib/worker-editor-draft-builders.ts` | `hooks/draft-builders.ts` |
| lavoratori | `lib/worker-editor-utils.ts` | `hooks/editor-utils.ts` |
| lavoratori | `lib/worker-editor-patch-field.ts` | `hooks/patch-worker-field.ts` |
| gestione-contrattuale | `lib/assunzioni-board.ts` | cut from `hooks/use-assunzioni-board.ts` |
| gestione-contrattuale | `lib/chiusure-board.ts` | cut from `hooks/use-chiusure-board.ts` |
| gestione-contrattuale | `lib/variazioni-board.ts` | cut from `hooks/use-variazioni-board.ts` |
| rapporti | `lib/rapporti-board.ts` | cut from `hooks/use-rapporti-lavorativi-data.ts` |
| payroll | `lib/payroll-board.ts` | cut from `hooks/use-payroll-board.ts` |
| payroll | `lib/contributi-quarter.ts` | cut from `hooks/use-contributi-inps-board.ts` |
| support | `lib/riattivazioni-stage.ts` | cut from `hooks/use-riattivazioni-board.ts` |
| crm | `lib/index.ts` | new barrel for cross-module lib imports |

---

## PR 1 — lavoratori

### Task 1: Move editor pure files to prefixed lib

**Files:**
- Move (via `git mv`): `src/modules/lavoratori/hooks/draft-builders.ts` → `lib/worker-editor-draft-builders.ts`
- Move (via `git mv`): `src/modules/lavoratori/hooks/editor-utils.ts` → `lib/worker-editor-utils.ts`
- Move (via `git mv`): `src/modules/lavoratori/hooks/patch-worker-field.ts` → `lib/worker-editor-patch-field.ts`
- Modify: all hook files that imported the above (9 files — see grep list below)
- Modify: `src/modules/lavoratori/lib/index.ts`
- Modify: `src/modules/lavoratori/components/lavoratori-cerca-detail-panel.tsx`

**Hook files to update imports** (`./draft-builders` → `../lib/worker-editor-draft-builders`, etc.):
- `hooks/use-selected-worker-editor.ts`
- `hooks/use-worker-address-editor.ts`
- `hooks/use-worker-availability-editor.ts`
- `hooks/use-worker-documents-editor.ts`
- `hooks/use-worker-experience-editor.ts`
- `hooks/use-worker-job-search-editor.ts`
- `hooks/use-worker-skills-editor.ts`

`worker-editor-patch-field.ts` imports `PatchLoadingKey` from draft-builders — keep that relative import as `from "./worker-editor-draft-builders"` inside lib.

- [ ] **Step 1:** `git mv` the three files into `lib/` with prefixed names (preserves history).

```bash
git mv src/modules/lavoratori/hooks/draft-builders.ts \
  src/modules/lavoratori/lib/worker-editor-draft-builders.ts
git mv src/modules/lavoratori/hooks/editor-utils.ts \
  src/modules/lavoratori/lib/worker-editor-utils.ts
git mv src/modules/lavoratori/hooks/patch-worker-field.ts \
  src/modules/lavoratori/lib/worker-editor-patch-field.ts
```

- [ ] **Step 2:** Fix internal import in `worker-editor-patch-field.ts`:

```typescript
import type { PatchLoadingKey } from "./worker-editor-draft-builders"
```

- [ ] **Step 3:** Update all hook imports (example for `use-worker-address-editor.ts`):

```typescript
import {
  type PatchLoadingKey,
  type WorkerAddressDraft,
  buildAddressDraft,
} from "../lib/worker-editor-draft-builders"
import { formatEditorError } from "../lib/worker-editor-utils"
```

- [ ] **Step 4:** Update `lavoratori-cerca-detail-panel.tsx`:

```typescript
import type { WorkerAddressDraft } from "@/modules/lavoratori/lib"
```

- [ ] **Step 5:** Extend `src/modules/lavoratori/lib/index.ts`:

```typescript
export * from "./worker-editor-draft-builders"
export { formatEditorError } from "./worker-editor-utils"
export type { PatchWorkerField } from "./worker-editor-patch-field"
export { buildRelatedSelectionsMap } from "./worker-list-mapper"
```

- [ ] **Step 6:** Run gate — `npm run test && npm run lint && npx tsc -b`

- [ ] **Step 7:** Commit

```bash
git add -A src/modules/lavoratori/
git commit -m "refactor(lavoratori): move worker editor pure helpers to lib"
```

### Task 2: Slim lavoratori hooks barrel + stop hook re-exports

**Files:**
- Modify: `src/modules/lavoratori/hooks/use-lavoratori-data.ts`
- Modify: `src/modules/lavoratori/hooks/index.ts`
- Modify: `src/modules/lavoratori/hooks/use-gate1-view.ts`
- Modify: `src/modules/ricerca/components/ricerca-workers-map-view.tsx`

- [ ] **Step 1:** Remove from `use-lavoratori-data.ts`:

```typescript
// DELETE these lines:
export { buildRelatedSelectionsMap }
export type { UseLavoratoriDataOptions }
```

Keep `UseLavoratoriDataOptions` imported from `../types` internally; export the type from `types/` barrel if cross-module consumers need it (none today).

- [ ] **Step 2:** Slim `hooks/index.ts` to hooks only:

```typescript
export { useLavoratoriData } from "./use-lavoratori-data"
export { useSelectedWorkerEditor } from "./use-selected-worker-editor"
export { useGate1View } from "./use-gate1-view"
export { useLavoratoriCercaDetail } from "./use-lavoratori-cerca-detail"
```

- [ ] **Step 3:** Make `resolveGateViewProps` and `ResolvedGateViewProps` non-exported in `use-gate1-view.ts` (remove `export` keyword).

- [ ] **Step 4:** Fix cross-module import in `ricerca-workers-map-view.tsx`:

```typescript
import { buildRelatedSelectionsMap } from "@/modules/lavoratori/lib"
```

- [ ] **Step 5:** Run gate; commit

```bash
git commit -m "refactor(lavoratori): slim hooks barrel to use* exports only"
```

---

## PR 2 — crm + ricerca

### Task 3: CRM — remove passthrough re-exports

**Files:**
- Modify: `src/modules/crm/hooks/use-crm-pipeline-preview.ts`
- Modify: `src/modules/crm/hooks/index.ts`
- Modify: `src/modules/crm/hooks/use-crm-pipeline-preview.test.ts`
- Create: `src/modules/crm/lib/index.ts`
- Modify: `src/modules/ricerca/components/ricerca-detail-view.tsx`

- [ ] **Step 1:** Delete lines 42–51 from `use-crm-pipeline-preview.ts` (the `export { ... } from "../lib/..."` block).

- [ ] **Step 2:** Slim `crm/hooks/index.ts`:

```typescript
export { useCrmPipelinePreview } from "./use-crm-pipeline-preview"
export { useCrmAssegnazione } from "./use-crm-assegnazione"
```

- [ ] **Step 3:** Create `crm/lib/index.ts`:

```typescript
export {
  ADDRESS_FIELD_BINDINGS,
  FAMILY_FIELD_BINDINGS,
  PROCESS_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  preserveMissingFields,
} from "./field-bindings"
export { mapCardData } from "./card-mapper"
export { normalizeLookupPatchLabels } from "./lookup-utils"
export { serializeCrmPipelineFilters } from "./board-fetch"
```

- [ ] **Step 4:** Update `use-crm-pipeline-preview.test.ts` imports:

```typescript
import {
  ADDRESS_FIELD_BINDINGS,
  FAMILY_FIELD_BINDINGS,
  PROCESS_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
  preserveMissingFields,
} from "../lib/field-bindings"
import { mapCardData } from "../lib/card-mapper"
```

- [ ] **Step 5:** Update `ricerca-detail-view.tsx`:

```typescript
import { normalizeLookupPatchLabels } from "@/modules/crm/lib"
```

- [ ] **Step 6:** Run gate; commit

```bash
git commit -m "refactor(crm): remove hook passthrough re-exports, add lib barrel"
```

### Task 4: Ricerca — remove passthrough re-exports

**Files:**
- Modify: `src/modules/ricerca/hooks/use-ricerca-workers-pipeline.ts`
- Modify: `src/modules/ricerca/hooks/__tests__/use-ricerca-workers-pipeline.integration.test.tsx`
- Modify: `src/modules/ricerca/lib/index.ts` (add exports if missing)

- [ ] **Step 1:** Delete lines 19–27 from `use-ricerca-workers-pipeline.ts` (re-export block).

- [ ] **Step 2:** Update integration test imports:

```typescript
import { applyRicercaWorkersPipelineMoveOptimistic } from "../../lib/pipeline-mutations"
import { mergeGroupedPipelineColumns } from "../../lib/pipeline-column-utils"
import { useRicercaWorkersPipeline } from "../use-ricerca-workers-pipeline"
```

- [ ] **Step 3:** Ensure `ricerca/lib/index.ts` exports pipeline symbols used cross-module (already mostly there).

- [ ] **Step 4:** Run gate; commit

```bash
git commit -m "refactor(ricerca): remove hook passthrough re-exports"
```

---

## PR 3 — gestione-contrattuale

### Task 5: Extract assunzioni board pure code

**Files:**
- Create: `src/modules/gestione-contrattuale/lib/assunzioni-board.ts`
- Modify: `src/modules/gestione-contrattuale/hooks/use-assunzioni-board.ts`
- Modify: `src/modules/gestione-contrattuale/hooks/use-assunzioni-board.test.ts`
- Modify: `src/modules/gestione-contrattuale/lib/index.ts`

- [ ] **Step 1:** Cut exported constants + `preserveMissingFields` + `mapAssunzioniBoardCard` from `use-assunzioni-board.ts` into `lib/assunzioni-board.ts`. Move their imports with them; hook file imports back:

```typescript
import {
  ASSUNZIONE_FIELD_BINDINGS,
  LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
  mapAssunzioniBoardCard,
  preserveMissingFields,
  RAPPORTO_FIELD_BINDINGS,
  RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
} from "../lib/assunzioni-board"
```

- [ ] **Step 2:** Update test imports to `../lib/assunzioni-board`.

- [ ] **Step 3:** Re-export from `lib/index.ts`.

- [ ] **Step 4:** Run `npm run test -- src/modules/gestione-contrattuale/hooks/use-assunzioni-board.test.ts`

### Task 6: Extract chiusure + variazioni board pure code

Same pattern for:
- `lib/chiusure-board.ts` ← `use-chiusure-board.ts`
- `lib/variazioni-board.ts` ← `use-variazioni-board.ts`

Update `use-chiusure-board.test.ts`, `use-variazioni-board.test.ts`.

- [ ] **Step 1:** Extract chiusure symbols; update hook + test.
- [ ] **Step 2:** Extract variazioni symbols; update hook + test.
- [ ] **Step 3:** Slim `gestione-contrattuale/hooks/index.ts`:

```typescript
export { useAssunzioniBoard } from "./use-assunzioni-board"
export { useChiusureBoard } from "./use-chiusure-board"
export { useVariazioniBoard } from "./use-variazioni-board"
export { useAssunzioniDetailSheet } from "./use-assunzioni-detail-sheet"
```

- [ ] **Step 4:** Run full gate; commit

```bash
git commit -m "refactor(gestione-contrattuale): extract board mappers to lib"
```

---

## PR 4 — rapporti

### Task 7: Extract rapporti board pure code

**Files:**
- Create: `src/modules/rapporti/lib/rapporti-board.ts`
- Modify: `src/modules/rapporti/hooks/use-rapporti-lavorativi-data.ts`
- Modify: `src/modules/rapporti/hooks/use-rapporti-lavorativi-data.test.ts`
- Modify: `src/modules/rapporti/hooks/index.ts`
- Modify: `src/modules/rapporti/lib/index.ts`

- [ ] **Step 1:** Cut `RAPPORTO_FIELD_BINDINGS`, `preserveMissingFields`, `mapRapportoBoardRow` into `lib/rapporti-board.ts`.
- [ ] **Step 2:** Hook imports from `../lib/rapporti-board`; test imports from same.
- [ ] **Step 3:** Slim `hooks/index.ts` to `useRapportiLavorativiData` only.
- [ ] **Step 4:** Run gate; commit

```bash
git commit -m "refactor(rapporti): extract board mapper to lib"
```

---

## PR 5 — payroll

### Task 8: Extract payroll board + contributi quarter

**Files:**
- Create: `src/modules/payroll/lib/payroll-board.ts`
- Create: `src/modules/payroll/lib/contributi-quarter.ts`
- Modify: `src/modules/payroll/hooks/use-payroll-board.ts`
- Modify: `src/modules/payroll/hooks/use-contributi-inps-board.ts`
- Modify: `src/modules/payroll/hooks/use-payroll-board.test.ts`
- Modify: `src/modules/payroll/hooks/index.ts`
- Modify: `src/modules/payroll/lib/index.ts`
- Modify: `src/modules/payroll/components/payroll-overview-view.tsx`

- [ ] **Step 1:** Cut `TERMINAL_STAGE_IDS`, `PRESERVED_DETAIL_FIELDS`, `preserveDetailFields` → `lib/payroll-board.ts`.
- [ ] **Step 2:** Cut `getQuarterDateRange` → `lib/contributi-quarter.ts`.
- [ ] **Step 3:** Update tests to import from `../lib/payroll-board`.
- [ ] **Step 4:** Update `payroll-overview-view.tsx`:

```typescript
import { usePayrollBoard } from "../hooks/use-payroll-board"
import { TERMINAL_STAGE_IDS } from "@/modules/payroll/lib"
```

- [ ] **Step 5:** Slim `hooks/index.ts` to two hooks only.
- [ ] **Step 6:** Run gate; commit

```bash
git commit -m "refactor(payroll): extract board helpers to lib"
```

---

## PR 6 — support

### Task 9: Extract riattivazioni stage helpers

**Files:**
- Create: `src/modules/support/lib/riattivazioni-stage.ts`
- Modify: `src/modules/support/hooks/use-riattivazioni-board.ts`
- Modify: `src/modules/support/__tests__/use-riattivazioni-board.test.ts`
- Modify: `src/modules/support/hooks/index.ts`
- Modify: `src/modules/support/lib/index.ts`

- [ ] **Step 1:** Cut stage defs + `resolveStage` + `hasRiattivazioneStatus` + `shouldShowUnclassifiedChiusura` + `getChiusuraTipoLabel` → `lib/riattivazioni-stage.ts`.
- [ ] **Step 2:** Update test:

```typescript
import {
  resolveStage,
  hasRiattivazioneStatus,
  shouldShowUnclassifiedChiusura,
  getChiusuraTipoLabel,
} from "@/modules/support/lib"
```

- [ ] **Step 3:** Slim `hooks/index.ts` to three hooks only.
- [ ] **Step 4:** Run gate; commit

```bash
git commit -m "refactor(support): extract riattivazioni stage helpers to lib"
```

---

## PR 7 — regression guard + docs

### Task 10: Hook barrel export guard

**Files:**
- Create: `src/modules/__tests__/hooks-barrel-exports.test.ts`

- [ ] **Step 1:** Add test file:

```typescript
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const MODULES_ROOT = join(process.cwd(), "src/modules")

function listHookBarrels(): string[] {
  return readdirSync(MODULES_ROOT)
    .filter((name) => statSync(join(MODULES_ROOT, name)).isDirectory())
    .map((name) => join(MODULES_ROOT, name, "hooks", "index.ts"))
    .filter((path) => {
      try {
        readFileSync(path)
        return true
      } catch {
        return false
      }
    })
}

/** Named exports from `export { a, b } from "./..."` and `export { a, b }` */
function parseNamedExports(source: string): string[] {
  const names: string[] = []
  const exportBlocks = source.matchAll(
    /export\s*\{([^}]+)\}/g,
  )
  for (const match of exportBlocks) {
    const block = match[1] ?? ""
    for (const part of block.split(",")) {
      const trimmed = part.trim()
      if (!trimmed) continue
      const exportName = trimmed.split(/\s+as\s+/).pop()?.trim()
      if (exportName) names.push(exportName)
    }
  }
  const direct = source.matchAll(
    /export\s+(?:type\s+)?(?:async\s+)?function\s+(use[A-Z]\w*)/g,
  )
  for (const match of direct) {
    if (match[1]) names.push(match[1])
  }
  return names
}

describe("hooks/index.ts barrels export only hooks", () => {
  for (const barrelPath of listHookBarrels()) {
    const moduleName = barrelPath.split("/modules/")[1]?.split("/")[0] ?? barrelPath
    it(`${moduleName}/hooks/index.ts exports only use* symbols`, () => {
      const source = readFileSync(barrelPath, "utf8")
      const exports = parseNamedExports(source)
      const violations = exports.filter((name) => !name.startsWith("use"))
      expect(violations, `Non-hook exports: ${violations.join(", ")}`).toEqual([])
    })
  }
})
```

- [ ] **Step 2:** Run `npm run test -- src/modules/__tests__/hooks-barrel-exports.test.ts` — must PASS after PRs 1–6.

### Task 11: Update characterization doc

**Files:**
- Modify: `docs/solutions/best-practices/characterization-testing-board-hook-contract-patterns.md`

- [ ] **Step 1:** In section **Guidance §1**, replace "Export the cleanly-extractable pure helpers" hook-file wording with: extract to `lib/<prefix>-*.ts` (flat, no subfolders); tests import from `lib/`.

- [ ] **Step 2:** Run full gate; commit

```bash
git commit -m "chore: add hooks barrel export guard and update testing doc"
```

---

## Self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| Flat prefixed lib files | Tasks 1, 5–9 |
| Hooks export only use* | Tasks 2, 3, 5–9 |
| Cross-module import fixes | Tasks 1–2, 3, 8, 9 |
| lib/index.ts updates | All module tasks |
| Regression guard | Task 10 |
| Docs update | Task 11 |
| No preserveMissingFields unification | Explicit in Task 5–6 |
| No legacy subfolder flattening | Out of scope — not in plan |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-hooks-export-cleanup.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per PR/task, review between tasks, fast iteration
2. **Inline Execution** — implement PR-by-PR in this session with checkpoints

Which approach do you want?
