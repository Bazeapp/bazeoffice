# Testing Strategy — Safety Net for Refactoring

> **Goal:** establish enough automated test coverage to safely (a) break up the
> giant component/hook files and (b) refactor the data layer, **without
> regressions**. This is a _behavioral safety net_, not a coverage-percentage
> chase.

## Guiding principle

We are writing **characterization tests**: tests that pin _observable behavior_
at stable seams so the internals underneath can be rewritten freely.

- **Do NOT** chase a line-coverage number across the 64k LOC of components.
  Snapshot soup over giant views breaks on every refactor and catches nothing.
- **DO** cover the code where regressions actually happen — business-logic hooks
  and the data layer — and pin the public behavior of giant files _right before_
  splitting them.

The order below is by **return-on-investment**: cheap+deterministic first, then
the highest-risk logic, then the expensive component characterization done
just-in-time per file.

---

## Current baseline (2026-06-15)

- React 19 + Vite + TS + Supabase, ~85k LOC. Italian HR/CRM domain.
- **73 tests passing, 0 failing** across 19 test files. Good infra already.
- Test runner: Vitest + happy-dom + Testing Library + jest-dom.
- Pre-push gate via lefthook: `test` + `tsc --noEmit` + `lint` (already enforced).
- **Gap:** `vitest.config.ts` declares `coverage.include` but the provider
  (`@vitest/coverage-v8`) is **not installed**, so coverage can't run yet.

### Where the mass is (and the ROI)

| Layer            | LOC   | Character                                              | ROI       |
| ---------------- | ----- | ----------------------------------------------------- | --------- |
| `components/`    | 64.5k | Giant view files (gate1-view = 3,288 lines)           | Low/line  |
| `hooks/`         | 14.7k | Business logic: boards, pipelines, drafts, realtime   | **High**  |
| `lib/`           | 3.4k  | Mostly pure utils + `anagrafiche-api` (data layer)    | High      |
| `pages`/`routes` | ~600  | Thin wiring                                            | Skip      |

---

## Conventions (already established — reuse, don't reinvent)

- **Hook tests:** `renderHookWithQueryClient(...)` from `@/test/test-utils`.
  Fresh QueryClient per test (retry off, staleTime 0) — caches don't bleed.
- **Component tests:** `renderWithProviders(...)` from the same file.
- **Data layer is mocked at the module boundary:**
  `vi.mock("@/lib/anagrafiche-api", () => ({ ... }))`, same for
  `availability-functions`, `stripe-connect-api`, `sonner`.
- **File suffixes:**
  - `*.test.ts` — pure unit tests (no DOM, no async infra). Run via `test:unit`.
  - `*.integration.test.tsx` — hooks/components needing DOM + QueryClient.
    Run via `test:integration`.
- **Global setup:** `src/test/setup.ts` (jest-dom, auto-cleanup, matchMedia /
  ResizeObserver / IntersectionObserver shims). Keep per-test mocks in the test
  file, not here.

---

## Tier 0 — Lock the baseline (do first, ~30 min)

1. Install the missing coverage provider:
   ```bash
   npm i -D @vitest/coverage-v8
   ```
2. Add a script to `package.json`:
   ```json
   "coverage": "vitest run --coverage"
   ```
3. Generate a **baseline coverage report** — used as a _before/after map_ of
   which refactor-target files are naked, NOT as a target to hit.
4. Confirm the 73 green tests remain the merge gate (already true via lefthook).

**Definition of done:** `npm run coverage` produces a report; baseline numbers
recorded in this doc.

### Baseline coverage (recorded 2026-06-19)

Global: **5% lines** (845/15991). This is the _before_ map of which refactor
targets are naked — NOT a number to chase.

| Target file                          | Lines % | Status                          |
| ------------------------------------ | ------- | ------------------------------- |
| `lib/anagrafiche-api.ts`             | 6%      | naked monolith (Target A1 → U3) |
| `lib/datetime.ts`                    | 0%      | Tier 1 gap → U2                 |
| `lib/geo-utils.ts`                   | 0%      | Tier 1 gap → U2                 |
| `lib/search-utils.ts`                | 0%      | Tier 1 gap → U2                 |
| `lib/private-area-url.ts`            | 0%      | Tier 1 gap → U2                 |
| `lib/availability-functions.ts`      | 0%      | Tier 1 gap → U2                 |
| `lib/lookup-color-styles.ts`         | 62%     | partial (indirect) → U2         |
| `hooks/use-auto-save-form.ts`        | ~0%     | Target A2 gap → U4              |
| `hooks/use-realtime-rows.ts`         | 0%      | Target A2 gap → U4              |
| `hooks/use-realtime-board-sync.ts`   | 100%    | already netted                  |
| `hooks/use-debounced-save.ts`        | 88%     | already netted                  |
| `hooks/use-auto-save-form-fields.ts` | 87%     | already netted                  |
| `hooks/use-board-mutations.ts`       | 83%     | already netted                  |

Giant refactor targets (Fase 3), all near-zero and to be characterized
just-in-time before splitting: `use-crm-pipeline-preview` (10%),
`use-ricerca-workers-pipeline` (0%), `use-ricerca-board` (0%),
`use-selected-worker-editor` (41%), and the giant views (~0%).

---

