/**
 * Characterization tests for the write-tracking / echo-suppression primitives
 * in `anagrafiche-api.ts` (`pendingWriteCount` + `lastLocalWriteAt`).
 *
 * These four numbers are the foundation the realtime cluster's echo
 * suppression stands on: `useRealtimeBoardSync` defers a reload while
 * `getPendingWriteCount() > 0` and ignores a remote CDC echo within ~2500ms of
 * `getMillisSinceLastLocalWrite()`. Pin the EXACT current semantics here so the
 * 1,736-line data layer can be reorganized later without silently changing the
 * window math.
 *
 * The contract being characterized (surprising-but-intentional details kept on
 * purpose, not "fixed"):
 *   - `endPendingWrite()` floors the count at 0 — it can never go negative.
 *   - `getMillisSinceLastLocalWrite()` returns `+Infinity` until the FIRST
 *     successful write (sentinel `lastLocalWriteAt === 0`).
 *   - a FAILED `runTracked` decrements the count but does NOT advance
 *     `lastLocalWriteAt` (only a resolved operation counts as "our write").
 *   - the count is a plain integer, so nesting is safe: 0 -> 2 -> 0.
 *
 * Why the unusual setup:
 *   - The state is MODULE-LEVEL and mutable, so each test re-imports a fresh
 *     copy via `vi.resetModules()` + dynamic `import()` to start from 0.
 *   - Timing is pinned with fake system time so the echo-window elapsed math is
 *     asserted to the millisecond instead of racing the wall clock.
 *
 * `normalizeTableResponse` (the optional scenario in the plan) is intentionally
 * NOT covered here: it is a private, un-exported helper and U3's file footprint
 * is test-only — exporting production code solely to test it is out of scope.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const BASE = new Date("2026-06-19T00:00:00.000Z").getTime()

/**
 * Re-import the module with its module-level counters reset to their initial
 * values (`pendingWriteCount = 0`, `lastLocalWriteAt = 0`). Every test gets a
 * pristine state machine.
 */
