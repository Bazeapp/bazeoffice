---
title: "False-green traps when characterization-testing RHF autosave + realtime hooks"
date: 2026-06-23
category: best-practices
module: "autosave / realtime hook cluster"
problem_type: best_practice
component: testing_framework
severity: medium
applies_when:
  - "Writing characterization tests for react-hook-form autosave hooks (useAutoSaveForm)"
  - "Testing supabase realtime CDC subscription hooks (useRealtimeRows)"
  - "Asserting a guard prevents a save or subscribe (negative not-called assertions)"
  - "Testing coercion or fallback logic on a payload field that may be omitted"
  - "Verifying a test actually fails when its guard is removed (mutation testing)"
symptoms:
  - "A test is green but the guard it targets can be deleted with no failure"
  - "renderHook + setValue never triggers the react-hook-form change-type save branch"
  - "A coercion test passes because null ?? null is null"
  - "A combined guard test stays green when only one half of the guard is removed"
  - "A realtime test cannot tell handler-ref stability from re-subscription"
tags:
  - characterization-testing
  - mutation-testing
  - react-hook-form
  - supabase-realtime
  - autosave
  - false-green
  - real-timers
related_components:
  - useAutoSaveForm
  - useRealtimeRows
---

# False-green traps when characterization-testing RHF autosave + realtime hooks

## Context

U4 (Target A2) added the autosave/realtime safety-net tests: characterization tests for `useAutoSaveForm` (the FASE 5 BIS form-context autosave hook) and `useRealtimeRows` (the supabase channel primitive every board hook stands on but every consumer test mocks away). Both protect the realtime bug class — clobbered edits and stale/disappearing detail fields.

A code review with hand mutation testing (drop the guard, confirm the test reds) found that the *first cut* of these tests had multiple **false greens**. The two seams that produced them are genuinely non-obvious:

- **react-hook-form watch semantics** — `useAutoSaveFormFields` saves on `form.watch((v, { name, type }) => …)` only when `type === "change"` with a `name`. Every other watch event (reset, echo, the trailing `name=undefined`) is a resync/no-save. A test that drives the form the "obvious" way (`setValue`) lands on the no-save branch and never exercises the save engine.
- **the supabase realtime channel** — `supabase.channel(name).on("postgres_changes", filter, cb).subscribe()`, with the handler kept in a *ref* so a new `onEvent` closure doesn't tear down the channel. The chained builder and the ref indirection both invite over-mocking and under-falsifying.

This is the hook-specific companion to the sibling learning [characterization-testing-module-level-state.md](characterization-testing-module-level-state.md). That doc owns the general discipline (module-singleton isolation, the clamp-branch trap, mutation verification); this doc owns the five RHF/realtime-specific traps. Cross-link, don't re-derive.

## Guidance

A checklist of five false-green traps. Each is **mutation-verified**: the symptom is "guard deleted, test still green."

**TRAP 1 — RHF autosave only fires on `type === "change"`; `setValue` is a false green.** The save engine reacts to `form.watch` only when `type === "change"` with a `name`. A `renderHook` + `form.setValue("a", …)` drives the *non-change* branch (resync committed, no save), so `onSave` is never called and the test asserts nothing about the save path. **Fix:** render a real component with a registered input (`<input {...form.register("a")} />`) and drive it with `fireEvent.change`. Mock only `sonner`; `onSave`/`isPaused` are injected props; the hook needs no QueryClient (plain `render`/`renderHook`, not the `*WithQueryClient` helpers).

**TRAP 2 — a `?? null` coercion test is vacuous if you feed the wrong falsy value.** To test `newRow: payload.new ?? null`, firing `{ new: null }` passes *even if `?? null` is deleted* — because `null ?? null === null`. The assertion can't tell the guard from its absence. **Fix:** fire a payload that **omits** the key, so `payload.new` is `undefined` — the value the `?? null` actually coerces. (Mutation-verified: dropping `?? null` reds the absent-key payload, not the explicit-`null` one.)

**TRAP 3 — a combined guard test can mask one half of a compound guard.** The save guard is compound: `if (type !== "change" || !name) return`. RHF's `reset()` emits *two* watch events — `name="<field>"` (type `reset`) then a trailing `name=undefined`. A no-save-on-reset test stays green even if you remove only the `type !== "change"` half, because the trailing `name=undefined` hits the `!name` half and bails anyway. **Fix:** know that one combined scenario can't isolate one half of a compound guard. Either accept the redundancy and *note it in a comment*, or construct an input that reaches only the target branch.

