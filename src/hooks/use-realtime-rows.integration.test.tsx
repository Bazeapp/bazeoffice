/**
 * Characterization tests for `useRealtimeRows` — U4 / Target A2.
 *
 * This is the realtime subscription primitive every board hook stands on, yet
 * it is mocked away in all consumer tests (e.g. use-realtime-board-sync mocks
 * it wholesale), so its real subscribe / map / unsubscribe / ref-stability /
 * enabled-guard logic has never been asserted.
 *
 * We mock at the module boundary (`@/lib/supabase-client`) with a fake channel
 * that records each `.on("postgres_changes", filter, cb)` registration; tests
 * capture the registered callback and invoke it to simulate a CDC event. The
 * mock mirrors supabase-js: `channel(topic)` returns an existing channel for the
 * same topic, and `removeChannel` tears that shared instance down.
 */
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("@/lib/supabase-client", () => {
  type Channel = { name: string; on: Mock; subscribe: Mock }
  const liveChannels = new Map<string, Channel>()

  const makeChannel = (name: string): Channel => {
    const channel: Channel = {
      name,
      on: vi.fn(() => channel),
      subscribe: vi.fn(() => channel),
    }
    return channel
  }

  return {
    supabase: {
      channel: vi.fn((name: string) => {
        const existing = liveChannels.get(name)
        if (existing) return existing
        const channel = makeChannel(name)
        liveChannels.set(name, channel)
        return channel
      }),
      removeChannel: vi.fn((channel: Channel) => {
        liveChannels.delete(channel.name)
      }),
      _liveChannels: liveChannels,
    },
  }
})

import { supabase } from "@/lib/supabase-client"
import { useRealtimeRows, type RealtimeRowEvent } from "@/hooks/use-realtime-rows"

type MockChannel = { name: string; on: Mock; subscribe: Mock }

const channelMock = () => vi.mocked(supabase.channel) as unknown as Mock
const removeChannelMock = () => vi.mocked(supabase.removeChannel) as unknown as Mock
const liveChannels = () =>
  (supabase as unknown as { _liveChannels: Map<string, MockChannel> })._liveChannels

/** Distinct channels returned so far, in creation order. */
function createdChannels(): MockChannel[] {
  const seen = new Set<MockChannel>()
  const channels: MockChannel[] = []
  for (const result of channelMock().mock.results) {
    if (result.type !== "return") continue
    const channel = result.value as MockChannel
    if (seen.has(channel)) continue
    seen.add(channel)
    channels.push(channel)
  }
  return channels
}

/** The postgres_changes callback registered for `table` on the given channel. */
function handlerFor(channel: MockChannel, table: string): (payload: unknown) => void {
  const call = channel.on.mock.calls.find(
    (c) => (c[1] as { table?: string })?.table === table,
  )
  if (!call) throw new Error(`no handler registered for table ${table}`)
  // .on(event, filter, callback) — the callback is the 3rd arg.
  const [, , callback] = call
  return callback as (payload: unknown) => void
}

beforeEach(() => {
  liveChannels().clear()
  vi.clearAllMocks()
})

describe("useRealtimeRows — subscription", () => {
  it("creates one channel, registers a per-table handler, and subscribes", () => {
    renderHook(() => useRealtimeRows(["famiglie", "lavoratori"], vi.fn()))

    expect(channelMock()).toHaveBeenCalledTimes(1)
    expect(channelMock()).toHaveBeenCalledWith(
      expect.stringMatching(/^realtime-rows:famiglie,lavoratori:/),
    )

    const channel = createdChannels()[0]
    expect(channel.on).toHaveBeenCalledTimes(2)
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "famiglie" },
      expect.any(Function),
    )
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "lavoratori" },
      expect.any(Function),
    )
    expect(channel.subscribe).toHaveBeenCalledTimes(1)
  })

  it("subscribes only when enabled AND the table list is non-empty (two-way guard)", () => {
    const { rerender } = renderHook(
      ({ tables, enabled }: { tables: string[]; enabled: boolean }) =>
        useRealtimeRows(tables, vi.fn(), { enabled }),
      { initialProps: { tables: ["famiglie"], enabled: false } },
    )
    // Disabled with a populated list → no channel.
    expect(channelMock()).not.toHaveBeenCalled()

    // Enabled but empty list → still no channel.
    rerender({ tables: [], enabled: true })
    expect(channelMock()).not.toHaveBeenCalled()

    // Re-enabled with a populated list → subscribes. (Removing the guard would
    // already have failed the first assertion by subscribing while disabled.)
    rerender({ tables: ["famiglie"], enabled: true })
    expect(channelMock()).toHaveBeenCalledTimes(1)
    expect(createdChannels()[0].subscribe).toHaveBeenCalledTimes(1)
  })
})

