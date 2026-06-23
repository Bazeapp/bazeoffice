---
title: "Characterization-testing module-level mutable state in Vitest"
date: 2026-06-23
category: best-practices
module: src/lib/anagrafiche-api.ts
problem_type: best_practice
component: testing_framework
severity: medium
applies_when:
  - "Characterization-testing module-level mutable singleton state (counters, timestamps)"
  - "Pinning time-dependent behavior stamped at promise resolution rather than call time"
  - "Writing a safety-net test before refactoring untested write-tracking or echo-suppression code"
  - "Auditing whether a regression test actually exercises the guard branch it claims to protect"
  - "Using Vitest fake timers alongside dynamic import() or real-promise await"
symptoms:
  - "Module-level state bleeds between tests because static top-level imports share one singleton"
  - "A clamp/guard such as Math.max(0, n-1) can be deleted with all tests still green (vacuous coverage)"
  - "Timestamp assertions pass for the wrong reason because the clock was never advanced in-flight"
  - "Balanced setup/teardown pairs never drive state into the branch under test"
related_components:
  - useRealtimeBoardSync
  - anagrafiche-api
tags:
  - characterization-testing
  - vitest
  - fake-timers
  - module-singleton
  - mutation-testing
  - echo-suppression
  - safety-net
---

# Characterization-testing module-level mutable state in Vitest

## Context

`anagrafiche-api.ts` (~1,736 lines) is the single chokepoint every write passes through — too large and too load-bearing to refactor casually. Fase 1 of the testing strategy is a safety net: pin observable behavior at stable seams *before* any reorganization, so a later split can't silently change semantics.

Four write-tracking primitives — `pendingWriteCount`, `lastLocalWriteAt`, and their accessors `getPendingWriteCount()` / `getMillisSinceLastLocalWrite()` — are the foundation the realtime echo-suppression cluster stands on. `useRealtimeBoardSync` **defers** a board reload while `getPendingWriteCount() > 0`, and **suppresses** a remote CDC echo within ~2500ms of `getMillisSinceLastLocalWrite()`. If either number is wrong the symptom is the known realtime bug class: a stale or disappearing detail field, or a board that stops reloading entirely. So the net protecting these numbers has to be trustworthy — a *vacuous* test here is actively dangerous, because it grants false confidence over the exact mechanism a refactor is most likely to break.

The wrinkle that shapes the whole recipe: this state is a **module-level mutable singleton**, not a class you can `new` per test.

## Guidance

A repeatable recipe for characterization-testing module-level singleton state in this Vitest codebase.

**1. Isolate the singleton with `resetModules` + dynamic `import()`.** A static `import` binds the *shared* module instance — `pendingWriteCount` leaks from one test into the next and you get order-dependent flakes. Reset the registry and re-import inside each test:

```ts
async function loadFreshApi() {
  vi.resetModules()
  return import("@/lib/anagrafiche-api") // fresh pendingWriteCount=0, lastLocalWriteAt=0
}
```

Every test calls `const api = await loadFreshApi()` first. (Vitest 4.1.9 does **not** fake `queueMicrotask`, so `await` on real promises and the dynamic `import()` itself still resolve under fake timers — the pattern is safe. Note: `resetModules()` also clears the module registry, so set up any `vi.mock()` *after* calling the helper if a future test needs one.)

**2. Pin time, don't race it.** Fake timers + a fixed base instant so the window math is asserted to the millisecond:

```ts
const BASE = new Date("2026-06-19T00:00:00.000Z").getTime()
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BASE) })
afterEach(() => { vi.useRealTimers() })
```

To prove a timestamp is stamped *at resolution* (not at call), advance the clock while the operation is in flight, then resolve, and assert the elapsed reflects the resolution instant.

**3. Characterization-first: pin the current surprising-but-intentional semantics** as the contract — not what you wish they were:

- `endPendingWrite()` floors the count at 0 **and** stamps `lastLocalWriteAt` **unconditionally** (an unpaired `end` still opens the echo window with no real write behind it).
- `getMillisSinceLastLocalWrite()` returns `+Infinity` before the first write (sentinel `lastLocalWriteAt === 0`).
- a **failed** `runTracked` decrements the count but does **not** advance `lastLocalWriteAt` — only a resolved op counts as "our write".
- nesting is integer-safe: `0 -> 2 -> 0`.

**4. THE CRUCIAL RULE — for any clamp/guard branch, the test's state must actually *reach* that branch, and you must prove non-vacuity.** This is where the naive net fails. There are **two** `Math.max(0, pendingWriteCount - 1)` floors in production:

```ts
async function trackWrite(operation) {            // runTracked delegates here
  pendingWriteCount += 1
  try { return await operation }
  finally { pendingWriteCount = Math.max(0, pendingWriteCount - 1) } // floor #1 (line 452)
}
export function endPendingWrite() {
  pendingWriteCount = Math.max(0, pendingWriteCount - 1)             // floor #2 (line 462)
  lastLocalWriteAt = Date.now()
}
```

The first test version pinned only floor #2 (call `endPendingWrite()` at count 0, assert still 0). It **missed floor #1** because every `runTracked` test used a *balanced* +1/-1 pair — `runTracked` increments then decrements its own counter, so the count never sits below 1 when the `finally` runs, and the clamp branch never executes. Deleting floor #1 from production left all 9 tests **green** — a vacuous hole in the middle of a safety net.

