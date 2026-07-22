---
title: "Gate1 view split — characterization and smart-hook reference cycle"
date: 2026-07-08
category: best-practices
module: "gate1-view (lavoratori)"
problem_type: best_practice
component: testing_framework
severity: medium
applies_when:
  - "Splitting a giant view/hook pair under Target B (characterize → split → green)"
  - "Choosing the primary test seam for a smart/dumb extraction"
  - "Mocking useLavoratoriData / useSelectedWorkerEditor at module boundary for full render"
  - "Extracting use-gate1-view without churning gate1 card imports"
symptoms:
  - "Full-render Gate1View tests require dozens of unrelated mocks"
  - "Split PR breaks draft resync without a failing characterization test"
  - "Inline handlers in the view defeat React.memo on dumb cards"
tags: [characterization, gate1, smart-hook, module-anatomy, react-memo, target-b]
---

# Gate1 view split — characterization playbook

Reference cycle for the FASE 5 large-file program (`docs/plans/2026-07-06-001-refactor-large-file-split-fase5-plan.md`, units U2–U4). Use this when splitting other giant views (ricerca pipeline, lavoratori-cerca, assunzioni detail).

Related: [[characterization-testing-selected-worker-editor]], [[characterization-testing-rhf-realtime-false-greens]], `docs/testing-strategy.md` Target B, `docs/realtime-bug-class-plan.md` FASE 5 TER.

## Module layout (where symbols land)

| Concern | Path |
|---------|------|
| Thin view shell (JSX composer) | `src/modules/lavoratori/components/gate1-view.tsx` |
| Smart orchestration hook | `src/modules/lavoratori/hooks/use-gate1-view.ts` |
| Pure helpers (`sanitizeFileName`, `includesBabysitterType`, booking links) | `src/modules/lavoratori/lib/gate1-utils.ts` |
| Shared view/hook types (`GateViewProps`, section ids) | `src/modules/lavoratori/types/gate1-view.ts` |
| Dumb cards + context | `src/modules/lavoratori/components/gate1/*.tsx` |
| Render + hook characterization tests | `components/gate1-view.integration.test.tsx`, `hooks/use-gate1-view.integration.test.tsx` |
| Fixture factories | `components/__tests__/gate1-view-test-fixtures.ts` |

**Rule:** never park extracted symbols at repo-root `src/hooks/` or `src/components/lavoratori/` — the `lavoratori` module owns gate1.

## Cycle (in order)

### 1. Characterize before split (U2)

- Add a `describe("Gate1View render")` block that renders the **real** `Gate1View`.
- Hoist `vi.mock` on `../hooks/use-lavoratori-data` and `../hooks/use-selected-worker-editor` only — mock at **module boundary**, not Supabase internals.
- Copy the payroll pattern: `src/modules/payroll/components/payroll-overview-view.integration.test.tsx`.
- Factories: `makeLavoratoriDataReturn`, `makeEditorReturn`, `makeWorkerRow` in `components/__tests__/gate1-view-test-fixtures.ts`.
- Pin visible behavior: list + detail smoke, provincia filter args, worker selection, empty state, inline error.
- Keep the existing `GateDraftHarness` resync tests; they document the draft-merge guard without paying full-render setup cost.
- **No production changes** in the characterization-only PR.

### 2. Extract smart hook (U3)

- Move state, effects, handlers, memos, and data/editor hook calls into `useGate1View(props)`.
- View becomes: `const vm = useGate1View(props)` → `<Gate1WorkerProvider>` → JSX.
- Primary test seam moves to `use-gate1-view.integration.test.tsx` (`renderHookWithQueryClient`).
- Hook tests must cover:
  - gate draft resync preserves in-progress fields on server echo
  - identity switch (`selectedWorkerId`) resets baseline
  - `scrollToSection` updates `activeGateSection`
  - **mutation-verify:** temporarily break the resync guard → hook test fails
- Leave 1–2 view smoke tests in `gate1-view.integration.test.tsx` as regression guard.

### 3. Stabilize memo boundary (U4)

- Dumb cards under `components/gate1/` are `React.memo` and consume `Gate1WorkerProvider` where possible.
- Handlers passed as props from the orchestrator should use `useCallback` in `use-gate1-view.ts` when they would otherwise be fresh inline arrows each render.
- `scrollToSection`, photo upload handlers, and section ref registration are the first candidates to stabilize.
- No behavior change — U2 + U3 nets must stay green.

### 4. Field roll-out (U5–U6, BIS)

- After TER split (KTD1), migrate hand-rolled `on*Change` + draft paths to `<Field*>` inside `useAutoSaveForm` context.
- One card cluster per PR; use `fireEvent` on real controls (not bare `setValue`) per [[characterization-testing-rhf-realtime-false-greens]].

## Mock checklist for full render

When `Gate1View` still pulls ancillary hooks, mock only what mount requires:

| Module | Stub |
|--------|------|
| `use-lavoratori-data` | `makeLavoratoriDataReturn` — include `filters: { kind: "group", nodes: [] }`, realistic `lookupOptionsByDomain`, mock `table.getAllLeafColumns()` |
| `use-selected-worker-editor` | `makeEditorReturn` — array fields (`tipo_rapporto_lavorativo`, `check_lavori_accettabili`, `disponibilita_nel_giorno`) must be `[]`, not `{}` |
| `use-operatori-options` | `{ options: [], loading: false }` |
| `use-provincie` | `[]` |
| `use-current-operator-name` | string |
| `supabase.storage` | no-op upload/publicUrl |
| `record-crud` | resolved `updateRecord` |

## Anti-patterns

- **DOM snapshots** — assert visible text/roles and hook return transitions only.
- **Deep mock of gate1 cards** — defeats the purpose of full-render characterization.
- **Splitting before characterize** — no safety net for draft resync and filter wiring.
- **TER.2 before hook extract** — editor section hooks and view orchestration touch the same handlers; split structure first (KTD1).

## Verification commands

```bash
npm run test -- \
  src/modules/lavoratori/components/gate1-view.integration.test.tsx \
  src/modules/lavoratori/hooks/use-gate1-view.integration.test.tsx
npm run lint
```

Definition of done for one split cycle: both test files green, module paths respected, `/ce-compound` documents new learnings if behavior edge cases were discovered.