async function loadFreshApi() {
  vi.resetModules()
  return import("@/lib/anagrafiche-api")
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("pending-write count (begin/end/get)", () => {
  it("starts at 0 and beginPendingWrite increments it by one", async () => {
    const api = await loadFreshApi()

    expect(api.getPendingWriteCount()).toBe(0)
    api.beginPendingWrite()
    expect(api.getPendingWriteCount()).toBe(1)
  })

  it("a paired endPendingWrite returns the count to the prior value", async () => {
    const api = await loadFreshApi()

    api.beginPendingWrite()
    api.beginPendingWrite()
    expect(api.getPendingWriteCount()).toBe(2)

    api.endPendingWrite()
    expect(api.getPendingWriteCount()).toBe(1)
  })

  it("floors at 0 — endPendingWrite on an already-zero count never goes negative", async () => {
    const api = await loadFreshApi()

    expect(api.getPendingWriteCount()).toBe(0)
    api.endPendingWrite()
    expect(api.getPendingWriteCount()).toBe(0)
    api.endPendingWrite()
    expect(api.getPendingWriteCount()).toBe(0)
  })
})

describe("echo window (getMillisSinceLastLocalWrite)", () => {
  it("returns +Infinity before any write has happened", async () => {
    const api = await loadFreshApi()

    expect(api.getMillisSinceLastLocalWrite()).toBe(Number.POSITIVE_INFINITY)
  })

  it("returns a finite elapsed once endPendingWrite has stamped lastLocalWriteAt", async () => {
    const api = await loadFreshApi()

    // endPendingWrite stamps `lastLocalWriteAt = Date.now()` even when it floors
    // the count — the stamp is UNCONDITIONAL. This matters: an unpaired
    // endPendingWrite (no matching begin) still opens the ~2500ms echo-suppression
    // window in useRealtimeBoardSync with no real write behind it. If a future
    // change guards the stamp behind `if (count > 0)`, this assertion failing is
    // the signal that the echo-window contract changed — not a test to "fix".
    vi.setSystemTime(BASE)
    api.endPendingWrite()
    expect(api.getMillisSinceLastLocalWrite()).toBe(0)

    vi.setSystemTime(BASE + 1500)
    expect(api.getMillisSinceLastLocalWrite()).toBe(1500)
  })
})

describe("runTracked", () => {
  it("holds the count at 1 in flight, returns it to 0 after, and resolves with the value", async () => {
    const api = await loadFreshApi()

    let resolve!: (value: string) => void
    const operation = new Promise<string>((res) => {
      resolve = res
    })

    const tracked = api.runTracked(operation)
    // The increment is synchronous (before the first `await`), so it is already
    // visible here while the operation is in flight.
    expect(api.getPendingWriteCount()).toBe(1)

    resolve("ok")
    await expect(tracked).resolves.toBe("ok")
    expect(api.getPendingWriteCount()).toBe(0)
  })

  it("advances lastLocalWriteAt to the resolution instant on success", async () => {
    const api = await loadFreshApi()
    expect(api.getMillisSinceLastLocalWrite()).toBe(Number.POSITIVE_INFINITY)

    let resolve!: (value: string) => void
    const operation = new Promise<string>((res) => {
      resolve = res
    })

    vi.setSystemTime(BASE)
    const tracked = api.runTracked(operation)

    // Advance the clock while the write is still in flight: the stamp must be
    // taken when the operation RESOLVES, not when runTracked was called.
    vi.setSystemTime(BASE + 1000)
    resolve("ok")
    await tracked

    expect(api.getMillisSinceLastLocalWrite()).toBe(0)
    vi.setSystemTime(BASE + 1000 + 500)
    expect(api.getMillisSinceLastLocalWrite()).toBe(500)
  })

  it("decrements the count on rejection and does NOT advance lastLocalWriteAt", async () => {
    const api = await loadFreshApi()

    let reject!: (reason: unknown) => void
    const operation = new Promise<string>((_res, rej) => {
      reject = rej
    })

    const tracked = api.runTracked(operation)
    expect(api.getPendingWriteCount()).toBe(1)

    reject(new Error("save fallito sul server"))
    await expect(tracked).rejects.toThrow("save fallito sul server")

    // finally{} still decrements...
    expect(api.getPendingWriteCount()).toBe(0)
    // ...but a failed write is not "our write" — the echo window never opened.
    expect(api.getMillisSinceLastLocalWrite()).toBe(Number.POSITIVE_INFINITY)
  })

  it("nests without underflow: 0 -> 2 -> 0", async () => {
    const api = await loadFreshApi()

    let resolveInner!: (value: string) => void
    const inner = new Promise<string>((res) => {
      resolveInner = res
    })

    // Inner runTracked bumps the count to 1, the outer wraps its returned
    // promise and bumps it to 2.
    const tracked = api.runTracked(api.runTracked(inner))
    expect(api.getPendingWriteCount()).toBe(2)

    resolveInner("nested")
    await expect(tracked).resolves.toBe("nested")
    expect(api.getPendingWriteCount()).toBe(0)
  })

  it("floors its own decrement — an unbalanced endPendingWrite cannot drive the count negative", async () => {
    const api = await loadFreshApi()

    let resolve!: (value: string) => void
    const operation = new Promise<string>((res) => {
      resolve = res
    })

    // The real hazard the trackWrite floor guards: the useDebouncedSave
    // begin/end path interleaving with an in-flight runTracked over the SHARED
    // counter. Drain the count to 0 with endPendingWrite while the tracked op is
    // still in flight, so runTracked's own `finally` hits its Math.max(0, ...)
    // clamp instead of a normal decrement — without the floor the count would
    // reach -1 and useRealtimeBoardSync would stop deferring reloads.
    api.beginPendingWrite() // 1
    const tracked = api.runTracked(operation) // 2 (in flight)
    expect(api.getPendingWriteCount()).toBe(2)

    api.endPendingWrite() // 1
    api.endPendingWrite() // 0
    expect(api.getPendingWriteCount()).toBe(0)

    resolve("ok")
    await tracked
    expect(api.getPendingWriteCount()).toBe(0)
  })
})
