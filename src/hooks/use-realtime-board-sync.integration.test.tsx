/**
 * Integration tests for `useRealtimeBoardSync`.
 *
 * Focus: the LOCAL_WRITE_ECHO_WINDOW_MS suppression and pending-write
 * deferral logic that lives inside the debounced reload callback. The
 * realtime subscription and the anagrafiche-api timing getters are
 * mocked so we drive both the trigger and the suppression state from
 * the test.
 */
import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let realtimeHandler: (() => void) | null = null

vi.mock("@/hooks/use-realtime-rows", () => ({
  useRealtimeRows: (_tables: string[], handler: () => void) => {
    realtimeHandler = handler
  },
}))

const apiMocks = {
  millisSinceLastLocalWrite: Number.POSITIVE_INFINITY,
  pendingWriteCount: 0,
}

vi.mock("@/lib/write-tracking", () => ({
  getMillisSinceLastLocalWrite: () => apiMocks.millisSinceLastLocalWrite,
  getPendingWriteCount: () => apiMocks.pendingWriteCount,
}))

import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

beforeEach(() => {
  // Only fake setTimeout/clearTimeout. The hook only schedules a setTimeout,
  // so we don't need to patch microtask/scheduler primitives, and leaving
  // them on real timers avoids wedging happy-dom + React's unmount path
  // during teardown.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  realtimeHandler = null
  apiMocks.millisSinceLastLocalWrite = Number.POSITIVE_INFINITY
  apiMocks.pendingWriteCount = 0
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

function trigger() {
  if (!realtimeHandler) throw new Error("realtime handler not registered")
  realtimeHandler()
}

describe("useRealtimeBoardSync — echo suppression and deferral", () => {
  it("reloads once after the debounce when there is no recent local write", async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    renderHook(() =>
      useRealtimeBoardSync({ tables: ["chiusure_contratti"], reload })
    )

    trigger()
    expect(reload).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(600)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("suppresses reload when a local write happened inside the echo window", async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    apiMocks.millisSinceLastLocalWrite = 1000 // < 2500ms window
    renderHook(() =>
      useRealtimeBoardSync({ tables: ["chiusure_contratti"], reload })
    )

    trigger()
    await vi.advanceTimersByTimeAsync(600)
    expect(reload).not.toHaveBeenCalled()
  })

  it("defers reload while writes are pending and fires once they drain", async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    apiMocks.pendingWriteCount = 1
    renderHook(() =>
      useRealtimeBoardSync({ tables: ["chiusure_contratti"], reload })
    )

    trigger()
    await vi.advanceTimersByTimeAsync(600)
    expect(reload).not.toHaveBeenCalled()

    // Writes drain → next debounce tick should fire the reload.
    apiMocks.pendingWriteCount = 0
    await vi.advanceTimersByTimeAsync(600)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("debounces a burst of realtime events into a single reload", async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    renderHook(() =>
      useRealtimeBoardSync({ tables: ["chiusure_contratti"], reload })
    )

    for (let i = 0; i < 5; i++) {
      trigger()
      await vi.advanceTimersByTimeAsync(100)
    }
    // Total elapsed since last trigger so far: 100ms. Push past 600ms.
    await vi.advanceTimersByTimeAsync(600)

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("calls reloadOpenDetail after reload resolves", async () => {
    const order: string[] = []
    const reload = vi.fn().mockImplementation(() => {
      order.push("reload")
      return Promise.resolve()
    })
    const reloadOpenDetail = vi.fn().mockImplementation(() => {
      order.push("reloadOpenDetail")
      return Promise.resolve()
    })
    renderHook(() =>
      useRealtimeBoardSync({
        tables: ["chiusure_contratti"],
        reload,
        reloadOpenDetail,
      })
    )

    trigger()
    await vi.advanceTimersByTimeAsync(600)
    // Flush the .then() microtask that calls reloadOpenDetail.
    await vi.runAllTimersAsync()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(reloadOpenDetail).toHaveBeenCalledTimes(1)
    expect(order).toEqual(["reload", "reloadOpenDetail"])
  })
})
