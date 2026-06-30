---
title: "Characterization-testing board hooks: export the pure helpers, don't refactor the mapper"
date: 2026-06-24
category: best-practices
module: "board/data hooks + anagrafiche-api data layer"
problem_type: best_practice
component: testing_framework
severity: medium
applies_when:
  - "Net-first characterization of a board/data hook before a data-layer refactor"
  - "The hook's card-mapping is inline in a non-exported module-level async orchestrator"
  - "Pinning a thin data-access file that has one genuinely-pure transform"
  - "Choosing the *.test.ts vs *.integration.test.tsx suffix for an async-orchestrator test"
symptoms:
  - "The assunzioni/variazioni/chiusure 'import the exported mapper' precedent does not apply"
  - "A nullish-coalescing (??) test stays green even when ?? is swapped to ||"
  - "Tempted to extract a whole mapper out of an async loop just to test it"
tags: [characterization, board-hook, pure-transform, contract-test, mutation-testing, nullish-coalescing, pattern-a]
---

# Characterization-testing board hooks: export the pure helpers, don't refactor the mapper

How to put a contract net under a board/data hook (Target A1, "verify the
Supabase-call contract at the hook level") when its card-mapping is **not** a
separable exported function. Companion to
[[characterization-testing-selected-worker-editor]] (the giant-hook deep dive),
[[characterization-testing-rhf-realtime-false-greens]] and
[[characterization-testing-module-level-state]] (the false-green / mutation-verify
discipline these reuse). See also `docs/realtime-board-pattern.md` (Pattern A) and
`docs/testing-strategy.md` (Target A1).

## Context

The existing board-contract tests (`use-assunzioni-board.test.ts`,
`use-variazioni-board.test.ts`, `use-chiusure-board.test.ts`) are pure `*.test.ts`
files that `import` an exported synchronous mapper (`mapAssunzioniBoardCard` +
binding arrays + `preserveMissingFields`) and assert on its output — no mocks, no
render. That precedent **only works because the mapper is a separable exported
symbol.**

Many board/data hooks don't have one. Their per-card mapping lives **inline inside
a non-exported, module-level async orchestrator** — `fetchPayrollBoardData`,
`fetchRiattivazioniBoardData`, `fetchContributiBoardData`, the prove builder. There
is nothing to `import`. Extracting a pure mapper out of the async loop is a real
production refactor (move the per-row body, re-wire the call sites) — exactly the
kind of behavior change a *net-first* pass must not make.

## Guidance

**1. Don't extract the whole mapper. Export the cleanly-extractable pure helpers
the orchestrator already composes, and pin those.** Adding `export` to an existing
pure function is additive and reversible (zero behavior change); moving a mapper
out of an async loop is not.

Worked example — the four in-scope Target A hooks reduced to one-export-each:

| Hook | Exported helper | What it pins |
| --- | --- | --- |
| `use-payroll-board` | `preserveDetailFields(card, previousCard)` | Pattern A: restore `presenze`/`presenzeRegolari` from previous **when the fresh card is null**; `PRESERVED_DETAIL_FIELDS` baked in; inputs not mutated |
| `use-riattivazioni-board` | `resolveStage` + `hasRiattivazioneStatus` + `shouldShowUnclassifiedChiusura` + `getChiusuraTipoLabel` | stage resolution (default + label match), the inclusion filter (`status OR rapporto non-attivo`), tipo fallback |
| `use-contributi-inps-board` | `getQuarterDateRange(year, quarter)` | UTC quarter boundaries; invalid quarter -> `null` |

**2. The realtime-bug-class helper is the one that earns the net.**
`preserveDetailFields` is the Pattern-A stale-detail guard — the single behavior a
data-layer refactor is most likely to break. Pin it; leave the rendered-hook
fetcher-args path and the lowest-value mappings (e.g. `use-prove-colloqui-data`)
lean. Be explicit about what you left uncovered in the strategy doc — the giant
board hooks (`use-ricerca-*`, `use-support-tickets-board`, `use-anagrafiche-data`)
are Target B (characterize just-in-time before splitting), not part of this net.

**3. Pin payroll's `preserveDetailFields` to its ACTUAL semantics, not the generic
Pattern-A rule.** It is a **2-arg, card-level** helper keyed off `card[field] ==
null` — the board mapper always seeds those fields `null`, so the only observable
behavior is *restore-from-previous-when-fresh-is-null*. There is **no
"fresh-present-null wins / DB-clear propagates" case** — that semantic belongs to
the **column-keyed** `preserveMissingFields` (assunzioni / crm-pipeline), which
keys off `column in row`. Asserting the wrong one tests behavior the code doesn't
have.

**4. These orchestrators are testable as plain async functions — keep them
`*.test.ts`.** They take no React/DOM; once the helper is exported you assert on it
directly with no render and no QueryClient. Only rename to `*.integration.test.tsx`
if you actually `renderHookWithQueryClient` (the rendered fetcher-args path). The
suffix is a runner gate (`test:unit` excludes `*.integration.test.*`), not a label.

## The companion A1 pattern: the one pure transform in a thin-wrapper file

`anagrafiche-api.ts` is ~1,736 lines but almost entirely **thin `fetch*` / RPC
wrappers** around a single shared `queryTable`. The "row mappers / validators" the
strategy imagined are **in the board hooks, not here** — which is *why* the
guidance above exists. The data layer's one genuinely-pure transform is
`normalizeTableResponse`. Export just that one and pin its surprising semantics:

- **Array input is returned BY REFERENCE** — `normalizeTableResponse(arr).rows ===
  arr`.
- **`??` (nullish) not `||` (falsy).** The discriminator is an explicit `total: 0`
  (0 is falsy but not nullish -> stays `0` under `??`; would fall through to
  `count`/`rows.length` under `||`). An empty-array `data: []` does **not**
  discriminate — arrays are truthy, so `[] ?? x` and `[] || x` both yield `[]`.
  This is the same trap as [[characterization-testing-rhf-realtime-false-greens]]
  TRAP 2: a coercion test is vacuous unless you feed the value that actually
  discriminates the operator.
- **`total` may DISAGREE with `rows.length`** (server pagination supplies an
  explicit total) — the function does not reconcile them.
- **`EMPTY_ROWS`** (the rpc short-circuit constant) is structurally identical to
  the empty-input output. Pin the *shape*; don't `export` the constant solely to
  test it.

## Why This Matters

- The pure helpers **are** the data-layer contract worth protecting:
  `preserveDetailFields` is the realtime stale-field guard; the stage / quarter /
  inclusion logic is the card-shaping contract. Pinning them lets a refactor
  reorganize the orchestrators without silently changing what reaches the board.
- Exporting a pure function keeps the net-first pass **test-only** (zero behavior
  change). Extracting a mapper out of an async loop would smuggle a refactor into a
  safety-net commit — the opposite of net-first.
- Choosing the wrong helper semantics (the "DB-clear wins" trap) or the wrong
  operator-discriminator (the `total: 0` trap) produces a **green-but-vacuous**
  test over exactly the seam a refactor will break.

## When to Apply

- Net-first characterization of a board/data hook before a data-layer refactor,
  when the card-mapping is inline in a non-exported async orchestrator.
- Any thin data-access file (`anagrafiche-api`-style) with one genuinely-pure
  shaper among many I/O wrappers.

## Mutation-verify every guard (mandatory)

Non-negotiable, same as the sibling docs: for each guard, delete it in the
production source, run the test, confirm it **reds**, then `git checkout --` to
restore. A green test over a removed guard is strictly worse than no test. The
guards worth verifying here:

| Guard | Reds |
| --- | --- |
| `normalizeTableResponse` `??` chain (swap to `||`) | the `total: 0` case |
| `preserveDetailFields` restore (`if (merged[field] == null && previous[field] != null)`) | the restore-from-previous case |
| `resolveStage` default / `getQuarterDateRange` boundary | the corresponding helper case |

## What NOT to do

- Don't extract a whole inline mapper and call it "a minimal export" — that's a
  refactor; defer it to the rendered-hook path or Target B.
- Don't name a non-rendering test `*.integration.test.tsx` — it misroutes the file
  out of `test:unit`.
- Don't assert "fresh-null wins / DB-clear propagates" for payroll
  `preserveDetailFields` — that case does not exist in the card-level `== null`
  helper.
- Don't let the `??` test feed an explicit `null`/empty-array that fails to
  discriminate `??` from `||`.