The fix is an **unbalanced** test that drains the *shared* counter below what `runTracked`'s `finally` decrements — mirroring the real hazard where `useDebouncedSave`'s begin/end path interleaves with an in-flight `runTracked` over the same counter:

```ts
api.beginPendingWrite()                    // 1
const tracked = api.runTracked(operation)  // 2 (in flight)
api.endPendingWrite()                      // 1
api.endPendingWrite()                      // 0  <- drained while op still in flight
resolve("ok"); await tracked               // finally hits Math.max(0, 0 - 1) = floor #1
expect(api.getPendingWriteCount()).toBe(0) // without the floor: -1
```

**5. Prove non-vacuity by hand mutation testing.** Cheap (~30s) and decisive: delete the production floor (line 452 only), run the new test, confirm it **fails** with `expected -1 to be +0`, then `git checkout -- src/lib/anagrafiche-api.ts` to restore. If removing the guard *doesn't* break the test, the test wasn't exercising the guard.

## Why This Matters

A vacuous safety-net test is worse than no test: it shows green, signals "covered," and invites the refactor that quietly removes the very guard it claimed to protect. The chain of consequence here is concrete — if floor #1 is dropped and an unbalanced interleaving drives `pendingWriteCount` to `-1`, then `getPendingWriteCount() > 0` is false forever, `useRealtimeBoardSync` **stops deferring reloads**, and remote CDC events overwrite in-progress local edits — the realtime stale-field bug class, but permanent until reload.

Line coverage counts *lines visited*, not *branches reached by meaningful state*. Both floors are "covered" by line coverage even when only one is actually exercised. Mutation (even by hand) is the only cheap check that a characterization test constrains behavior rather than merely visiting code.

## When to Apply

- **Module-level mutable singletons** — any `let` at module scope mutated by exported functions. Isolate with `resetModules` + dynamic `import()` per test; static imports share state and bleed.
- **Any `Math.max` / clamp / floor / saturating / guard branch** — write a test whose state *reaches* the clamp, not one that merely calls the function. Watch for the balanced-pair trap: increment/decrement helpers that can never drive their own counter below the floor.
- **Multiple copies of the same guard** — when the same defensive expression appears in more than one place (here, two identical `Math.max(0, …)` floors), each needs its own state path; one passing test does not cover the other.
- **Time-window logic** — fake timers + fixed base; advance in-flight to prove stamp-at-resolution.
- **Before splitting or refactoring a monolith** — characterize first, and mutation-verify the characterizations that protect the load-bearing invariants.

## Examples

**The vacuous test (balanced — floor #1 never runs):**

```ts
// runTracked self-balances: +1 then -1, count never sits below 1 at the finally.
const tracked = api.runTracked(operation)
expect(api.getPendingWriteCount()).toBe(1)
resolve("ok"); await tracked
expect(api.getPendingWriteCount()).toBe(0)  // GREEN even if Math.max(0,…) is deleted
```

Contrast it with the **unbalanced floor test** in Guidance step 4 — same primitives, but it drains the count to 0 *before* the tracked op settles, so it goes red (`-1`) the moment floor #1 is removed. That pair — one green-regardless, one red-without-the-guard — is the whole point.

**Stamp-at-resolution (advance the clock while in flight):**

```ts
vi.setSystemTime(BASE)
const tracked = api.runTracked(operation)
vi.setSystemTime(BASE + 1000)   // clock moves while write is in flight
resolve("ok"); await tracked
expect(api.getMillisSinceLastLocalWrite()).toBe(0)   // stamped at resolution, not at call
vi.setSystemTime(BASE + 1000 + 500)
expect(api.getMillisSinceLastLocalWrite()).toBe(500)
```

**Failed write does not open the echo window (intentional asymmetry):**

```ts
reject(new Error("save fallito sul server"))
await expect(tracked).rejects.toThrow("save fallito sul server")
expect(api.getPendingWriteCount()).toBe(0)                               // finally still decremented
expect(api.getMillisSinceLastLocalWrite()).toBe(Number.POSITIVE_INFINITY) // but no stamp
```

## Related

- `src/lib/anagrafiche-api.write-tracking.test.ts` — the finished 10-test artifact this learning came from (U3).
- `src/lib/anagrafiche-api.ts:427-515` — the implementation under test: `trackWrite`/`runTracked`, `beginPendingWrite`/`endPendingWrite`, the two accessors, and the two `Math.max(0, …)` floors (lines 452 and 462).
- `src/hooks/use-debounced-save.integration.test.tsx` — precedent that *mocks* these primitives; this learning tests them for real.
- `docs/plans/2026-06-19-001-test-fase1-safety-net-plan.md` — parent plan; this is the realized learning from unit **U3** (and the "write-tracking via module reset" KTD).
- `docs/solutions/2026-06-19-testing-safety-net.md` — the planned U7 umbrella doc (broad U2–U6 testing patterns). **Not written yet**; when it is, it should *link here* for the module-level-state deep-dive rather than re-explaining it.
- `docs/testing-strategy.md` — conceptual companion (Tier 0/Tier 1/Target A/B; the `*.test.ts` vs `*.integration.test.tsx` convention). Its Target A1 covers `anagrafiche-api.ts` but doesn't mention module-level mutable state — cross-link this doc from there.
- `docs/realtime-board-pattern.md` / `docs/realtime-bug-class-plan.md` — downstream consumer context: the 2500ms echo window and the realtime bug class these primitives feed. (FASE 6 BIS.1 plans to move `pendingWriteCount` from a global singleton to a per-table `Map` — revisit these singleton-shape tests then.)