**TRAP 4 — realtime subscription: mock the boundary, and make enable guards two-way.** Mock at `@/lib/supabase-client` (the module boundary), **not** a deep query-builder chain: a fake `channel` whose `.on()` returns the channel and whose `.subscribe()` returns the channel. Capture the registered CDC callback via `channel.on.mock.calls` and invoke it to simulate an event. Two sub-traps:
- **Handler-ref stability:** assert a *new* `onEvent` closure does **not** re-subscribe (no removed-channel/new-channel pair) and that the captured callback routes to the latest closure — the handler lives in a ref updated by a separate effect keyed off `[tablesKey, enabled]` only.
- **Two-way enable guard:** an `enabled && tables.length` guard test must exercise **both** the off path (no channel) **and** the on/re-enable path (channel created). Testing only the off path can't falsify the guard — a guard that is always-off also passes.

**TRAP 5 — real-timer debounce convention; document the timing coupling.** This repo tests debounce/autosave with **real timers + `waitFor`** (precedent: `use-debounced-save.integration.test.tsx`), not fake timers. "Not called" negatives use a fixed wall-clock wait wedged between the hook's two internal intervals — e.g. **60ms** sits *above* the 0ms debounce (so the first flush has run and chosen to defer) and *below* the 150ms `isPaused` reschedule (so a working guard hasn't saved yet). Sound only while that reschedule stays comfortably above 60ms. **Fix:** comment the coupling at the assertion, so a future change to the debounce/reschedule constants doesn't silently turn the negative assertion into a timing artifact.

**CROSS-CUTTING — mutation-test every guard.** For each guard, delete it in the production source, run the test, confirm it **reds**, then restore (`git checkout --`). If removing the guard doesn't break the test, the test isn't exercising it. (This is the sibling U3 lesson; these five traps are its hook-specific instances.)

## Why This Matters

These two hooks are the load-bearing seams of the echo-suppression / realtime bug class (see `CONCEPTS.md` — *Echo suppression*, *Realtime bug class*):

- `useAutoSaveForm` implements *resync-without-clobber*: a server `defaults` change resyncs **clean** fields but keeps fields the user is editing (`form.reset(defaults, { keepDirtyValues: true })`). If that breaks, a remote CDC event overwrites an in-progress edit — the clobbered-edit bug.
- `useRealtimeRows` is the subscription primitive under every board hook. Every consumer test mocks it wholesale, so its real subscribe/map/unsubscribe/ref-stability/enable logic had **never** been asserted until U4.

A false green here is strictly worse than no test: it shows "covered" over exactly the mechanism a refactor is most likely to break. Each trap produces a green test that constrains nothing — TRAP 1 never invokes the save engine, TRAP 2/3 pass with the guard physically deleted, TRAP 4's one-sided guard passes when always-off, TRAP 5 passes on a timing accident.

## When to Apply

- Testing **any react-hook-form autosave hook** that saves off `form.watch` — drive a registered input with `fireEvent.change`, never `setValue` (TRAP 1); know `reset()` emits two watch events (TRAP 3).
- Testing **any supabase realtime subscription hook** — mock at `@/lib/supabase-client`, capture-and-invoke the `.on()` callback (TRAP 4).
- Testing **any `?? null` / falsy-coercion guard** — feed the absent/`undefined` input the guard actually coerces, not a same-valued falsy stand-in (TRAP 2).
- Testing **any compound `||` / `&&` guard** — one combined scenario can mask a half; reach each branch or note the redundancy (TRAP 3).
- Testing **any two-way enable/toggle guard** — exercise both the off and on/re-enable paths (TRAP 4).
- Testing **any debounce/timer behavior** in this repo — real timers + `waitFor`; document the wall-clock-vs-interval coupling on negative assertions (TRAP 5).

## Examples

**TRAP 1 — `setValue` false green vs. `fireEvent.change` real save.** The harness registers real inputs so the watch event carries `type: "change"`:

```tsx
function Harness({ defaults, onSave, isPaused, debounceMs }) {
  const form = useAutoSaveForm<Values>({ defaults, onSave, isPaused, debounceMs })
  return (
    <form>
      <input aria-label="a" {...form.register("a")} />
      <input aria-label="b" {...form.register("b")} />
    </form>
  )
}
// FALSE GREEN: renderHook + form.setValue("a","edited") → non-change branch, onSave never called.
// REAL:
render(<Harness defaults={{ a: "1", b: "2" }} onSave={onSave} debounceMs={0} />)
fireEvent.change(input("a"), { target: { value: "edited" } })
await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
expect(onSave).toHaveBeenCalledWith({ a: "edited" })
```

