# Module Hooks Deduplication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ~800–1,200 lines of duplicated logic from `src/modules/*/hooks/` by centralizing value coercion, stage metadata, board column algebra, query-cache helpers, and worker editor draft lifecycle in `src/lib/` and `src/hooks/`.

**Architecture:** Four PRs. PR1 adds shared pure libs + unit tests. PR2 migrates board hooks to shared libs + `useBoardQueryCache`. PR3 adds `useWorkerSectionDraft` and migrates six lavoratori section editors. PR4 cleans up `use-anagrafiche-data` lookup maps and adds CRM value-utils shim. Behavior unchanged; existing characterization tests must stay green.

**Tech Stack:** TypeScript, React 19, TanStack Query, Vitest + happy-dom + Testing Library, Vite SPA per `AGENTS.md`.

**Spec:** `docs/superpowers/specs/2026-07-09-module-hooks-dedup-design.md`

**Gate after every PR:** `npm run test && npm run lint && npx tsc -b`

**Branch:** Continue on `refactor/big-files` (or a child branch `refactor/module-hooks-dedup` if you prefer isolation).

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/value-utils.ts` | Canonical `toStringValue`, tokens, dates, arrays |
| Extend | `src/lib/value-utils.test.ts` | Unit tests for new exports |
| Create | `src/lib/lookup-stage-metadata.ts` | `buildStageMetadataFromDefaults`, `buildStageMetadataFromLookupRows` |
| Create | `src/lib/lookup-stage-metadata.test.ts` | Stage metadata unit tests |
| Create | `src/lib/board-column-utils.ts` | `updateCardInColumns`, `updateCardAndRehome`, `applyOptimisticCardMove` |
| Create | `src/lib/board-column-utils.test.ts` | Column algebra unit tests |
| Create | `src/hooks/use-board-query-cache.ts` | `setBoardData` + `invalidateBoard` wrapper |
| Create | `src/hooks/use-board-query-cache.integration.test.tsx` | QueryClient integration tests |
| Create | `src/hooks/use-worker-section-draft.ts` | Editor draft lifecycle |
| Create | `src/hooks/use-worker-section-draft.integration.test.tsx` | Draft lifecycle integration tests |
| Modify | `src/modules/crm/lib/value-utils.ts` | Re-export shim from `@/lib/value-utils` |
| Modify | 8 board hooks + 6 realtime hooks | Adopt shared libs/hooks (see PR2) |
| Modify | 6 `use-worker-*-editor.ts` | Adopt `useWorkerSectionDraft` (PR3) |
| Modify | `src/modules/anagrafiche/hooks/use-anagrafiche-data.ts` | Use lavoratori lookup utils (PR4) |

---

## PR 1 — Shared lib layer

### Task 1: Expand `src/lib/value-utils.ts`

**Files:**
- Modify: `src/lib/value-utils.ts`
- Modify: `src/lib/value-utils.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/value-utils.test.ts`:

```typescript
import {
  formatItalianDate,
  getFirstArrayValue,
  getStringArrayValue,
  normalizeComparableToken,
  normalizeLookupToken,
  readLookupColor,
  toBooleanValue,
  toStringValue,
} from "@/lib/value-utils"

describe("toStringValue", () => {
  it("trims strings and rejects empty", () => {
    expect(toStringValue("  hello  ")).toBe("hello")
    expect(toStringValue("   ")).toBeNull()
    expect(toStringValue(null)).toBeNull()
  })

  it("coerces number and boolean", () => {
    expect(toStringValue(42)).toBe("42")
    expect(toStringValue(true)).toBe("true")
  })
})

describe("normalizeLookupToken", () => {
  it("lowercases and trims", () => {
    expect(normalizeLookupToken("  Foo  ")).toBe("foo")
  })
})

describe("normalizeComparableToken", () => {
  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeComparableToken("Cedolino-Pronto!")).toBe("cedolino pronto")
  })
})

describe("readLookupColor", () => {
  it("reads metadata.color when present", () => {
    expect(readLookupColor({ color: " sky " })).toBe("sky")
    expect(readLookupColor({})).toBeNull()
  })
})

