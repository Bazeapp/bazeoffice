import * as React from "react"

import { getMillisSinceLastLocalWrite, getPendingWriteCount } from "@/lib/write-tracking"
import { useRealtimeRows } from "@/hooks/use-realtime-rows"

const DEFAULT_DEBOUNCE_MS = 600
const LOCAL_WRITE_ECHO_WINDOW_MS = 2500

export type UseRealtimeBoardSyncOptions = {
  /** Public tables to subscribe to for this board. */
  tables: string[]
  /** Silent board refresh (no spinner, keep current data on error). */
  reload: () => Promise<void> | void
  /**
   * Optional: refresh the currently-open detail record. Needed for boards
   * whose detail panel carries fields not present in the board fetch, so the
   * board reload doesn't blank them. Should be a no-op when nothing is open.
   */
  reloadOpenDetail?: () => Promise<void> | void
  debounceMs?: number
}

/**
 * Shared realtime orchestration for board-style pages: subscribes to the given
 * tables and, on any remote change, debounces a silent reload (deferred while
 * the user has local writes in flight so their optimistic state is never
 * clobbered) and re-enriches the open detail record.
 *
 * Each board provides only its tables and reload closures; all the timing
 * and deferral logic lives here.
 */
export function useRealtimeBoardSync({
  tables,
  reload,
  reloadOpenDetail,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseRealtimeBoardSyncOptions) {
  const reloadRef = React.useRef(reload)
  const reloadOpenDetailRef = React.useRef(reloadOpenDetail)
  React.useEffect(() => {
    reloadRef.current = reload
    reloadOpenDetailRef.current = reloadOpenDetail
  })

  const reloadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    }
  }, [])

  const handleRealtimeEvent = React.useCallback(
    () => {
      const scheduleReload = () => {
        if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
        reloadTimerRef.current = setTimeout(() => {
          // Defer while the user has writes in flight so we never clobber
          // their own optimistic state mid-save. Also skip echo reloads that
          // arrive right after a local write — they are the realtime feedback
          // of our own optimistic update and reloading would be wasted work.
          if (getPendingWriteCount() > 0) {
            scheduleReload()
            return
          }
          if (getMillisSinceLastLocalWrite() < LOCAL_WRITE_ECHO_WINDOW_MS) {
            reloadTimerRef.current = null
            return
          }
          reloadTimerRef.current = null
          void Promise.resolve(reloadRef.current()).then(() => {
            const reloadDetail = reloadOpenDetailRef.current
            if (reloadDetail) void reloadDetail()
          })
        }, debounceMs)
      }
      scheduleReload()
    },
    [debounceMs]
  )

  useRealtimeRows(tables, handleRealtimeEvent)
}
