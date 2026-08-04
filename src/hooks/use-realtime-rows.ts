import * as React from "react"

import { supabase } from "@/lib/supabase-client"

export type RealtimeRowEvent = {
  table: string
  eventType: "INSERT" | "UPDATE" | "DELETE"
  newRow: Record<string, unknown> | null
  oldRow: Record<string, unknown> | null
}

/**
 * Subscribes to Postgres changes for the given public tables and invokes
 * `onEvent` whenever a row changes. The handler is kept in a ref so callers
 * can pass an inline closure without re-subscribing on every render.
 *
 * Channel topics include a per-hook instance id. supabase-js returns an existing
 * channel for a shared topic and `removeChannel` tears that instance down for
 * every subscriber — so two hooks on the same tables (e.g. notifiche badge +
 * flyout) must not share a topic, or closing one kills realtime for the other.
 */
export function useRealtimeRows(
  tables: string[],
  onEvent: (event: RealtimeRowEvent) => void,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true
  const handlerRef = React.useRef(onEvent)
  const instanceId = React.useId()

  React.useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  const tablesKey = tables.join(",")

  React.useEffect(() => {
    if (!enabled || tables.length === 0) return

    const channel = supabase.channel(`realtime-rows:${tablesKey}:${instanceId}`)

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: {
          eventType: RealtimeRowEvent["eventType"]
          new: Record<string, unknown> | null
          old: Record<string, unknown> | null
        }) => {
          handlerRef.current({
            table,
            eventType: payload.eventType,
            newRow: payload.new ?? null,
            oldRow: payload.old ?? null,
          })
        }
      )
    }

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, enabled, instanceId])
}