describe("formatItalianDate", () => {
  it("formats valid ISO dates", () => {
    expect(formatItalianDate("2026-01-15T12:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(formatItalianDate(null)).toBe("-")
  })
})

describe("getFirstArrayValue", () => {
  it("returns first non-empty array element", () => {
    expect(getFirstArrayValue(["", "b", "c"])).toBe("b")
    expect(getFirstArrayValue("solo")).toBe("solo")
  })
})

describe("getStringArrayValue", () => {
  it("maps array or wraps single value", () => {
    expect(getStringArrayValue(["a", "b"])).toEqual(["a", "b"])
    expect(getStringArrayValue("x")).toEqual(["x"])
  })
})

describe("toBooleanValue", () => {
  it("parses Italian yes/no tokens", () => {
    expect(toBooleanValue("sì")).toBe(true)
    expect(toBooleanValue("no")).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/lib/value-utils.test.ts
```

Expected: import errors for missing exports.

- [ ] **Step 3: Implement — merge CRM value helpers into `src/lib/value-utils.ts`**

Replace file contents (keep existing `isUuidValue` / `getSortableTimestamp` at top):

```typescript
import type { LookupValueRecord } from "@/types"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidValue(value: string) {
  return UUID_RE.test(value)
}

export function getSortableTimestamp(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

export function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

export function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

export function normalizeComparableToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

export function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

export function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
    return null
  }
  return toStringValue(value)
}

export function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }
  const single = toStringValue(value)
  return single ? [single] : []
}

export function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true
    if (["false", "0", "no"].includes(normalized)) return false
  }
  return null
}

export function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

export function formatItalianDateTime(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- src/lib/value-utils.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/value-utils.ts src/lib/value-utils.test.ts
git commit -m "refactor(lib): centralize value coercion helpers in value-utils"
```

---

### Task 2: Add `lookup-stage-metadata.ts`

**Files:**
- Create: `src/lib/lookup-stage-metadata.ts`
- Create: `src/lib/lookup-stage-metadata.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/lookup-stage-metadata.test.ts`:

```typescript
import { describe, expect, it } from "vitest"

import {
  buildStageMetadataFromDefaults,
  buildStageMetadataFromLookupRows,
} from "@/lib/lookup-stage-metadata"
import type { LookupValueRecord } from "@/types"

const DEFAULT_STAGES = [
  { id: "todo", label: "TODO", color: "sky" },
  { id: "done", label: "DONE", color: "green" },
]

function lookupRow(partial: Partial<LookupValueRecord>): LookupValueRecord {
  return {
    id: "1",
    entity_table: "mesi_lavorati",
    entity_field: "stato_mese_lavorativo",
    value_key: "todo",
    value_label: "Da fare",
    sort_order: 1,
    is_active: true,
    metadata: { color: "blue" },
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

describe("buildStageMetadataFromDefaults", () => {
  it("merges lookup label/color onto default stages", () => {
    const result = buildStageMetadataFromDefaults({
      defaultStages: DEFAULT_STAGES,
      lookupRows: [lookupRow({ value_label: "Da fare aggiornato", metadata: { color: "cyan" } })],
      entityTable: "mesi_lavorati",
      entityField: "stato_mese_lavorativo",
    })

    expect(result.definitions[0]?.label).toBe("Da fare aggiornato")
    expect(result.definitions[0]?.color).toBe("cyan")
    expect(result.aliases.get("da fare aggiornato")).toBe("todo")
  })

  it("applies legacyAliases", () => {
    const result = buildStageMetadataFromDefaults({
      defaultStages: DEFAULT_STAGES,
      lookupRows: [],
      entityTable: "mesi_lavorati",
      entityField: "stato_mese_lavorativo",
      legacyAliases: { done_legacy: "done" },
    })
    expect(result.aliases.get("done legacy")).toBe("done")
  })
})

describe("buildStageMetadataFromLookupRows", () => {
  it("builds definitions only from active lookup rows", () => {
    const result = buildStageMetadataFromLookupRows({
      lookupRows: [
        lookupRow({
          entity_table: "processi_matching",
          entity_field: "stato_res",
          value_key: "aperto",
          value_label: "Aperto",
        }),
      ],
      entityTable: "processi_matching",
      entityField: "stato_res",
    })
    expect(result.definitions).toHaveLength(1)
    expect(result.definitions[0]?.id).toBe("aperto")
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/lib/lookup-stage-metadata.test.ts
```

- [ ] **Step 3: Implement `src/lib/lookup-stage-metadata.ts`**

```typescript
import type { LookupValueRecord } from "@/types"

import {
  normalizeComparableToken,
  normalizeLookupToken,
  readLookupColor,
  toStringValue,
} from "@/lib/value-utils"

export type StageDefinition = { id: string; label: string; color: string }
export type StageMetadata = { definitions: StageDefinition[]; aliases: Map<string, string> }

type BuildFromDefaultsOptions = {
  defaultStages: StageDefinition[]
  lookupRows: LookupValueRecord[]
  entityTable: string
  entityField: string
  legacyAliases?: Record<string, string>
}

export function buildStageMetadataFromDefaults({
  defaultStages,
  lookupRows,
  entityTable,
  entityField,
  legacyAliases = {},
}: BuildFromDefaultsOptions): StageMetadata {
  const aliases = new Map<string, string>()
  const colorByStage = new Map<string, string>()
  const labelByStage = new Map<string, string>()

  for (const stage of defaultStages) {
    aliases.set(normalizeComparableToken(stage.id), stage.id)
    aliases.set(normalizeComparableToken(stage.label), stage.id)
    colorByStage.set(stage.id, stage.color)
    labelByStage.set(stage.id, stage.label)
  }

  for (const [legacyAlias, stageId] of Object.entries(legacyAliases)) {
    aliases.set(normalizeComparableToken(legacyAlias), stageId)
  }

  const filtered = lookupRows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === entityTable &&
      row.entity_field === entityField,
  )

  for (const row of filtered) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const resolvedId =
      aliases.get(normalizeComparableToken(valueKey)) ??
      aliases.get(normalizeComparableToken(valueLabel)) ??
      null

    if (!resolvedId) continue

    if (valueKey) aliases.set(normalizeComparableToken(valueKey), resolvedId)
    if (valueLabel) aliases.set(normalizeComparableToken(valueLabel), resolvedId)

    const color = readLookupColor(row.metadata)
    if (color) colorByStage.set(resolvedId, color)
    if (valueLabel) labelByStage.set(resolvedId, valueLabel)
  }

  return {
    definitions: defaultStages.map((stage) => ({
      id: stage.id,
      label: labelByStage.get(stage.id) ?? stage.label,
      color: colorByStage.get(stage.id) ?? stage.color,
    })),
    aliases,
  }
}

type BuildFromLookupOptions = {
  lookupRows: LookupValueRecord[]
  entityTable: string
  entityField: string
}

export function buildStageMetadataFromLookupRows({
  lookupRows,
  entityTable,
  entityField,
}: BuildFromLookupOptions): StageMetadata {
  const stageRows = lookupRows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === entityTable &&
        row.entity_field === entityField &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label)),
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const definitions: StageDefinition[] = []
  const aliases = new Map<string, string>()

  for (const row of stageRows) {
    const id = toStringValue(row.value_key)
    const label = toStringValue(row.value_label)
    if (!id || !label) continue

    definitions.push({
      id,
      label,
      color: readLookupColor(row.metadata) ?? "zinc",
    })
    aliases.set(normalizeLookupToken(id), id)
    aliases.set(normalizeLookupToken(label), id)
  }

  return { definitions, aliases }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- src/lib/lookup-stage-metadata.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/lookup-stage-metadata.ts src/lib/lookup-stage-metadata.test.ts
git commit -m "refactor(lib): add shared lookup stage metadata builders"
```

---

### Task 3: Add `board-column-utils.ts`

**Files:**
- Create: `src/lib/board-column-utils.ts`
- Create: `src/lib/board-column-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/board-column-utils.test.ts`:

```typescript
import { describe, expect, it } from "vitest"

import {
  applyOptimisticCardMove,
  updateCardAndRehome,
  updateCardInColumns,
} from "@/lib/board-column-utils"

type Card = { id: string; stage: string; title: string }

const columns = [
  { id: "a", cards: [{ id: "1", stage: "a", title: "one" }] },
  { id: "b", cards: [] as Card[] },
]

describe("updateCardInColumns", () => {
  it("updates card in place", () => {
    const next = updateCardInColumns(columns, "1", (card) => ({ ...card, title: "updated" }))
    expect(next[0]?.cards[0]?.title).toBe("updated")
  })
})

describe("updateCardAndRehome", () => {
  it("moves card to column matching new stage", () => {
    const next = updateCardAndRehome(columns, "1", (card) => ({ ...card, stage: "b", title: "moved" }))
    expect(next[0]?.cards).toHaveLength(0)
    expect(next[1]?.cards[0]?.stage).toBe("b")
  })
})

describe("applyOptimisticCardMove", () => {
  it("removes from source and prepends to target", () => {
    const next = applyOptimisticCardMove(columns, "1", "b")
    expect(next?.[0]?.cards).toHaveLength(0)
    expect(next?.[1]?.cards[0]?.stage).toBe("b")
  })

  it("returns undefined when card not found", () => {
    expect(applyOptimisticCardMove(columns, "missing", "b")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- src/lib/board-column-utils.test.ts
```

- [ ] **Step 3: Implement `src/lib/board-column-utils.ts`**

```typescript
export type BoardColumn<TCard> = { id: string; cards: TCard[] }

export function updateCardInColumns<TCard extends { id: string }>(
  columns: BoardColumn<TCard>[],
  recordId: string,
  updater: (card: TCard) => TCard,
): BoardColumn<TCard>[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => (card.id === recordId ? updater(card) : card)),
  }))
}

export function updateCardAndRehome<TCard extends { id: string; stage: string }>(
  columns: BoardColumn<TCard>[],
  recordId: string,
  updater: (card: TCard) => TCard,
): BoardColumn<TCard>[] {
  let nextCard: TCard | null = null

  const without = columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
      if (card.id !== recordId) return true
      nextCard = updater(card)
      return false
    }),
  }))

  if (!nextCard) return columns

  return without.map((column) =>
    column.id === nextCard?.stage ? { ...column, cards: [nextCard, ...column.cards] } : column,
  )
}

export function applyOptimisticCardMove<TCard extends { id: string; stage: string }>(
  columns: BoardColumn<TCard>[],
  recordId: string,
  targetStageId: string,
  patchCard?: (card: TCard, targetStageId: string) => TCard,
): BoardColumn<TCard>[] | undefined {
  let movedCard: TCard | null = null

  const removed = columns.map((column) => {
    if (!column.cards.some((card) => card.id === recordId)) return column
    const remainingCards = column.cards.filter((card) => {
      if (card.id !== recordId) return true
      movedCard = patchCard
        ? patchCard(card, targetStageId)
        : ({ ...card, stage: targetStageId } as TCard)
      return false
    })
    return { ...column, cards: remainingCards }
  })

  if (!movedCard) return undefined

  return removed.map((column) =>
    column.id === targetStageId
      ? { ...column, cards: [movedCard as TCard, ...column.cards] }
      : column,
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- src/lib/board-column-utils.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/board-column-utils.ts src/lib/board-column-utils.test.ts
git commit -m "refactor(lib): add shared board column cache helpers"
```

---

### Task 4: PR1 gate

- [ ] **Step 1: Full gate**

```bash
npm run test && npm run lint && npx tsc -b
```

Expected: all green.

---

## PR 2 — Board hooks + `useBoardQueryCache`

### Task 5: Add `useBoardQueryCache`

**Files:**
- Create: `src/hooks/use-board-query-cache.ts`
- Create: `src/hooks/use-board-query-cache.integration.test.tsx`

- [ ] **Step 1: Write failing integration test**

Create `src/hooks/use-board-query-cache.integration.test.tsx`:

```tsx
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { renderHookWithQueryClient } from "@/test/test-utils"

type BoardData = { columns: { id: string; cards: { id: string }[] }[] }

describe("useBoardQueryCache", () => {
  it("setBoardData applies updater to cached data", () => {
    const queryKey = ["test-board"] as const
    const queryClient = new QueryClient()
    queryClient.setQueryData<BoardData>(queryKey, {
      columns: [{ id: "a", cards: [{ id: "1" }] }],
    })

    const { result } = renderHookWithQueryClient(
      () => useBoardQueryCache<BoardData>(queryKey),
      { queryClient },
    )

    result.current.setBoardData((prev) =>
      prev
        ? { columns: prev.columns.map((c) => ({ ...c, cards: [...c.cards, { id: "2" }] })) }
        : prev,
    )

    expect(queryClient.getQueryData<BoardData>(queryKey)?.columns[0]?.cards).toHaveLength(2)
  })

  it("invalidateBoard marks query stale", async () => {
    const queryKey = ["test-board-invalidate"] as const
    const queryClient = new QueryClient()
    const { result } = renderHookWithQueryClient(
      () => useBoardQueryCache(queryKey),
      { queryClient },
    )

    result.current.invalidateBoard()
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- src/hooks/use-board-query-cache.integration.test.tsx
```

- [ ] **Step 3: Implement hook**

Create `src/hooks/use-board-query-cache.ts`:

```typescript
import * as React from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

export function useBoardQueryCache<TData>(queryKey: QueryKey) {
  const queryClient = useQueryClient()

  const setBoardData = React.useCallback(
    (updater: (previous: TData | undefined) => TData | undefined) => {
      queryClient.setQueryData<TData>(queryKey, (previous) => updater(previous))
    },
    [queryClient, queryKey],
  )

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return { setBoardData, invalidateBoard }
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-board-query-cache.ts src/hooks/use-board-query-cache.integration.test.tsx
git commit -m "refactor(hooks): add useBoardQueryCache for board query cache ops"
```

---

### Task 6: Migrate gestione-contrattuale board hooks

**Files:**
- Modify: `src/modules/gestione-contrattuale/hooks/use-assunzioni-board.ts`
- Modify: `src/modules/gestione-contrattuale/hooks/use-variazioni-board.ts`
- Modify: `src/modules/gestione-contrattuale/hooks/use-chiusure-board.ts`

For **each** file, apply this pattern:

1. **Delete** local `normalizeToken`, `toStringValue`, `readLookupColor`, `buildStageMetadata`.
2. **Add imports:**

```typescript
import {
  normalizeComparableToken,
  toStringValue,
} from "@/lib/value-utils"
import { buildStageMetadataFromDefaults } from "@/lib/lookup-stage-metadata"
import {
  applyOptimisticCardMove,
  updateCardAndRehome,
  updateCardInColumns,
} from "@/lib/board-column-utils"
import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
```

3. **Replace** `buildStageMetadata(lookupResult.rows)` with:

```typescript
// assunzioni example:
const stageMetadata = buildStageMetadataFromDefaults({
  defaultStages: DEFAULT_STAGE_DEFINITIONS,
  lookupRows: lookupResult.rows,
  entityTable: "processi_matching",
  entityField: "stato_assunzione",
})
```

```typescript
// variazioni: entityTable "variazioni_contrattuali", entityField "stato"
// chiusure: entityTable "chiusure_contratti", entityField "stato"
```

4. **Replace** `normalizeToken(...)` calls with `normalizeComparableToken(...)`.

5. **Replace** manual `setBoardData` / `invalidateBoard` with:

```typescript
const { setBoardData, invalidateBoard } = useBoardQueryCache<BoardDataType>(QUERY_KEY)
```

6. **Replace `updateCard` bodies:**
   - `use-assunzioni-board`: `setBoardData((prev) => prev ? updateCardAndRehome(prev, rapportoId, updater) : prev)` — note assunzioni cache is `ColumnData[]` not `{ columns }`; wrap if needed: `prev.map(...)` uses rehome on array of columns directly.
   - `use-variazioni-board` / `use-chiusure-board`: `setBoardData((prev) => prev ? { ...prev, columns: updateCardInColumns(prev.columns, recordId, updater) } : prev)`

7. **Replace `applyOptimistic` in `moveMutation`:**

```typescript
applyOptimistic: (previous, { recordId, targetStageId }) => {
  if (!previous) return previous
  const next = applyOptimisticCardMove(previous.columns, recordId, targetStageId)
  return next ? { ...previous, columns: next } : previous
},
```

(Adjust when cache shape is `ColumnData[]` without wrapper — apply `applyOptimisticCardMove` directly on `previous`.)

- [ ] **Step 1:** Migrate `use-assunzioni-board.ts`
- [ ] **Step 2:** Migrate `use-variazioni-board.ts`
- [ ] **Step 3:** Migrate `use-chiusure-board.ts`
- [ ] **Step 4:** Run characterization tests

```bash
npm run test -- \
  src/modules/gestione-contrattuale/hooks/use-assunzioni-board.test.ts \
  src/modules/gestione-contrattuale/hooks/use-variazioni-board.test.ts \
  src/modules/gestione-contrattuale/hooks/use-chiusure-board.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/gestione-contrattuale/hooks/
git commit -m "refactor(gestione-contrattuale): adopt shared board lib and query cache"
```

---

### Task 7: Migrate support + ricerca + payroll board hooks

**Files:**
- Modify: `src/modules/support/hooks/use-riattivazioni-board.ts`
- Modify: `src/modules/support/hooks/use-support-tickets-board.ts` (value-utils + query cache only; keep local `buildStageMetadata`)
- Modify: `src/modules/ricerca/hooks/use-ricerca-board.ts`
- Modify: `src/modules/payroll/hooks/use-payroll-board.ts`
- Modify: `src/modules/payroll/hooks/use-contributi-inps-board.ts`

**`use-riattivazioni-board`:** delete local `toStringValue`; use `updateCardInColumns`, `applyOptimisticCardMove`, `useBoardQueryCache`.

**`use-ricerca-board`:** replace local `buildStageMetadata` with `buildStageMetadataFromLookupRows({ entityTable: "processi_matching", entityField: "stato_res", ... })`; import `formatItalianDate`, `getFirstArrayValue`, `getStringArrayValue`, `normalizeLookupToken`, `readLookupColor`, `toStringValue` from `@/lib/value-utils`; delete local copies.

**`use-payroll-board`:** `buildStageMetadataFromDefaults` with `LEGACY_STAGE_ALIASES`; delete local helpers.

**`use-contributi-inps-board`:** same defaults pattern with `contributi_inps` / `stato`.

**`use-support-tickets-board`:** import `normalizeComparableToken`, `toStringValue`, `readLookupColor` from `@/lib/value-utils`; adopt `useBoardQueryCache`; **do not** replace local `buildStageMetadata`.

- [ ] **Step 1:** Migrate all five files
- [ ] **Step 2:** Run tests

```bash
npm run test -- \
  src/modules/payroll/hooks/use-payroll-board.test.ts \
  src/modules/payroll/hooks/use-contributi-inps-board.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/support/hooks/ src/modules/ricerca/hooks/use-ricerca-board.ts src/modules/payroll/hooks/
git commit -m "refactor(boards): adopt shared libs in support, ricerca, payroll hooks"
```

---

### Task 8: Adopt `useBoardQueryCache` in remaining realtime hooks

**Files:**
- Modify: `src/modules/crm/hooks/use-crm-assegnazione.ts`
- Modify: `src/modules/crm/hooks/use-crm-pipeline-preview.ts`
- Modify: `src/modules/support/hooks/use-prove-colloqui-data.ts`
- Modify: `src/modules/rapporti/hooks/use-rapporti-lavorativi-data.ts`
- Modify: `src/modules/ricerca/hooks/use-ricerca-workers-pipeline.ts`
- Modify: `src/modules/lavoratori/hooks/use-lavoratori-list.ts`

In each file: delete local `setBoardData`/`invalidateBoard` `useCallback` pair; destructure from `useBoardQueryCache` with the hook's existing `QUERY_KEY` and data type.

Also replace any remaining local `toStringValue` / `formatItalianDate` with `@/lib/value-utils` imports (especially `use-crm-assegnazione`, `use-prove-colloqui-data`).

- [ ] **Step 1:** Migrate all six files
- [ ] **Step 2: PR2 gate**

```bash
npm run test && npm run lint && npx tsc -b
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/crm/hooks/ src/modules/support/hooks/use-prove-colloqui-data.ts \
  src/modules/rapporti/hooks/ src/modules/ricerca/hooks/use-ricerca-workers-pipeline.ts \
  src/modules/lavoratori/hooks/use-lavoratori-list.ts
git commit -m "refactor(hooks): adopt useBoardQueryCache across realtime board hooks"
```

---

## PR 3 — Worker section draft hook

### Task 9: Add `useWorkerSectionDraft`

**Files:**
- Create: `src/hooks/use-worker-section-draft.ts`
- Create: `src/hooks/use-worker-section-draft.integration.test.tsx`

- [ ] **Step 1: Write failing integration test**

```tsx
import { act } from "react"
import { describe, expect, it } from "vitest"

import { useWorkerSectionDraft } from "@/hooks/use-worker-section-draft"
import { renderHookWithQueryClient } from "@/test/test-utils"
import type { LavoratoreRecord } from "@/modules/lavoratori/types/lavoratore"

function useTestDraft(activeCount = 0) {
  const activePatchesRef = { current: activeCount }
  const [isEditing, setIsEditing] = React.useState(false)
  const row = { id: "w1", nome: "Mario" } as LavoratoreRecord

  const { draft, setDraft } = useWorkerSectionDraft({
    selectedWorkerId: "w1",
    selectedWorkerRow: row,
    activePatchesRef,
    isEditing,
    setIsEditing,
    buildDraft: (r) => ({ name: r?.nome ?? "" }),
  })

  return { draft, setDraft, isEditing, setIsEditing, activePatchesRef, row }
}

describe("useWorkerSectionDraft", () => {
  it("resyncs draft when not editing and no active patches", () => {
    const { result, rerender } = renderHookWithQueryClient(
      ({ row }: { row: LavoratoreRecord }) => {
        const activePatchesRef = { current: 0 }
        const [isEditing, setIsEditing] = React.useState(false)
        return useWorkerSectionDraft({
          selectedWorkerId: row.id,
          selectedWorkerRow: row,
          activePatchesRef,
          isEditing,
          setIsEditing,
          buildDraft: (r) => ({ name: r?.nome ?? "" }),
        })
      },
      { initialProps: { row: { id: "w1", nome: "Mario" } as LavoratoreRecord } },
    )

    expect(result.current.draft.name).toBe("Mario")

    rerender({ row: { id: "w1", nome: "Luigi" } as LavoratoreRecord })
    expect(result.current.draft.name).toBe("Luigi")
  })

  it("does not resync while activePatchesRef > 0", () => {
    // ... assert draft unchanged when activePatchesRef.current = 1
  })
})
```

(Add `import * as React from "react"` at top of test file.)

- [ ] **Step 2: Implement hook**

Create `src/hooks/use-worker-section-draft.ts`:

```typescript
import * as React from "react"

import type { LavoratoreRecord } from "@/modules/lavoratori/types/lavoratore"

type UseWorkerSectionDraftOptions<TDraft> = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  buildDraft: (row: LavoratoreRecord | null) => TDraft
  /** Extra values that should trigger draft resync (e.g. availabilityPayload). */
  resyncDeps?: readonly unknown[]
}

export function useWorkerSectionDraft<TDraft>({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  isEditing,
  setIsEditing,
  buildDraft,
  resyncDeps = [],
}: UseWorkerSectionDraftOptions<TDraft>) {
  const [draft, setDraft] = React.useState<TDraft>(() => buildDraft(selectedWorkerRow))

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditing) setDraft(buildDraft(selectedWorkerRow))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildDraft is stable per hook callsite
  }, [activePatchesRef, isEditing, selectedWorkerRow, ...resyncDeps])

  React.useEffect(() => {
    setIsEditing(false)
  }, [selectedWorkerId, setIsEditing])

  return { draft, setDraft }
}
```

- [ ] **Step 3: Run tests — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-worker-section-draft.ts src/hooks/use-worker-section-draft.integration.test.tsx
git commit -m "refactor(hooks): add useWorkerSectionDraft for editor draft lifecycle"
```

---

### Task 10: Migrate six worker section editors

**Files:**
- Modify: `src/modules/lavoratori/hooks/use-worker-skills-editor.ts`
- Modify: `src/modules/lavoratori/hooks/use-worker-job-search-editor.ts`
- Modify: `src/modules/lavoratori/hooks/use-worker-documents-editor.ts`
- Modify: `src/modules/lavoratori/hooks/use-worker-experience-editor.ts`
- Modify: `src/modules/lavoratori/hooks/use-worker-availability-editor.ts`
- Modify: `src/modules/lavoratori/hooks/use-worker-address-editor.ts`

**Pattern (example `use-worker-skills-editor.ts`):**

Before:
```typescript
const [skillsDraft, setSkillsDraft] = React.useState(() => buildSkillsDraft(selectedWorkerRow))
React.useEffect(() => { ... }, [activePatchesRef, isEditingSkills, selectedWorkerRow])
React.useEffect(() => { setIsEditingSkills(false) }, [selectedWorkerId])
```

After:
```typescript
const [isEditingSkills, setIsEditingSkills] = React.useState(false)
const { draft: skillsDraft, setDraft: setSkillsDraft } = useWorkerSectionDraft({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  isEditing: isEditingSkills,
  setIsEditing: setIsEditingSkills,
  buildDraft: buildSkillsDraft,
})
```

**`use-worker-availability-editor`:** pass `resyncDeps: [availabilityPayload]` and use a `buildDraft` closure:

```typescript
buildDraft: (row) => buildAvailabilityDraft(row, availabilityPayload),
resyncDeps: [availabilityPayload],
```

Also add second draft for `availabilityStatusDraft` — either a second `useWorkerSectionDraft` call or keep status draft local (only one of the two needs `resyncDeps` for payload). Recommended: **two** `useWorkerSectionDraft` instances (`isEditingAvailability` and `isEditingAvailabilityStatus`).

**`use-worker-address-editor`:** `buildDraft: (row) => buildAddressDraft(row, selectedWorkerAddress)`, `resyncDeps: [selectedWorkerAddress]`.

- [ ] **Step 1:** Migrate all six editors
- [ ] **Step 2:** Run integration test

```bash
npm run test -- src/modules/lavoratori/hooks/use-selected-worker-editor.integration.test.tsx
```

- [ ] **Step 3: PR3 gate + commit**

```bash
npm run test && npm run lint && npx tsc -b
git add src/modules/lavoratori/hooks/use-worker-*.ts
git commit -m "refactor(lavoratori): adopt useWorkerSectionDraft in section editors"
```

---

## PR 4 — Data hooks + CRM shim

### Task 11: Anagrafiche lookup cleanup + CRM shim

**Files:**
- Modify: `src/modules/anagrafiche/hooks/use-anagrafiche-data.ts`
- Modify: `src/modules/crm/lib/value-utils.ts`
- Create (if needed): `src/modules/anagrafiche/lib/lookup-adapters.ts`

- [ ] **Step 1: Add adapter if shapes differ**

Create `src/modules/anagrafiche/lib/lookup-adapters.ts`:

```typescript
import {
  normalizeLookupColors,
  normalizeLookupOptions,
} from "@/modules/lavoratori/lib/lookup-utils"
import type { LookupValueRecord } from "@/types"
import type { LookupColorMap, LookupOptionsMap } from "../types"

export function buildLookupColorMapFromRows(rows: LookupValueRecord[]): LookupColorMap {
  const flat = normalizeLookupColors(rows)
  const result: LookupColorMap = {}
  for (const [key, color] of flat.entries()) {
    const [domain, token] = key.split(":")
    if (!domain || !token) continue
    if (!result[domain]) result[domain] = {}
    result[domain][token] = color
  }
  return result
}

export function buildLookupOptionsMapFromRows(rows: LookupValueRecord[]): LookupOptionsMap {
  const grouped = normalizeLookupOptions(rows)
  const result: LookupOptionsMap = {}
  for (const [domain, options] of grouped.entries()) {
    result[domain] = options
  }
  return result
}
```

- [ ] **Step 2: Replace local functions in `use-anagrafiche-data.ts`**

Delete `normalizeLookupToken`, `readLookupColor`, `buildLookupColorMap`, `buildLookupOptionsMap`. Import adapters instead:

```typescript
import {
  buildLookupColorMapFromRows,
  buildLookupOptionsMapFromRows,
} from "../lib/lookup-adapters"
```

- [ ] **Step 3: CRM value-utils shim**

Replace body of `src/modules/crm/lib/value-utils.ts` with re-exports + CRM-only helpers:

```typescript
import type { GenericRow } from "../types"
import { PREVENTIVO_ACCEPTANCE_BASE_URL } from "./constants"

export {
  toStringValue,
  getFirstArrayValue,
  getStringArrayValue,
  toBooleanValue,
  formatItalianDate,
  formatItalianDateTime,
  normalizeLookupToken,
} from "@/lib/value-utils"

// Keep CRM-only helpers below (asRowArray, buildPreventivoAcceptanceUrl, etc.)
```

- [ ] **Step 4: Grep for remaining local duplicates in hooks**

```bash
rg "function toStringValue|function normalizeToken|function readLookupColor|function buildStageMetadata" src/modules --glob "**/hooks/**"
```

Expected: only `use-support-tickets-board.ts` retains `buildStageMetadata` (and its private helpers).

- [ ] **Step 5: Final gate**

```bash
npm run test && npm run lint && npx tsc -b
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/anagrafiche/ src/modules/crm/lib/value-utils.ts
git commit -m "refactor(anagrafiche,crm): dedupe lookup maps and value-utils shim"
```

---

## Verification checklist (all PRs done)

- [ ] `rg "function toStringValue" src/modules --glob "**/hooks/**"` → no matches (except none expected)
- [ ] `rg "function buildStageMetadata" src/modules --glob "**/hooks/**"` → only `use-support-tickets-board.ts`
- [ ] Six board hooks import `buildStageMetadataFromDefaults`
- [ ] `use-ricerca-board` imports `buildStageMetadataFromLookupRows`
- [ ] Six worker editors import `useWorkerSectionDraft`
- [ ] All characterization tests green
- [ ] No behavior change in board move/update flows (manual smoke on one board optional)

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Expand value-utils | Task 1 |
| lookup-stage-metadata | Task 2 |
| board-column-utils | Task 3 |
| useBoardQueryCache | Task 5, 6–8 |
| Board hook migrations | Tasks 6–7 |
| useWorkerSectionDraft | Task 9 |
| Worker editor migrations | Task 10 |
| anagrafiche lookup cleanup | Task 11 |
| CRM shim | Task 11 |
| support-tickets stays local | Task 7 note |
| Tests per layer | Tasks 1–3, 5, 9 |
| Four PR sequence | PR1 Tasks 1–4, PR2 Tasks 5–8, PR3 Tasks 9–10, PR4 Task 11 |

No placeholders. Type names consistent across tasks.
