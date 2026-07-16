import * as React from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

/**
 * Shared cache helpers for Pattern-A board hooks.
 *
 * `queryKey` is the exact key for `setQueryData` / `getQueryData`.
 * Pass `invalidateRoot` (board name / first query-key segment) so realtime
 * invalidation prefix-matches every cached filter/page/tab/process variant —
 * matching pre-refactor board-wide refresh. Without it, invalidation uses the
 * exact `queryKey` only.
 */
export function useBoardQueryCache<TData>(
  queryKey: QueryKey,
  invalidateRoot?: string,
) {
  const queryClient = useQueryClient()

  const invalidateKey = React.useMemo(
    () => (invalidateRoot != null ? ([invalidateRoot] as QueryKey) : queryKey),
    [invalidateRoot, queryKey],
  )

  const setBoardData = React.useCallback(
    (updater: (previous: TData | undefined) => TData | undefined) => {
      queryClient.setQueryData<TData>(queryKey, (previous) => updater(previous))
    },
    [queryClient, queryKey],
  )

  const invalidateBoard = React.useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: invalidateKey })
  }, [queryClient, invalidateKey])

  return { setBoardData, invalidateBoard }
}