## Tier 1 — Pure logic in `lib/` (cheap, deterministic, no mocks)

Free, fast coverage of code that's easy to break in a refactor. Target the
pure functions:

- `lib/geo-utils.ts`, `lib/datetime.ts`, `lib/availability-functions.ts`
- `lib/lookup-color-styles.ts`, `lib/province-italiane.ts`, `lib/search-utils.ts`
- `lib/ricerca/*`, `lib/lavoratori/*` (some already covered — fill gaps)

Pattern: plain `*.test.ts`, table-driven input→output assertions. No DOM.

**Definition of done:** every exported pure function in `lib/` (excluding the
Supabase-calling parts of `anagrafiche-api`) has at least happy-path +
edge-case tests.

---

## Target A — Data-layer refactor safety net

The data layer is `lib/anagrafiche-api.ts` (1,736 lines) plus the
draft/autosave/realtime hook cluster the lefthook config explicitly flags as
the highest bug-risk class.

### A1. `anagrafiche-api.ts`

- Split mentally into **pure transforms** (row mappers, shapers, validators) and
  **Supabase calls** (query builders).
- **Pure transforms** → unit tests, no mocks. Pin the exact output shape; this is
  what protects you when you reorganize the file.
- **Supabase calls** → test via the hooks that consume them (below) with the
  module mocked, rather than mocking the Supabase client chain directly. Verify
  the _contract_ (which args go in, how the response is mapped) at the hook level.

### A2. Draft / autosave / realtime cluster (highest risk)

Characterize current behavior before touching it. These already have partial
coverage — extend it:

- `use-debounced-save`, `use-auto-save-form`, `use-auto-save-form-fields`
- `use-realtime-board-sync`, `use-realtime-rows`
- `use-selected-worker-editor` (38KB — draft echo/resync logic)
- `use-board-mutations`
- Existing guards to build on:
  `src/test/draft-resync-tier2.integration.test.tsx`,
  `key-unmount-pattern.integration.test.tsx`. See
  `docs/realtime-board-pattern.md` and `docs/realtime-bug-class-plan.md`.

Behaviors to pin: debounce timing (use fake timers), echo-suppression (don't
clobber local edits with an echoed realtime row), resync on identity change,
no-save-on-unmount-without-commit.

**Definition of done:** every behavior described in `realtime-bug-class-plan.md`
has a failing-without-the-fix test. Then refactor the data layer freely.

---

## Target B — Breaking up giant files safety net

Done **just-in-time, one file at a time**, never speculatively. For each monster
file you're about to split:

### B1. Pick the file and identify its public seam

Refactor candidates (biggest first):

- Hooks: `use-crm-pipeline-preview` (66KB), `use-selected-worker-editor` (38KB),
  `use-ricerca-workers-pipeline` (31KB), `use-support-tickets-board` (30KB),
  the `*-board` hooks.
- Components: `gate1-view` (3,288), `ricerca-workers-pipeline-view` (2,743),
  `ricerca-detail-view` (2,694), `lavoratori-cerca-view` (2,508),
  `assunzioni-detail-sheet` (2,394).

### B2. Write characterization tests for the CURRENT behavior

- **Giant hooks** → `renderHook` black-box tests: feed inputs, assert returned
  state/derived values/transitions. Mock the data layer at the module boundary.
  This is the real safety net — the hooks hold the logic.
- **Giant components** → integration tests: `renderWithProviders`, interact via
  `@testing-library/user-event`, assert **visible behavior** (text, roles,
  what shows/hides on interaction). **No DOM snapshots.**
- Storybook already has 52 stories — use them as a catalogue of the states each
  component must still render after the split.

### B3. Refactor under green

Split the file. Tests stay green throughout (they assert behavior, not
structure). If a test must change to compile, that's a signal the public seam
moved — review it deliberately.

**Definition of done (per file):** behavior characterized → file split → suite
green → coverage of that file's behavior did not drop.

---

## Sequenced execution

1. **Tier 0** — install coverage provider, baseline report. _(blocking)_
2. **Tier 1** — `lib/` pure functions. _(parallelizable, low risk)_
3. **Target A** — data-layer net (pure transforms + draft/realtime cluster),
   _then_ do the data-layer refactor.
4. **Target B** — per giant file: characterize → split → keep green. Start with
   the hook you most want to break up; hooks before their consuming components.

Targets A and B can interleave, but always: **net first, refactor second**, one
file at a time.

---

## Anti-patterns to avoid

- ❌ DOM/serializer snapshots of giant components (brittle, catch nothing).
- ❌ Tests asserting internal structure (private fns, call order that isn't
  contractual) — they break on the refactor they're meant to protect.
- ❌ Mocking the deep Supabase query-builder chain in component tests — mock at
  the `@/lib/*` module boundary instead.
- ❌ Writing component characterization tests for files you have no plan to touch.
- ❌ Chasing a global coverage % as the goal. Coverage is a _map_, not a target.

## Definition of done (overall)

A refactor is "safe to start" on a given file when: its public behavior is
pinned by tests that are green, those tests assert behavior (not structure), and
the data-layer seams it depends on are mocked at module boundaries. The suite
stays green through the entire refactor; any test that _must_ change is reviewed
as a deliberate contract change, not a silent edit.