describe("useRealtimeRows — event mapping", () => {
  it("maps a CDC payload into a RealtimeRowEvent and invokes onEvent", () => {
    const onEvent = vi.fn()
    renderHook(() => useRealtimeRows(["famiglie"], onEvent))

    handlerFor(createdChannels()[0], "famiglie")({
      eventType: "UPDATE",
      new: { id: "1", nome: "Rossi" },
      old: { id: "1", nome: "Ross" },
    })

    expect(onEvent).toHaveBeenCalledWith<[RealtimeRowEvent]>({
      table: "famiglie",
      eventType: "UPDATE",
      newRow: { id: "1", nome: "Rossi" },
      oldRow: { id: "1", nome: "Ross" },
    })
  })

  it("coerces ABSENT new/old payload rows to null", () => {
    const onEvent = vi.fn()
    renderHook(() => useRealtimeRows(["famiglie"], onEvent))
    const handler = handlerFor(createdChannels()[0], "famiglie")

    // A payload that OMITS new/old (undefined) is what `payload.new ?? null`
    // actually guards. Firing `{ new: null }` would pass even with the coercion
    // removed (null ?? null === null), so the input must use absent keys.
    handler({ eventType: "DELETE" })
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ newRow: null, oldRow: null }),
    )

    // Present new, absent old → only old is coerced.
    handler({ eventType: "INSERT", new: { id: "9" } })
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ newRow: { id: "9" }, oldRow: null }),
    )
  })
})

describe("useRealtimeRows — lifecycle", () => {
  it("removes the channel on unmount (no leaked subscription)", () => {
    const { unmount } = renderHook(() => useRealtimeRows(["famiglie"], vi.fn()))
    const channel = createdChannels()[0]

    expect(removeChannelMock()).not.toHaveBeenCalled()
    unmount()
    expect(removeChannelMock()).toHaveBeenCalledTimes(1)
    expect(removeChannelMock()).toHaveBeenCalledWith(channel)
  })

  it("keeps the handler in a ref — a new onEvent closure does NOT re-subscribe", () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ onEvent }: { onEvent: (e: RealtimeRowEvent) => void }) =>
        useRealtimeRows(["famiglie"], onEvent),
      { initialProps: { onEvent: first } },
    )

    // New closure, same tables → no re-subscribe, no teardown.
    rerender({ onEvent: second })
    expect(channelMock()).toHaveBeenCalledTimes(1)
    expect(removeChannelMock()).not.toHaveBeenCalled()

    // The captured callback now routes to the LATEST closure.
    handlerFor(createdChannels()[0], "famiglie")({
      eventType: "INSERT",
      new: { id: "9" },
      old: null,
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it("re-subscribes when the table set changes (old channel removed, new one created)", () => {
    const { rerender } = renderHook(
      ({ tables }: { tables: string[] }) => useRealtimeRows(tables, vi.fn()),
      { initialProps: { tables: ["famiglie"] } },
    )
    const firstChannel = createdChannels()[0]

    rerender({ tables: ["lavoratori"] })

    expect(removeChannelMock()).toHaveBeenCalledWith(firstChannel)
    expect(channelMock()).toHaveBeenCalledTimes(2)
    expect(channelMock()).toHaveBeenLastCalledWith(
      expect.stringMatching(/^realtime-rows:lavoratori:/),
    )
  })

  it("isolates concurrent subscribers so one teardown cannot kill another", () => {
    // Mirrors notifiche: badge + flyout both subscribe to the same tables.
    // supabase.channel(topic) returns the existing channel for a shared topic,
    // and removeChannel tears that instance down for every subscriber.
    const onFirst = vi.fn()
    const onSecond = vi.fn()
    const first = renderHook(() => useRealtimeRows(["notifiche"], onFirst))
    const second = renderHook(() => useRealtimeRows(["notifiche"], onSecond))

    const [ch1, ch2] = createdChannels()
    expect(ch1).toBeDefined()
    expect(ch2).toBeDefined()
    expect(ch1).not.toBe(ch2)
    expect(ch1!.name).not.toBe(ch2!.name)

    second.unmount()
    expect(removeChannelMock()).toHaveBeenCalledTimes(1)
    expect(removeChannelMock()).toHaveBeenCalledWith(ch2)
    expect(removeChannelMock()).not.toHaveBeenCalledWith(ch1)
    expect(liveChannels().has(ch1!.name)).toBe(true)

    handlerFor(ch1!, "notifiche")({
      eventType: "INSERT",
      new: { id: "n1" },
      old: null,
    })
    expect(onFirst).toHaveBeenCalledTimes(1)
    expect(onSecond).not.toHaveBeenCalled()

    first.unmount()
  })
})