**TRAP 2 — vacuous `{ new: null }` vs. absent-key coercion.** Only the absent-key payload falsifies a deleted `?? null`:

```ts
// VACUOUS: handler({ eventType: "DELETE", new: null, old: null })
//          passes even with `?? null` removed — null ?? null === null.
// REAL — omit the keys so payload.new/old are undefined:
handler({ eventType: "DELETE" })
expect(onEvent).toHaveBeenLastCalledWith(
  expect.objectContaining({ newRow: null, oldRow: null }),
)
// Present new, absent old → only old is coerced:
handler({ eventType: "INSERT", new: { id: "9" } })
expect(onEvent).toHaveBeenLastCalledWith(
  expect.objectContaining({ newRow: { id: "9" }, oldRow: null }),
)
```

**TRAP 3 — the two watch events from one `reset()`.** A single no-save-on-reset rerender exercises both halves; removing only the first half stays green:

```tsx
// rerender with new server defaults → pure resync, must not save.
rerender(<Harness defaults={{ a: "1", b: "77" }} onSave={onSave} debounceMs={0} />)
await new Promise((r) => setTimeout(r, 40))   // past 0ms debounce, under 150ms reschedule
expect(onSave).not.toHaveBeenCalled()
// stays green even if only `type !== "change"` is removed — the trailing
// name=undefined event still bails on the `!name` half.
```

**TRAP 4 — boundary mock + capture-and-invoke, and a two-way enable guard:**

```ts
vi.mock("@/lib/supabase-client", () => {
  const makeChannel = () => {
    const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) }
    return channel
  }
  return { supabase: { channel: vi.fn(makeChannel), removeChannel: vi.fn() } }
})

function handlerFor(channel, table) {
  const call = channel.on.mock.calls.find((c) => c[1]?.table === table)
  const [, , callback] = call  // .on(event, filter, callback)
  return callback
}

// TWO-WAY enable guard — off path AND on/re-enable path:
const { rerender } = renderHook(
  ({ tables, enabled }) => useRealtimeRows(tables, vi.fn(), { enabled }),
  { initialProps: { tables: ["famiglie"], enabled: false } },
)
expect(channelMock()).not.toHaveBeenCalled()      // disabled + populated → no channel
rerender({ tables: [], enabled: true })
expect(channelMock()).not.toHaveBeenCalled()      // enabled + empty → still none
rerender({ tables: ["famiglie"], enabled: true })
expect(channelMock()).toHaveBeenCalledTimes(1)    // re-enabled + populated → subscribes
```

**TRAP 5 — real-timer negative assertion; the comment is load-bearing:**

```tsx
fireEvent.change(input("a"), { target: { value: "edited" } })
// 60ms is above the 0ms debounce (first flush HAS run and chose to defer) and
// below the 150ms reschedule (a working guard hasn't saved yet). Sound only
// while that reschedule stays comfortably above 60ms.
await new Promise((r) => setTimeout(r, 60))
expect(onSave).not.toHaveBeenCalled()
paused = false
await waitFor(() => expect(onSave).toHaveBeenCalledWith({ a: "edited" }))
```

## Related

- `src/hooks/use-auto-save-form.integration.test.tsx`, `src/hooks/use-realtime-rows.integration.test.tsx` — the finished U4 artifacts these traps came from.
- `src/hooks/use-auto-save-form.ts`, `src/hooks/use-auto-save-form-fields.ts`, `src/hooks/use-realtime-rows.ts` — implementations under test.
- `src/hooks/use-debounced-save.integration.test.tsx` — the real-timer + `waitFor` precedent (TRAP 5).
- [characterization-testing-module-level-state.md](characterization-testing-module-level-state.md) — **sibling learning**: same mutation-verify-the-guard philosophy applied to module-level singleton state (write-tracking counters) with `resetModules` + fake timers, vs. this doc's RHF/realtime + real-timer mechanics.
- `docs/plans/2026-06-23-001-test-u4-autosave-realtime-cluster-plan.md` — origin plan; each trap maps to one of its KTDs/Risks.
- `docs/testing-strategy.md` (Target A2 cluster), `docs/realtime-board-pattern.md`, and `CONCEPTS.md` (*Echo suppression*, *Realtime bug class*) — the strategy and the mechanism these tests protect.
