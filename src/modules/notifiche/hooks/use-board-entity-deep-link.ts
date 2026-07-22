import * as React from "react"

import {
  clearBoardEntityIdFromSearch,
  readBoardEntityIdFromSearch,
  subscribeBoardEntityDeepLink,
  type BoardEntityType,
} from "../lib/entity-route-map"

type UseBoardEntityDeepLinkOptions = {
  entityType: BoardEntityType
  /**
   * Attempt to open the sheet for `entityId`.
   * - return `true` when the id is consumed (opened or definitively not found)
   * - return `false` when the board is not ready yet (still loading / deferred)
   */
  onOpen: (entityId: string) => boolean
  /**
   * Changes when board data may newly resolve a pending deep link (e.g. loading
   * finished, columns updated after a deferred stage load). Passive search-param
   * consumption re-runs on each change until `onOpen` returns true.
   */
  retryKey: string | number | boolean
}

/**
 * Opens a board detail sheet from `?<entityType>=<id>` (and from the explicit
 * `notifyBoardEntityDeepLink` event used when `pushState` does not fire popstate).
 *
 * Guaranteed once-per-url-arrival for passive search-param reads; event-driven
 * opens always re-attempt so clicking the same notification after closing the
 * sheet still works.
 */
export function useBoardEntityDeepLink({
  entityType,
  onOpen,
  retryKey,
}: UseBoardEntityDeepLinkOptions): void {
  const onOpenRef = React.useRef(onOpen)
  const consumedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    onOpenRef.current = onOpen
  })

  const tryOpen = React.useCallback(
    (entityId: string | null, options?: { force?: boolean }) => {
      if (!entityId) return
      if (!options?.force && consumedRef.current === entityId) return
      const done = onOpenRef.current(entityId)
      if (!done) return
      consumedRef.current = entityId
      clearBoardEntityIdFromSearch(entityType)
    },
    [entityType],
  )

  React.useEffect(() => {
    tryOpen(readBoardEntityIdFromSearch(entityType))
  }, [entityType, retryKey, tryOpen])

  React.useEffect(() => {
    return subscribeBoardEntityDeepLink(entityType, (entityId) => {
      tryOpen(entityId, { force: true })
    })
  }, [entityType, tryOpen])
}
