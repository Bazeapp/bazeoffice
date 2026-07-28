import * as React from "react"

import { getMillisSinceLastLocalWrite, getPendingWriteCount } from "@/lib/write-tracking"
import {
  useRealtimeRows,
  type RealtimeRowEvent,
} from "@/hooks/use-realtime-rows"

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
  /**
   * When set, a realtime event only schedules a board reload if this returns
   * true. Events in a debounce burst are OR'd — any relevant event wins.
   * Default: reload on every event.
   */
  shouldReloadBoard?: (event: RealtimeRowEvent) => boolean
  /**
   * When set, a realtime event only schedules a detail reload if this returns
   * true. Independent of the board filter so e.g. an unrelated INSERT can
   * refresh the list without re-fetching the open scheda. Default: follow
   * board reload (detail runs whenever the board does).
   */
  shouldReloadOpenDetail?: (event: RealtimeRowEvent) => boolean
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
  shouldReloadBoard,
  shouldReloadOpenDetail,
}: UseRealtimeBoardSyncOptions) {
  const reloadRef = React.useRef(reload)
  const reloadOpenDetailRef = React.useRef(reloadOpenDetail)
  const shouldReloadBoardRef = React.useRef(shouldReloadBoard)
  const shouldReloadOpenDetailRef = React.useRef(shouldReloadOpenDetail)
  React.useEffect(() => {
    reloadRef.current = reload
    reloadOpenDetailRef.current = reloadOpenDetail
    shouldReloadBoardRef.current = shouldReloadBoard
    shouldReloadOpenDetailRef.current = shouldReloadOpenDetail
  })

  const reloadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingBoardReloadRef = React.useRef(false)
  const pendingDetailReloadRef = React.useRef(false)
  React.useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    }
  }, [])

  const handleRealtimeEvent = React.useCallback(
    (event: RealtimeRowEvent) => {
      const boardRelevant = shouldReloadBoardRef.current
        ? shouldReloadBoardRef.current(event)
        : true
      const detailRelevant = shouldReloadOpenDetailRef.current
        ? shouldReloadOpenDetailRef.current(event)
        : boardRelevant

      if (!boardRelevant && !detailRelevant) return

      if (boardRelevant) pendingBoardReloadRef.current = true
      if (detailRelevant) pendingDetailReloadRef.current = true

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
            pendingBoardReloadRef.current = false
            pendingDetailReloadRef.current = false
            return
          }
          reloadTimerRef.current = null
          const runBoard = pendingBoardReloadRef.current
          const runDetail = pendingDetailReloadRef.current
          pendingBoardReloadRef.current = false
          pendingDetailReloadRef.current = false

          const afterBoard = () => {
            if (!runDetail) return
            const reloadDetail = reloadOpenDetailRef.current
            if (reloadDetail) void reloadDetail()
          }

          if (runBoard) {
            void Promise.resolve(reloadRef.current()).then(afterBoard)
          } else {
            afterBoard()
          }
        }, debounceMs)
      }
      scheduleReload()
    },
    [debounceMs]
  )

  useRealtimeRows(tables, handleRealtimeEvent)
}
