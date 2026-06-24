---
title: "Characterizing the 38KB use-selected-worker-editor draft/echo/concurrency hook"
date: 2026-06-24
category: best-practices
module: "use-selected-worker-editor (worker detail editor)"
problem_type: best_practice
component: testing_framework
severity: medium
applies_when:
  - "Extending the use-selected-worker-editor characterization net (Target A2)"
  - "Testing per-section draft-resync-without-clobber guards on a multi-draft hook"
  - "Testing an identity-switch reset that has no realtimeTick"
  - "Testing in-flight concurrency gates (activePatchesRef / a per-key create-serialization Map)"
  - "Deciding fake vs real timers for a hook that delegates debounce to its callers"
symptoms:
  - "A preservation test stays green even with the isEditingX guard removed"
  - "An in-flight gate test never exercises the gate because the writer mock resolved synchronously"
  - "A 'no save on switch/unmount' test asserts toast instead of the writers"
tags: [characterization, react-hook, realtime, draft, concurrency, mutation-testing]
---

# Characterizing `use-selected-worker-editor`

This is the 38KB / 1,137-line worker detail editor — the highest-risk member of
the autosave/realtime cluster (`docs/testing-strategy.md` Target A2). It holds
**8 isEditing-guarded drafts**, two drafts that resync **unconditionally**, two
**in-flight concurrency gates**, and ~10 write paths. The net was built by
extending `src/hooks/use-selected-worker-editor.integration.test.tsx` (reusing
its existing `sonner` + `anagrafiche-api` + `availability-functions` +
`stripe-connect-api` mock harness and `makeRow`/`makeProps` factories — never a
rewrite).

Related: [[characterization-testing-rhf-realtime-false-greens]],
[[characterization-testing-module-level-state]],
`docs/realtime-bug-class-plan.md`, `docs/realtime-board-pattern.md`.

## The mechanics that bite

### 1. Resync is a two-layer guard, not one

The resync effect (`~434-472`) runs on any `selectedWorkerRow` / `isEditingX`
change. It has a **top-level own-write gate** (`if (activePatchesRef.current > 0)
return`) and then a **per-section** `if (!isEditingX)` guard per draft. Two
drafts — `nonIdoneoReasonValues` and `blacklistChecked` — are reseeded
**unconditionally** (only the own-write gate protects them). Pin both halves:

- A preservation test is meaningful **only** when its `isEditingX` flag is ON
  **and** the echoed row column actually **differs**. With the flag off, every
  draft resyncs regardless — the test passes vacuously.
- The unconditional pair is the inverse: set *every* `isEditingX = true`, echo a
  changed `motivazione_non_idoneo` / `check_blacklist`, and assert they **did**
  update.

### 2. Identity switch is flag-reset-driven — there is NO `realtimeTick`

Switching `selectedWorkerId` fires a second effect (`~474-484`) that resets all 8
`isEditingX` flags to `false`; the resync effect then reseeds every draft from
the new row because every `if (!isEditingX)` branch is now open. To test, rerender
with a **different `selectedWorkerId` AND a different row** and assert the draft
reflects the new worker and `isEditingHeader === false`. Do not look for a tick
counter — this hook has none (unlike `use-lavoratori-data`'s Pattern B).

### 3. In-flight gates need a MANUALLY DEFERRED promise

`activePatchesRef` (suppresses all resync mid-save) and `pendingAddressCreateRef`
(serializes concurrent `indirizzi` INSERTs into one create + UPDATEs) only matter
while a write is pending. A `mockResolvedValue` writer closes the window before
the rerender, so the gate is never exercised — a **false green**. Hold the writer
open:

```ts
let resolve!: (v: unknown) => void
vi.mocked(updateRecord).mockImplementationOnce(
  () => new Promise((res) => { resolve = res as (v: unknown) => void })
)
// ...start the write (do NOT await), rerender / fire the second call, assert the
// gated behavior, THEN resolve(...) and await.
```

`pendingAddressCreateRef` is a `Map<string, Promise>` keyed by `selectedWorkerId`:
fire both `applyAddressPatch` calls under the **same** id (no address id present)
so they hit the same entry — assert `createRecord` called **once**, then the
second field persists via `updateRecord` against the created row's id. Switching
the id between calls would (correctly) bypass the gate and fail for the wrong
reason.

### 4. No fake timers here

Unlike the write-tracking and debounced-save tests, this hook has **no internal
debounce and no flush-on-unmount** — callers (`DebouncedInput` / `useDebouncedSave`)
own the debounce, then invoke `commit*` / `patch*`. So resync tests are synchronous
`act()` + `rerender(...)`, and write-path tests use `await act(async () => …)`. The
"no save on switch / unmount" tests assert the **writers** (`updateRecord` /
`createRecord` / `deleteRecord`) were not called — not merely `toast` — with the
writer mock otherwise able to resolve, so "not called" is met for the right reason.

### 5. The orchestration false-green

`saveWorkerAvailability` and `patchWorkerAvailabilityStatus` call
`invokeWorkerAvailability` **after** the DB update. A test asserting only
`updateRecord` stays green if the side-effect edge-fn call is dropped — assert
`invokeWorkerAvailability` and `toast.success` explicitly.

## Mutation-verify-every-guard (mandatory)

Each guard below was verified by deleting it in the source, confirming the named
test reds, then `git checkout --`-ing the file. A green test over a removed guard
is strictly worse than no test.

| Guard | Source (approx) | Reds |
| --- | --- | --- |
| per-section `if (!isEditingX)` | `~446-459` | the draft's preservation test (e.g. B9 documents) |
| `[selectedWorkerId]` flag reset | `~474-484` | B11 identity switch |
| `if (activePatchesRef.current > 0) return` | `~435` | B10 in-flight gate |
| `pendingAddressCreateRef` pending check | `~621-631` | B22 single-INSERT |
| `await invokeWorkerAvailability(...)` | `~758` | B16 orchestration |
| `commit*` no-op `if (next === current) return` | `~699` | B18 header no-op |
